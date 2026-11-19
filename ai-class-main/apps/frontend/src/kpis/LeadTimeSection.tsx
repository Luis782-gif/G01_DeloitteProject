import { fetchWithFilters } from '../filters/api';
import type { FilterState } from '../filters/filters';
import { LeadTimeView } from './LeadTimeView';
import type { LeadTime } from './lead-time';

export async function LeadTimeSection({ filters }: { filters: FilterState }) {
  const r = await fetchWithFilters<LeadTime>('/api/kpis/lead-time', filters);
  return <LeadTimeView data={r.ok ? r.data : null} error={r.ok ? undefined : (r.message ?? undefined)} />;
}
