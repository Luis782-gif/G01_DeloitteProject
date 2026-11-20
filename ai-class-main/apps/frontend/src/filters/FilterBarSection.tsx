import { Suspense } from 'react';
import { fetchWithFilters } from './api';
import { FilterBar } from './FilterBar';
import type { FilterOptions } from './filters';

/** Barra de filtros global (no layout, partilhada por todas as páginas): opções vêm de GET /api/filters/options. */
export async function FilterBarSection() {
  const r = await fetchWithFilters<FilterOptions>('/api/filters/options', {});
  return (
    <Suspense fallback={null}>
      <FilterBar options={r.ok ? r.data : null} />
    </Suspense>
  );
}
