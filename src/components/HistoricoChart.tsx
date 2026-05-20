import { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { ChartData, ChartOptions } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

export interface SesionChartData {
  fecha: string;
  blanco_selecto: number | null;
  blanco_normal: number | null;
  blanco_graso: number | null;
  lechon_nacional: number | null;
  lechon_importacion: number | null;
  cochinillo_marca: number | null;
  cochinillo_estandar: number | null;
  bellota_100: number | null;
  bellota_75: number | null;
  bellota_50: number | null;
  cebo_campo: number | null;
  cebo: number | null;
  lechones_ibericos: number | null;
  primales_ibericos: number | null;
  cerdas_unica: number | null;
  cerdas_extra: number | null;
  cerdas_desecho: number | null;
  verracos: number | null;
}

type PrecioKey = keyof Omit<SesionChartData, 'fecha'>;

const CATEGORIAS: { key: PrecioKey; label: string; color: string }[] = [
  { key: 'blanco_selecto',     label: 'Cerdo Selecto',       color: '#5C3D2E' },
  { key: 'blanco_normal',      label: 'Cerdo Normal',        color: '#8B6E5A' },
  { key: 'blanco_graso',       label: 'Cerdo Graso',         color: '#B89E8E' },
  { key: 'lechon_nacional',    label: 'Lechón Nacional',     color: '#8B9E6E' },
  { key: 'lechon_importacion', label: 'Lechón Importación',  color: '#6B8049' },
  { key: 'bellota_100',        label: 'Bellota 100%',        color: '#2C5F2E' },
  { key: 'bellota_75',         label: 'Bellota 75%',         color: '#4A8F4D' },
  { key: 'bellota_50',         label: 'Bellota 50%',         color: '#6BBF6F' },
  { key: 'cebo_campo',         label: 'Cebo de Campo',       color: '#9E6B2E' },
  { key: 'cebo',               label: 'Cebo',                color: '#C9924A' },
  { key: 'lechones_ibericos',  label: 'Lechones Ibéricos',   color: '#4A3728' },
  { key: 'primales_ibericos',  label: 'Primales Ibéricos',   color: '#7A5C48' },
  { key: 'cerdas_unica',       label: 'Cerdas — Única',      color: '#6B6B6B' },
  { key: 'cerdas_extra',       label: 'Cerdas — Extra',      color: '#9B9B9B' },
  { key: 'cerdas_desecho',     label: 'Cerdas — Desecho',    color: '#C0C0C0' },
  { key: 'verracos',           label: 'Verracos',            color: '#4A4A4A' },
];

interface Props {
  sesiones: SesionChartData[];
}

export function HistoricoChart({ sesiones }: Props) {
  const [selectedKey, setSelectedKey] = useState<PrecioKey>(CATEGORIAS[0].key);
  const cat = CATEGORIAS.find(c => c.key === selectedKey) ?? CATEGORIAS[0];

  const labels = sesiones.map(s => s.fecha);
  const dataPoints = sesiones.map(s => s[selectedKey] as number | null);

  const chartData: ChartData<'line'> = {
    labels,
    datasets: [
      {
        label: cat.label,
        data: dataPoints,
        borderColor: cat.color,
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: cat.color,
        tension: 0.3,
        spanGaps: true,
      },
    ],
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => `${Number(ctx.parsed.y).toFixed(2)} €`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: '#E2DDD7' },
        ticks: { font: { family: 'Inter, sans-serif', size: 11 } },
      },
      y: {
        grid: { color: '#E2DDD7' },
        ticks: {
          font: { family: 'Inter, sans-serif', size: 11 },
          callback: (v) => `${v} €`,
        },
      },
    },
  };

  if (sesiones.length < 2) {
    return (
      <div className="chart-wrapper">
        <p style={{ color: '#6B6B6B', fontSize: '0.85rem' }}>
          Se necesitan al menos 2 sesiones para mostrar la evolución histórica.
        </p>
      </div>
    );
  }

  return (
    <div className="chart-wrapper">
      <select
        className="chart-select"
        value={selectedKey}
        onChange={(e) => setSelectedKey(e.target.value as PrecioKey)}
      >
        {CATEGORIAS.map(c => (
          <option key={c.key} value={c.key}>{c.label}</option>
        ))}
      </select>
      <Line data={chartData} options={options} />
    </div>
  );
}
