import type { APIRoute } from 'astro';
import { createReader } from '@keystatic/core/reader';
import keystaticConfig from '../../../keystatic.config';

export const prerender = true;

const toNum = (v: string | null | undefined): number | null => {
  if (!v) return null;
  const n = parseFloat(v);
  return isNaN(n) ? null : n;
};

const avg = (min: number | null, max: number | null): number | null => {
  if (min === null && max === null) return null;
  if (min === null) return max;
  if (max === null) return min;
  return Math.round(((min + max) / 2) * 1000) / 1000;
};

export const GET: APIRoute = async () => {
  const reader = createReader(process.cwd(), keystaticConfig);
  const all = await reader.collections.sesiones.all();
  const sorted = all.sort((a, b) => a.slug.localeCompare(b.slug));

  const data = sorted.map(s => {
    const d = s.entry;
    return {
      fecha:              s.slug,
      blanco_selecto:     avg(toNum(d.blanco_selecto_min),     toNum(d.blanco_selecto_max)),
      blanco_normal:      avg(toNum(d.blanco_normal_min),      toNum(d.blanco_normal_max)),
      blanco_graso:       avg(toNum(d.blanco_graso_min),       toNum(d.blanco_graso_max)),
      lechon_nacional:    avg(toNum(d.lechon_nacional_min),    toNum(d.lechon_nacional_max)),
      lechon_importacion: avg(toNum(d.lechon_importacion_min), toNum(d.lechon_importacion_max)),
      cochinillo_marca:   avg(toNum(d.cochinillo_marca_min),   toNum(d.cochinillo_marca_max)),
      cochinillo_estandar:avg(toNum(d.cochinillo_estandar_min),toNum(d.cochinillo_estandar_max)),
      bellota_100:        avg(toNum(d.bellota_100_min),        toNum(d.bellota_100_max)),
      bellota_75:         avg(toNum(d.bellota_75_min),         toNum(d.bellota_75_max)),
      bellota_50:         avg(toNum(d.bellota_50_min),         toNum(d.bellota_50_max)),
      cebo_campo:         avg(toNum(d.cebo_campo_min),         toNum(d.cebo_campo_max)),
      cebo:               avg(toNum(d.cebo_min),               toNum(d.cebo_max)),
      lechones_ibericos:  avg(toNum(d.lechones_ibericos_min),  toNum(d.lechones_ibericos_max)),
      primales_ibericos:  avg(toNum(d.primales_ibericos_min),  toNum(d.primales_ibericos_max)),
      cerdas_unica:       avg(toNum(d.cerdas_unica_min),       toNum(d.cerdas_unica_max)),
      cerdas_extra:       avg(toNum(d.cerdas_extra_min),       toNum(d.cerdas_extra_max)),
      cerdas_desecho:     avg(toNum(d.cerdas_desecho_min),     toNum(d.cerdas_desecho_max)),
      verracos:           avg(toNum(d.verracos_min),           toNum(d.verracos_max)),
    };
  });

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
};
