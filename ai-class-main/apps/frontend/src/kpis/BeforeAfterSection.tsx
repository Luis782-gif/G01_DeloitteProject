import { fetchWithFilters } from '../filters/api';
import type { FilterState } from '../filters/filters';
import { BeforeAfterView } from './BeforeAfterView';
import type { BeforeAfter } from './before-after';

/** Secção "Antes vs. depois" da página Receita: pede à API (com os filtros globais) e delega na vista. */
export async function BeforeAfterSection({ filters }: { filters: FilterState }) {
  const r = await fetchWithFilters<BeforeAfter>('/api/impact/before-after', filters);
  return <BeforeAfterView data={r.ok ? r.data : null} error={!r.ok ? (r.message ?? undefined) : undefined} />;
}
