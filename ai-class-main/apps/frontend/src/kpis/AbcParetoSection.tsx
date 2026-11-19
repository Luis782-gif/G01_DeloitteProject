import { fetchWithFilters } from '../filters/api';
import type { FilterState } from '../filters/filters';
import { AbcParetoView } from './AbcParetoView';
import type { ParetoRow } from './abc';

export async function AbcParetoSection({ filters }: { filters: FilterState }) {
  const r = await fetchWithFilters<ParetoRow[]>('/api/abc/pareto', filters);
  return <AbcParetoView data={r.ok ? r.data : null} error={r.ok ? undefined : (r.message ?? undefined)} />;
}
