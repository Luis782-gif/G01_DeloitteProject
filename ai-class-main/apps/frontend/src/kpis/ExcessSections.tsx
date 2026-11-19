import { fetchWithFilters } from '../filters/api';
import type { FilterState } from '../filters/filters';
import { ExcessBarsView } from './ExcessBarsView';
import { ExcessCardsView } from './ExcessCardsView';
import type { ExcessCapital, IdleStock } from './excess';

/** Cartões K7/K7b (página "Pulso do hospital"). */
export async function ExcessCardsSection({ filters }: { filters: FilterState }) {
  const [e, i] = await Promise.all([
    fetchWithFilters<ExcessCapital>('/api/kpis/excess-capital', filters),
    fetchWithFilters<IdleStock>('/api/kpis/idle-stock', filters),
  ]);
  const error = (!e.ok && e.message) || (!i.ok && i.message) || undefined;
  return <ExcessCardsView excess={e.ok ? e.data : null} idle={i.ok ? i.data : null} error={error || undefined} />;
}

/** Barras de excesso com drill-down Tipo → Artigo (página "Onde dói"). */
export async function ExcessBarsSection({ filters }: { filters: FilterState }) {
  const e = await fetchWithFilters<ExcessCapital>('/api/kpis/excess-capital', filters);
  if (!e.ok) return <p role="alert">{e.message ? `Filtro inválido: ${e.message}` : 'Excesso por artigo: indisponível (a API não respondeu).'}</p>;
  return <ExcessBarsView data={e.data} />;
}
