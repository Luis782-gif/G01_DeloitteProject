/** Um mês de GET /api/kpis/trend. `value` nulo = mês sem snapshots (lacuna, nunca zero). */
export interface TrendPoint {
  month: string;
  value: number | null;
  previousValue: number | null;
  delta: number | null;
  snapshots: number;
}

export type TrendMetric = 'below_min_pct' | 'lead_time';

export const TREND_METRICS: Record<TrendMetric, { label: string; unit: string }> = {
  below_min_pct: { label: '% de registos abaixo do mínimo no mês', unit: '%' },
  lead_time: { label: 'Tempo médio de reposição por mês', unit: 'dias' },
};

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** '2025-03' -> 'mar 2025'. */
export const monthLabel = (m: string) => `${MONTHS[Number(m.slice(5, 7)) - 1] ?? m.slice(5, 7)} ${m.slice(0, 4)}`;

export const fmtValue = (v: number | null, unit: string) =>
  v === null ? '—' : `${v.toLocaleString('pt-PT', { maximumFractionDigits: 2 })} ${unit}`;

export const fmtDelta = (d: number | null, unit: string) =>
  d === null ? '—' : `${d > 0 ? '+' : ''}${d.toLocaleString('pt-PT', { maximumFractionDigits: 2 })} ${unit}`;
