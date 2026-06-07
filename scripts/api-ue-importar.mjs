#!/usr/bin/env node
/**
 * Importador de precios de la API de la Comisión Europea (Agrifood)
 * ──────────────────────────────────────────────────────────────────
 * Endpoint: GET https://api.tech.ec.europa.eu/agrifood/api/pigmeat/prices
 *
 * Uso:
 *   node scripts/api-ue-importar.mjs                          # últimas 8 semanas
 *   node scripts/api-ue-importar.mjs --historico              # desde 2000 hasta hoy
 *   node scripts/api-ue-importar.mjs --desde 2023-01-01       # desde fecha concreta
 *   node scripts/api-ue-importar.mjs --simulacion             # sin escribir archivos
 *   node scripts/api-ue-importar.mjs --forzar                 # sobreescribir existentes
 *
 * La API devuelve precios en €/100 kg canal. Este script los convierte
 * a €/kg canal (÷100) y los guarda como campos blanco_selecto/normal/graso.
 *
 * Mapeo de clases UE → esquema lonjaporcino:
 *   S (Superior)  → blanco_selecto
 *   E (Excellent) → blanco_normal
 *   R (Regular)   → blanco_graso
 *   Piglet        → lechon_ue (referencia, no incluido en esquema aún)
 *
 * Nota: La API NO tiene datos de ibérico, cochinillos ni lechón nacional
 * con el mismo desglose — esos campos quedan vacíos para entrada manual.
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SESIONES_DIR = join(ROOT, 'src', 'content', 'sesiones');

const API_BASE = 'https://api.tech.ec.europa.eu/agrifood/api/pigmeat/prices';
const PAIS = 'ES';
const CLASES = 'S,E,R,Piglet';

// ── Argumentos de línea de comandos ─────────────────────────────────────────
const args = process.argv.slice(2);
const historico   = args.includes('--historico');
const simulacion  = args.includes('--simulacion') || args.includes('--dry-run');
const forzar      = args.includes('--forzar') || args.includes('--force');

let desdeArg = null;
const desdeIdx = args.indexOf('--desde');
if (desdeIdx >= 0 && args[desdeIdx + 1]) {
  desdeArg = args[desdeIdx + 1];
}

// ── Rango de fechas ──────────────────────────────────────────────────────────
function formatFechaAPI(fecha) {
  const [y, m, d] = fecha.split('-');
  return `${d}/${m}/${y}`;
}

function formatFechaISO(ddmmyyyy) {
  const [d, m, y] = ddmmyyyy.split('/');
  return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
}

const hoy = new Date();
const haceDias = n => {
  const d = new Date(hoy);
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
};

let beginDate, endDate;
if (historico) {
  beginDate = '01/01/2000';
  endDate   = formatFechaAPI(hoy.toISOString().split('T')[0]);
} else if (desdeArg) {
  beginDate = formatFechaAPI(desdeArg);
  endDate   = formatFechaAPI(hoy.toISOString().split('T')[0]);
} else {
  // Últimas 8 semanas por defecto
  beginDate = formatFechaAPI(haceDias(56));
  endDate   = formatFechaAPI(hoy.toISOString().split('T')[0]);
}

console.log(`\nAPI Comisión Europea — Precios Porcino`);
console.log(`Rango: ${beginDate} → ${endDate}`);
console.log(`Modo: ${historico ? 'histórico completo' : desdeArg ? `desde ${desdeArg}` : 'últimas 8 semanas'}${simulacion ? ' [SIMULACIÓN]' : ''}\n`);

// ── Descarga de datos ────────────────────────────────────────────────────────
async function descargarPrecios() {
  const params = new URLSearchParams({
    memberStateCodes: PAIS,
    pigClasses: CLASES,
    beginDate,
    endDate,
  });

  const url = `${API_BASE}?${params}`;
  console.log(`Descargando: ${url}`);

  const resp = await fetch(url, {
    headers: {
      'User-Agent': 'lonjaporcino.es/1.0 (datos publicos CE)',
      'Accept': 'application/json',
    }
  });

  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}: ${await resp.text()}`);
  }

  const datos = await resp.json();
  console.log(`Recibidos: ${datos.length} registros\n`);
  return datos;
}

// ── Procesado de datos ───────────────────────────────────────────────────────

function limpiarPrecio(str) {
  // "€208.88" → 2.0888 (dividido entre 100, con 4 decimales → después redondeamos a 4)
  if (!str) return null;
  const n = parseFloat(str.replace(/[^0-9.]/g, ''));
  if (isNaN(n)) return null;
  return Math.round((n / 100) * 10000) / 10000;  // €/kg canal con 4 decimales
}

function redondear(n) {
  if (n === null) return '';
  return String(Math.round(n * 1000) / 1000);  // 3 decimales como string
}

function agruparPorSemana(datos) {
  const semanas = {};
  for (const item of datos) {
    // Usamos la fecha de FIN de semana como clave (el jueves de Mercolleida)
    const fechaFin = formatFechaISO(item.endDate);
    if (!semanas[fechaFin]) {
      semanas[fechaFin] = {
        fechaFin,
        fechaInicio: formatFechaISO(item.beginDate),
        weekNumber: item.weekNumber,
        S: null, E: null, R: null, Piglet: null,
      };
    }
    const precio = limpiarPrecio(item.price);
    semanas[fechaFin][item.pigClass] = precio;
  }
  return semanas;
}

// ── Generación de YAML ───────────────────────────────────────────────────────

function generarYAML(fechaSesion, semana, boletin) {
  const s = redondear(semana.S);
  const e = redondear(semana.E);
  const r = redondear(semana.R);

  const campos = [
    ['fecha',                  fechaSesion],
    ['fuente',                 'API Comision Europea (CE/UE)'],
    ['notas',                  `Semana ${semana.weekNumber}. Precio CE en EUR/100kg canal convertido. PENDIENTE: lechones, iberico, cochinillos, desvieje.`],
    ['blanco_selecto_min',     s],
    ['blanco_selecto_max',     s],
    ['blanco_normal_min',      e],
    ['blanco_normal_max',      e],
    ['blanco_graso_min',       r],
    ['blanco_graso_max',       r],
    ['lechon_nacional_min',    ''],
    ['lechon_nacional_max',    ''],
    ['lechon_importacion_min', ''],
    ['lechon_importacion_max', ''],
    ['cochinillo_marca_min',   ''],
    ['cochinillo_marca_max',   ''],
    ['cochinillo_estandar_min',''],
    ['cochinillo_estandar_max',''],
    ['bellota_100_min',        ''],
    ['bellota_100_max',        ''],
    ['bellota_75_min',         ''],
    ['bellota_75_max',         ''],
    ['bellota_50_min',         ''],
    ['bellota_50_max',         ''],
    ['cebo_campo_min',         ''],
    ['cebo_campo_max',         ''],
    ['cebo_min',               ''],
    ['cebo_max',               ''],
    ['lechones_ibericos_min',  ''],
    ['lechones_ibericos_max',  ''],
    ['primales_ibericos_min',  ''],
    ['primales_ibericos_max',  ''],
    ['cerdas_unica_min',       ''],
    ['cerdas_unica_max',       ''],
    ['cerdas_extra_min',       ''],
    ['cerdas_extra_max',       ''],
    ['cerdas_desecho_min',     ''],
    ['cerdas_desecho_max',     ''],
    ['verracos_min',           ''],
    ['verracos_max',           ''],
  ];

  // fecha siempre con comillas simples: YAML interpreta 2000-01-09 como Date sin ellas
  const SIEMPRE_QUOTED = new Set(['fecha']);
  const TEXTO_LIBRE = new Set(['fuente', 'notas']);
  return campos.map(([campo, valor]) => {
    const v = String(valor ?? '');
    if (SIEMPRE_QUOTED.has(campo)) {
      return `${campo}: '${v}'`;
    }
    if (TEXTO_LIBRE.has(campo)) {
      if (!v) return `${campo}: ''`;
      if (/[:#\[\]{}&*!|>'"%@`]/.test(v)) return `${campo}: ${JSON.stringify(v)}`;
      return `${campo}: ${v}`;
    }
    return `${campo}: '${v}'`;
  }).join('\n') + '\n';
}

// ── Main ─────────────────────────────────────────────────────────────────────

const datos = await descargarPrecios();
const semanas = agruparPorSemana(datos);
const fechasSemanas = Object.keys(semanas).sort();

if (!existsSync(SESIONES_DIR)) {
  if (!simulacion) mkdirSync(SESIONES_DIR, { recursive: true });
}

let creadas = 0, omitidas = 0, actualizadas = 0;

for (const fechaSesion of fechasSemanas) {
  const semana = semanas[fechaSesion];
  const yamlPath = join(SESIONES_DIR, `${fechaSesion}.yaml`);
  const existe = existsSync(yamlPath);

  if (existe && !forzar) {
    omitidas++;
    if (fechasSemanas.length < 20) {
      console.log(`  ─  ${fechaSesion}  (ya existe, omitida)`);
    }
    continue;
  }

  const yaml = generarYAML(fechaSesion, semana);

  if (simulacion) {
    console.log(`  ✓  ${fechaSesion}  (S:${redondear(semana.S)} E:${redondear(semana.E)} R:${redondear(semana.R)}) ${existe ? '[actualizaría]' : '[crearía]'}`);
  } else {
    writeFileSync(yamlPath, yaml, 'utf-8');
    if (existe) {
      actualizadas++;
      if (fechasSemanas.length < 20) console.log(`  ↻  ${fechaSesion}  (actualizada)`);
    } else {
      creadas++;
      if (fechasSemanas.length < 20) console.log(`  ✓  ${fechaSesion}  (creada)`);
    }
  }
}

// Resumen
if (fechasSemanas.length >= 20 && !simulacion) {
  console.log(`  ... ${creadas} archivos creados, ${omitidas} omitidos`);
}

console.log(`
─────────────────────────────────────
${simulacion ? '[SIMULACIÓN — no se ha escrito nada]\n' : ''}Semanas procesadas: ${fechasSemanas.length}
  Creadas:      ${creadas}
  Actualizadas: ${actualizadas}
  Omitidas:     ${omitidas}
  Rango:        ${fechasSemanas[0] ?? 'ninguna'} → ${fechasSemanas[fechasSemanas.length - 1] ?? 'ninguna'}
─────────────────────────────────────
`);

if (!simulacion && (creadas + actualizadas) > 0) {
  console.log('Para publicar:');
  console.log('  git add src/content/sesiones/');
  console.log('  git commit -m "datos: importar precios API CE"');
  console.log('  git push\n');
}
