import { KpiCardWithInfo } from '../explain/KpiCardWithInfo';
import { BeforeAfterChart } from './BeforeAfterChart';
import { fmtEur2, fmtPct2, releasedText, type BeforeAfter } from './before-after';

/** Receita: antes vs. depois do capital imobilizado (regra: suspender encomendas acima do máximo; ver "Como é calculado"). */
export function BeforeAfterView({ data, error }: { data: BeforeAfter | null; error?: string }) {
  if (error) return <p role="alert" data-testid="before-after-invalid-filter">Filtro inválido: {error}</p>;
  if (!data) return <p data-testid="before-after-unavailable">Antes vs. depois: indisponível (a API não respondeu).</p>;
  return (
    <section aria-label="Antes vs. depois do capital imobilizado">
      <h2>Antes vs. depois do capital imobilizado</h2>
      <KpiCardWithInfo kpiId="before-after" label="Capital libertado" value={fmtEur2(data.released)} unit={`${fmtPct2(data.releasedPct)} % do valor de stock`} />
      <p data-testid="before-after-summary">{releasedText(data)}</p>
      <p>
        Se as encomendas dos {data.itemsAboveMax} artigo{data.itemsAboveMax === 1 ? '' : 's'} acima do máximo forem suspensas até o stock voltar ao máximo (não é uma previsão).
      </p>
      <p data-testid="before-after-count">
        {data.itemsAboveMax} artigo{data.itemsAboveMax === 1 ? '' : 's'} acima do máximo
      </p>
      <BeforeAfterChart data={data} />
      <div className="table-scroll"><table data-testid="before-after-table">
        <caption>Valor de stock antes e depois, e capital libertado</caption>
        <thead>
          <tr>
            <th scope="col">Cenário</th>
            <th scope="col">Valor de stock</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">Antes</th>
            <td>{fmtEur2(data.before)}</td>
          </tr>
          <tr>
            <th scope="row">Depois</th>
            <td>{fmtEur2(data.after)}</td>
          </tr>
          <tr>
            <th scope="row">Libertado</th>
            <td>{fmtEur2(data.released)} ({fmtPct2(data.releasedPct)} %)</td>
          </tr>
        </tbody>
      </table></div>
    </section>
  );
}
