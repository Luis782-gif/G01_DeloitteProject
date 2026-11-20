import { fetchWithFilters } from '../filters/api';
import type { FilterState } from '../filters/filters';
import { TrendView } from './TrendView';
import type { TrendMetric, TrendPoint } from './trend';

export async function TrendSection({ filters }: { filters: FilterState }) {
  const [a, b] = await Promise.all([
    fetchWithFilters<TrendPoint[]>('/api/kpis/trend', filters, { metric: 'below_min_pct' }),
    fetchWithFilters<TrendPoint[]>('/api/kpis/trend', filters, { metric: 'lead_time' }),
  ]);
  if (!a.ok || !b.ok) return <TrendView data={null} error={(!a.ok ? a.message : !b.ok ? b.message : null) ?? undefined} />;
  const data: Record<TrendMetric, TrendPoint[]> = { below_min_pct: a.data, lead_time: b.data };
  return <TrendView data={data} />;
}
