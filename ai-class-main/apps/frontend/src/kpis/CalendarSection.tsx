import { fetchWithFilters } from '../filters/api';
import type { FilterState } from '../filters/filters';
import { CalendarView } from './CalendarView';
import type { ShortageCalendar } from './calendar';

/** Página "Onde dói": calendário de rutura iminente (pede à API, com os filtros globais). */
export async function CalendarSection({ filters }: { filters: FilterState }) {
  const r = await fetchWithFilters<ShortageCalendar>('/api/shortage-calendar', filters);
  if (!r.ok) {
    return r.message ? (
      <p role="alert">Filtro inválido: {r.message}</p>
    ) : (
      <p data-testid="calendar-unavailable">Calendário de rutura iminente: indisponível (a API não respondeu).</p>
    );
  }
  return <CalendarView data={r.data} />;
}
