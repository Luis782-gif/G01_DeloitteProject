import { fetchWithFilters } from '../filters/api';
import type { FilterState } from '../filters/filters';
import { ExcessBarsView } from './ExcessBarsView';
import type { ExcessCapital } from './excess';

/** Barras de excesso com drill-down Tipo → Artigo (página "Onde dói"). */
export async function ExcessBarsSection({ filters }: { filters: FilterState }) {
  const e = await fetchWithFilters<ExcessCapital>('/api/kpis/excess-capital', filters);
  if (!e.ok) return <p role="alert">{e.message ? `Filtro inválido: ${e.message}` : 'Excesso por artigo: indisponível (a API não respondeu).'}</p>;
  return <ExcessBarsView data={e.data} />;
}
