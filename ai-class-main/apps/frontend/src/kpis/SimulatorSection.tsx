import { fetchWithFilters } from '../filters/api';
import type { FilterState } from '../filters/filters';
import { SimulatorForm } from './SimulatorForm';

/** Secção "E se…?" da página Receita: dois parâmetros, o servidor recalcula folga e triagem. */
export async function SimulatorSection({ filters }: { filters: FilterState }) {
  const o = await fetchWithFilters<{ vendors?: { vendorId: string; name: string }[] }>('/api/filters/options', {});
  const vendors = o.ok ? (o.data.vendors ?? []) : [];
  return (
    <section aria-label="Simulador E se…?">
      <h2>E se…?</h2>
      <p data-testid="simulator-caveat" role="note"><strong>Simulação, não é uma previsão.</strong> Assume consumo constante; mostra só quantos artigos passam a ter folga negativa e como muda a triagem.</p>
      <SimulatorForm filters={filters} vendors={vendors} />
    </section>
  );
}
