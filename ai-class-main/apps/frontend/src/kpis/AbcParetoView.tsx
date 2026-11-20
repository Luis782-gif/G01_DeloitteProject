import { DetailLink } from '../detail/DetailLink';
import { KpiCardWithInfo } from '../explain/KpiCardWithInfo';
import { AbcParetoChart } from './AbcParetoChart';
import { classCounts, type ParetoRow } from './abc';

const fmt = (n: number, digits = 2) => n.toLocaleString('pt-PT', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Pareto ABC (gráfico + tabela equivalente). `data` nulo = API indisponível. */
export function AbcParetoView({ data, error }: { data: ParetoRow[] | null; error?: string }) {
  if (error) return <p role="alert" data-testid="abc-invalid-filter">Filtro inválido: {error}</p>;
  if (!data) return <p data-testid="abc-unavailable">Pareto ABC: indisponível (a API não respondeu).</p>;
  if (data.length === 0) return <p data-testid="abc-empty">Sem artigos para o Pareto ABC neste período.</p>;
  const counts = classCounts(data);
  return (
    <section aria-label="Pareto ABC">
      <h2>Pareto ABC</h2>
      <KpiCardWithInfo kpiId="abc" label="Artigos de classe A" value={String(counts.A)} unit={`de ${data.length}`} status="ok" />
      <p data-testid="abc-summary">
        Classes (cortes 80/95 % do valor de stock): A: {counts.A} · B: {counts.B} · C: {counts.C}
      </p>
      <AbcParetoChart rows={data} />
      <table data-testid="abc-table">
        <caption>Valor de stock por artigo, por ordem decrescente</caption>
        <thead>
          <tr>
            <th scope="col">Artigo</th>
            <th scope="col">Valor (€)</th>
            <th scope="col">% acumulada</th>
            <th scope="col">% de referências</th>
            <th scope="col">Classe</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.itemRef}>
              <td><DetailLink kind="artigo" itemRef={r.itemRef} /></td>
              <td>{fmt(r.value)}</td>
              <td>{fmt(r.cumPct)}</td>
              <td>{fmt(r.refCumPct)}</td>
              <td>{r.class}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
