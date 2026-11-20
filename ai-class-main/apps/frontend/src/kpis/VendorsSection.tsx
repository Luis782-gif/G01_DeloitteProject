import { fetchWithFilters } from '../filters/api';
import type { FilterState } from '../filters/filters';
import { VendorsView } from './VendorsView';
import type { Vendors } from './vendors';

export async function VendorsSection({ filters }: { filters: FilterState }) {
  const r = await fetchWithFilters<Vendors>('/api/vendors', filters);
  return <VendorsView data={r.ok ? r.data : null} filters={filters} error={r.ok ? undefined : (r.message ?? undefined)} />;
}
