import { fetchWithFilters } from '../filters/api';
import type { FilterState } from '../filters/filters';
import { AutonomyScatter } from './AutonomyScatter';
import { belowDiagonal, type SlackKpi } from './autonomy';

/** Página "Onde dói": dispersão autonomia × tempo de reposição (artigos abaixo da diagonal = folga negativa). */
export async function ScatterSection({ filters }: { filters: FilterState }) {
  const r = await fetchWithFilters<SlackKpi>('/api/kpis/slack-days', filters);
  if (!r.ok) {
    return r.message ? (
      <p role="alert">Filtro inválido: {r.message}</p>
    ) : (
      <p data-testid="scatter-unavailable">Dispersão autonomia × tempo de reposição: indisponível (a API não respondeu).</p>
    );
  }
  const d = r.data;
  return (
    <section aria-label="Autonomia por tempo de reposição">
      <h2>Autonomia × tempo de reposição</h2>
      <p data-testid="scatter-summary">
        {belowDiagonal(d.items)} de {d.n} artigos abaixo da diagonal (autonomia menor que o tempo de reposição)
        {d.noConsumption > 0 && ` · ${d.noConsumption} sem consumo, fora do gráfico`}
      </p>
      {d.itemsWithoutData > 0 && (
        <p data-testid="scatter-without-data">
          {d.itemsWithoutData} artigo{d.itemsWithoutData === 1 ? '' : 's'} sem dados no período
        </p>
      )}
      <AutonomyScatter items={d.items} />
    </section>
  );
}
