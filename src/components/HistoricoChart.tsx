import { useState, useEffect } from 'react';
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

const RANGOS = [
  { label: 'Último año',   meses: 12 },
  { label: '5 años',       meses: 60 },
  { label: '10 años',      meses: 120 },
  { label: 'Todo',         meses: 0 },
];

export function HistoricoChart() {
  const [sesiones, setSesiones] = useState<SesionChartData[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(false);
  const [selectedKey, setSelectedKey] = useState<PrecioKey>('blanco_normal');
  const [rango, setRango]             = useState(0);

  useEffect(() => {
    fetch('/api/historico.json')
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: SesionChartData[]) => { setSesiones(data); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="chart-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#6B6B6B', fontSize: '0.85rem' }}>Cargando histórico…</p>
      </div>
    );
  }

  if (error || sesiones.length < 2) {
    return (
      <div className="chart-wrapper">
        <p style={{ color: '#6B6B6B', fontSize: '0.85rem' }}>
          {error ? 'No se pudo cargar el histórico de precios.' : 'Se necesitan al menos 2 sesiones para mostrar la evolución histórica.'}
        </p>
      </div>
    );
  }

  const cat = CATEGORIAS.find(c => c.key === selectedKey) ?? CATEGORIAS[0];

  const sesionesRango = rango === 0 ? sesiones : (() => {
    const limite = new Date();
    limite.setMonth(limite.getMonth() - rango);
    const limiteStr = limite.toISOString().split('T')[0];
    return sesiones.filter(s => s.fecha >= limiteStr);
  })();

  const labels     = sesionesRango.map(s => s.fecha);
  const dataPoints = sesionesRango.map(s => s[selectedKey] as number | null);

  const chartData: ChartData<'line'> = {
    labels,
    datasets: [
      {
        label: cat.label,
        data: dataPoints as (number | null)[],
        borderColor: cat.color,
        backgroundColor: 'transparent',
        borderWidth: labels.length > 200 ? 1.5 : 2,
        pointRadius: labels.length > 200 ? 0 : 3,
        pointHoverRadius: 4,
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

  return (
    <div className="chart-wrapper">
      <div className="chart-controls">
        <select
          className="chart-select"
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value as PrecioKey)}
        >
          {CATEGORIAS.map(c => (
            <option key={c.key} value={c.key}>{c.label}</option>
          ))}
        </select>
        <div className="chart-rango">
          {RANGOS.map(r => (
            <button
              key={r.meses}
              className={`rango-btn${rango === r.meses ? ' active' : ''}`}
              onClick={() => setRango(r.meses)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <Line data={chartData} options={options} />
    </div>
  );
}
