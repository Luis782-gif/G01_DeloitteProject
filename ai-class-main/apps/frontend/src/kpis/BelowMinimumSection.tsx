import { fetchWithFilters } from '../filters/api';
import type { FilterState } from '../filters/filters';
import { BelowMinimumView } from './BelowMinimumView';
import type { BelowMinimum } from './below-minimum';

export async function BelowMinimumSection({ filters, showCard = true }: { filters: FilterState; showCard?: boolean }) {
  const r = await fetchWithFilters<BelowMinimum>('/api/kpis/below-minimum', filters, { pageSize: 100 });
  return <BelowMinimumView data={r.ok ? r.data : null} error={r.ok ? undefined : (r.message ?? undefined)} showCard={showCard} />;
}
