import { fetchWithFilters } from '../filters/api';
import type { FilterState } from '../filters/filters';
import { RotationView } from './RotationView';
import type { Rotation } from './rotation';

export async function RotationSection({ filters, showCard = true }: { filters: FilterState; showCard?: boolean }) {
  const r = await fetchWithFilters<Rotation>('/api/kpis/rotation', filters, { pageSize: 100 });
  return <RotationView data={r.ok ? r.data : null} error={r.ok ? undefined : (r.message ?? undefined)} showCard={showCard} />;
}
