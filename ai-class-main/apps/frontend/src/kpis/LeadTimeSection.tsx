import { fetchWithFilters } from '../filters/api';
import type { FilterState } from '../filters/filters';
import { LeadTimeView } from './LeadTimeView';
import type { LeadTime } from './lead-time';

export async function LeadTimeSection({ filters, showCard = true }: { filters: FilterState; showCard?: boolean }) {
  const r = await fetchWithFilters<LeadTime>('/api/kpis/lead-time', filters);
  return <LeadTimeView data={r.ok ? r.data : null} error={r.ok ? undefined : (r.message ?? undefined)} showCard={showCard} />;
}
