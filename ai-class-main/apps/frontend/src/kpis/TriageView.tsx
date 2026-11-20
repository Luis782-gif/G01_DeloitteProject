import { DetailLink } from '../detail/DetailLink';
import { KpiCardWithInfo } from '../explain/KpiCardWithInfo';
import { FilterToggle } from '../filters/CrossFilter';
import { TriageBadge } from './TriageBadge';
import { TriageChart } from './TriageChart';
import { countAtLevel, urgentItems, type TriageBucket, type TriageItems } from './triage';

/** Pulso do hospital: distribuição dos níveis de triagem (clicar filtra) e tabela dos artigos de nível 4 e 5. */
export function TriageView({ distribution, items, error }: { distribution: TriageBucket[] | null; items: TriageItems | null; error?: string }) {
  if (error) return <p role="alert" data-testid="triage-invalid-filter">Filtro inválido: {error}</p>;
  if (!distribution || !items) return <p data-testid="triage-unavailable">Triagem: indisponível (a API não respondeu).</p>;
  const total = distribution.reduce((s, b) => s + b.count, 0);
  if (total === 0) return <p data-testid="triage-empty">Sem artigos para a triagem neste período.</p>;
  const urgent = urgentItems(items.items);
  const n5 = countAtLevel(distribution, 5);
  return (
    <section aria-label="Triagem de stock 1 a 5">
      <h2>Triagem de stock (1 a 5)</h2>
      <KpiCardWithInfo kpiId="triage" label="Artigos em nível 5" value={String(n5)} unit={`de ${total}`} status={n5 === 0 ? 'ok' : 'critico'} />
      <div role="group" aria-label="Filtrar por nível de triagem" data-testid="triage-filter" style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
        {distribution.map((b) => (
          <FilterToggle key={b.level} filterKey="triagem" value={String(b.level)}>
            {`Nível ${b.level}: ${b.count}`}
          </FilterToggle>
        ))}
      </div>
      <TriageChart distribution={distribution} />
      <table data-testid="triage-table">
        <caption>Artigos em nível 4 e 5, do mais ao menos urgente</caption>
        <thead>
          <tr>
            <th scope="col">Artigo</th>
            <th scope="col">Nível</th>
            <th scope="col">Classe</th>
            <th scope="col">Stock</th>
            <th scope="col">Stock de segurança</th>
            <th scope="col">Ponto de encomenda</th>
          </tr>
        </thead>
        <tbody>
          {urgent.length === 0 && (
            <tr>
              <td colSpan={6}>Nenhum artigo em nível 4 ou 5.</td>
            </tr>
          )}
          {urgent.map((i) => (
            <tr key={i.itemRef}>
              <td><DetailLink kind="artigo" itemRef={i.itemRef} /></td>
              <td><TriageBadge level={i.level} /></td>
              <td>{i.class}</td>
              <td>{i.stock}</td>
              <td>
                {i.safetyStock ?? '-'}
                {i.lowConfidence && <small title="Menos de 8 observações de consumo"> (confiança baixa)</small>}
              </td>
              <td>{i.reorderPoint ?? (i.noConsumption ? 'sem consumo' : '-')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
