#!/usr/bin/env node
/**
 * Importador de precios históricos del porcino
 * ─────────────────────────────────────────────
 * Uso:
 *   node scripts/importar-csv.mjs datos.csv
 *   node scripts/importar-csv.mjs datos.csv --forzar      # sobreescribe YAMLs existentes
 *   node scripts/importar-csv.mjs datos.csv --simulacion  # muestra lo que haría sin escribir
 *
 * Formato del CSV (ver scripts/plantilla-precios.csv):
 *   - Primera fila: cabeceras (nombres de campo)
 *   - Columna "fecha" obligatoria, formato YYYY-MM-DD
 *   - El resto de columnas son opcionales; las que falten quedan en blanco
 *   - Separador: coma (,) o punto y coma (;) — autodetectado
 *   - Decimales: punto (.) o coma (,) — si el separador es ; los decimales deben ser .
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SESIONES_DIR = join(ROOT, 'src', 'content', 'sesiones');

// ── Campos válidos (orden del YAML de salida) ────────────────────────────────
const CAMPOS = [
  'fecha',
  'fuente',
  'notas',
  // Blanco
  'blanco_selecto_min', 'blanco_selecto_max',
  'blanco_normal_min',  'blanco_normal_max',
  'blanco_graso_min',   'blanco_graso_max',
  // Lechones
  'lechon_nacional_min',    'lechon_nacional_max',
  'lechon_importacion_min', 'lechon_importacion_max',
  'cochinillo_marca_min',   'cochinillo_marca_max',
  'cochinillo_estandar_min','cochinillo_estandar_max',
  // Ibérico
  'bellota_100_min', 'bellota_100_max',
  'bellota_75_min',  'bellota_75_max',
  'bellota_50_min',  'bellota_50_max',
  'cebo_campo_min',  'cebo_campo_max',
  'cebo_min',        'cebo_max',
  'lechones_ibericos_min', 'lechones_ibericos_max',
  'primales_ibericos_min', 'primales_ibericos_max',
  // Desvieje
  'cerdas_unica_min',   'cerdas_unica_max',
  'cerdas_extra_min',   'cerdas_extra_max',
  'cerdas_desecho_min', 'cerdas_desecho_max',
  'verracos_min',       'verracos_max',
];

// Aliases: nombres alternativos que el CSV puede usar → nombre interno
const ALIASES = {
  // Variantes con tildes / espacios
  'fecha_sesion':         'fecha',
  'semana':               'fecha',
  'date':                 'fecha',
  // Blanco
  'cerdo_selecto_min':    'blanco_selecto_min',
  'cerdo_selecto_max':    'blanco_selecto_max',
  'cerdo_normal_min':     'blanco_normal_min',
  'cerdo_normal_max':     'blanco_normal_max',
  'cerdo_graso_min':      'blanco_graso_min',
  'cerdo_graso_max':      'blanco_graso_max',
  // Lechones — algunas lonjas usan "piglet"
  'lechon_nac_min':       'lechon_nacional_min',
  'lechon_nac_max':       'lechon_nacional_max',
  'lechon_imp_min':       'lechon_importacion_min',
  'lechon_imp_max':       'lechon_importacion_max',
  // Ibérico — variantes sin tilde
  'bellota_100pct_min':   'bellota_100_min',
  'bellota_100pct_max':   'bellota_100_max',
  'bellota_75pct_min':    'bellota_75_min',
  'bellota_75pct_max':    'bellota_75_max',
  'bellota_50pct_min':    'bellota_50_min',
  'bellota_50pct_max':    'bellota_50_max',
  'cebo_campo_ib_min':    'cebo_campo_min',
  'cebo_campo_ib_max':    'cebo_campo_max',
  'cebo_ib_min':          'cebo_min',
  'cebo_ib_max':          'cebo_max',
  // Desvieje
  'cerdas_1a_min':        'cerdas_unica_min',
  'cerdas_1a_max':        'cerdas_unica_max',
};

// ── Utilidades de parseo ─────────────────────────────────────────────────────

function detectarSeparador(primeraLinea) {
  const puntoycoma = (primeraLinea.match(/;/g) || []).length;
  const coma = (primeraLinea.match(/,/g) || []).length;
  return puntoycoma > coma ? ';' : ',';
}

function parsearCSV(contenido, sep) {
  const lineas = contenido
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .filter(l => l.trim() !== '');

  if (lineas.length < 2) throw new Error('El CSV debe tener al menos una cabecera y una fila de datos.');

  const cabecera = lineas[0].split(sep).map(c => c.trim().toLowerCase().replace(/\s+/g, '_'));
  const filas = [];

  for (let i = 1; i < lineas.length; i++) {
    const valores = parsearFila(lineas[i], sep);
    if (valores.length === 0) continue;

    const fila = {};
    cabecera.forEach((col, idx) => {
      fila[col] = (valores[idx] || '').trim();
    });
    filas.push(fila);
  }

  return { cabecera, filas };
}

function parsearFila(linea, sep) {
  // Manejo básico de comillas
  const resultado = [];
  let campo = '';
  let enComillas = false;

  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (c === '"') {
      enComillas = !enComillas;
    } else if (c === sep && !enComillas) {
      resultado.push(campo);
      campo = '';
    } else {
      campo += c;
    }
  }
  resultado.push(campo);
  return resultado;
}

function resolverCampo(colCSV) {
  const limpio = colCSV.toLowerCase().trim().replace(/\s+/g, '_');
  if (CAMPOS.includes(limpio)) return limpio;
  if (ALIASES[limpio]) return ALIASES[limpio];
  return null;
}

function normalizar(valor) {
  if (!valor || valor.trim() === '') return '';
  const trimmed = valor.trim();
  // Convertir comas decimales a puntos (1,88 → 1.88)
  const v = trimmed.replace(/,(\d{1,3})$/, '.$1');
  // Comprobar que el string ENTERO es numérico (no solo un prefijo)
  // parseFloat('2026-05-19') = 2026 pero String(2026) !== '2026-05-19'
  const n = parseFloat(v);
  if (!isNaN(n) && String(n) === v) return v;
  return trimmed;
}

function validarFecha(s) {
  return /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
}

// ── Generación del YAML ──────────────────────────────────────────────────────

function generarYAML(datos) {
  const lineas = [];
  for (const campo of CAMPOS) {
    const valor = datos[campo] ?? '';
    if (campo === 'fecha') {
      lineas.push(`fecha: '${valor}'`);
    } else if (campo === 'fuente' || campo === 'notas') {
      // Texto libre: escapar con comillas si tiene caracteres especiales
      if (!valor) {
        lineas.push(`${campo}: ''`);
      } else if (/[:#\[\]{}&*!|>'"%@`]/.test(valor) || valor.includes('\n')) {
        lineas.push(`${campo}: ${JSON.stringify(valor)}`);
      } else {
        lineas.push(`${campo}: ${valor}`);
      }
    } else {
      // Campos numéricos
      lineas.push(`${campo}: '${valor}'`);
    }
  }
  return lineas.join('\n') + '\n';
}

// ── Main ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const archivoCsv = args.find(a => !a.startsWith('--'));
const forzar = args.includes('--forzar') || args.includes('--force');
const simulacion = args.includes('--simulacion') || args.includes('--dry-run');

if (!archivoCsv) {
  console.error(`
Uso: node scripts/importar-csv.mjs <archivo.csv> [opciones]

Opciones:
  --forzar      Sobreescribe YAMLs existentes
  --simulacion  Muestra lo que haría sin escribir nada

Ejemplo:
  node scripts/importar-csv.mjs historico-mercolleida-2020-2025.csv
  node scripts/importar-csv.mjs datos.csv --simulacion
`);
  process.exit(1);
}

if (!existsSync(archivoCsv)) {
  console.error(`Error: No se encuentra el archivo "${archivoCsv}"`);
  process.exit(1);
}

// Asegurar que existe el directorio de sesiones
if (!existsSync(SESIONES_DIR)) {
  if (!simulacion) mkdirSync(SESIONES_DIR, { recursive: true });
  console.log(`Directorio creado: ${SESIONES_DIR}`);
}

const contenido = readFileSync(archivoCsv, 'utf-8');
const sep = detectarSeparador(contenido.split('\n')[0]);
console.log(`Separador detectado: "${sep === ';' ? 'punto y coma' : 'coma'}"`);

const { cabecera, filas } = parsearCSV(contenido, sep);

// Mapear columnas CSV → campos internos
const mapaColumnas = {};
const columnasIgnoradas = [];
for (const col of cabecera) {
  const campo = resolverCampo(col);
  if (campo) {
    mapaColumnas[col] = campo;
  } else {
    columnasIgnoradas.push(col);
  }
}

if (columnasIgnoradas.length > 0) {
  console.log(`\nColumnas ignoradas (no reconocidas): ${columnasIgnoradas.join(', ')}`);
}

console.log(`\nColumnas mapeadas: ${Object.keys(mapaColumnas).length} de ${cabecera.length}`);
console.log(`Filas encontradas: ${filas.length}\n`);

let creadas = 0, omitidas = 0, actualizadas = 0, errores = 0;

for (const fila of filas) {
  // Construir objeto de datos con campos internos
  const datos = {};
  for (const [colCsv, campoInterno] of Object.entries(mapaColumnas)) {
    datos[campoInterno] = normalizar(fila[colCsv]);
  }

  const fecha = datos.fecha;
  if (!fecha) {
    console.warn(`  ⚠  Fila sin fecha, omitida: ${JSON.stringify(fila)}`);
    errores++;
    continue;
  }

  if (!validarFecha(fecha)) {
    console.warn(`  ⚠  Fecha inválida "${fecha}" (debe ser YYYY-MM-DD), omitida`);
    errores++;
    continue;
  }

  const yamlPath = join(SESIONES_DIR, `${fecha}.yaml`);
  const existe = existsSync(yamlPath);

  if (existe && !forzar) {
    console.log(`  ─  ${fecha}  (ya existe, omitida)`);
    omitidas++;
    continue;
  }

  const yaml = generarYAML(datos);

  if (simulacion) {
    console.log(`  ✓  ${fecha}  ${existe ? '[actualizaría]' : '[crearía]'}`);
  } else {
    writeFileSync(yamlPath, yaml, 'utf-8');
    if (existe) {
      console.log(`  ↻  ${fecha}  (actualizada)`);
      actualizadas++;
    } else {
      console.log(`  ✓  ${fecha}  (creada)`);
      creadas++;
    }
  }
}

console.log(`
─────────────────────────────────────
${simulacion ? '[SIMULACIÓN — no se ha escrito nada]\n' : ''}Resumen:
  Creadas:      ${creadas}
  Actualizadas: ${actualizadas}
  Omitidas:     ${omitidas}
  Errores:      ${errores}
  Total filas:  ${filas.length}
─────────────────────────────────────
`);

if (!simulacion && (creadas + actualizadas) > 0) {
  console.log('A continuación haz un deploy para publicar los nuevos datos:');
  console.log('  git add src/content/sesiones/');
  console.log('  git commit -m "datos: importar histórico de precios"');
  console.log('  git push\n');
}
