import { fetchWithFilters } from '../filters/api';
import type { FilterState } from '../filters/filters';
import { ReorderView } from './ReorderView';
import { exportHref, type ReorderSuggestions } from './reorder';

/** Secção "Lista de compras" da página Receita: sugestões de encomenda abaixo do ponto de encomenda. */
export async function ReorderSection({ filters }: { filters: FilterState }) {
  const r = await fetchWithFilters<ReorderSuggestions>('/api/reorder-suggestions', filters);
  return <ReorderView data={r.ok ? r.data : null} error={!r.ok ? (r.message ?? undefined) : undefined} exportHref={exportHref(filters)} />;
}
