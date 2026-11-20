import { DetailLink } from '../detail/DetailLink';
import { KpiCard } from '../components/KpiCard';
import { belowMinimumStatus, type BelowMinimum } from './below-minimum';

const fmtPct = (n: number) => n.toLocaleString('pt-PT', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** Cartão K5 e tabela de artigos abaixo do mínimo. `data` nulo = API indisponível. */
export function BelowMinimumView({ data, error }: { data: BelowMinimum | null; error?: string }) {
  if (error) {
    return <p role="alert" data-testid="below-min-invalid-filter">Filtro inválido: {error}</p>;
  }
  if (!data) {
    return <p data-testid="below-min-unavailable">Artigos abaixo do mínimo: indisponível (a API não respondeu).</p>;
  }
  return (
    <section aria-label="Artigos abaixo do mínimo">
      <KpiCard label="Artigos abaixo do mínimo" value={fmtPct(data.pct)} unit="%" status={belowMinimumStatus(data.pct)} />
      <p data-testid="below-min-summary">
        {data.count} de {data.eligible} artigos elegíveis · {data.excluded} excluído{data.excluded === 1 ? '' : 's'} (mínimo
        superior ao máximo)
      </p>
      {data.itemsWithoutData > 0 && (
        <p data-testid="items-without-data">
          {data.itemsWithoutData} artigo{data.itemsWithoutData === 1 ? '' : 's'} sem dados no período
        </p>
      )}
      {data.items.length === 0 ? (
        <p>Nenhum artigo abaixo do mínimo.</p>
      ) : (
        <table data-testid="below-min-table">
          <thead>
            <tr>
              <th scope="col">Artigo</th>
              <th scope="col">Stock</th>
              <th scope="col">Mínimo</th>
              <th scope="col">Data de referência</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((i) => (
              <tr key={i.itemRef}>
                <td><DetailLink kind="artigo" itemRef={i.itemRef} /></td>
                <td>{i.stock}</td>
                <td>{i.min}</td>
                <td>{i.referenceDate}</td>
                <td>{i.stale ? 'Desatualizado' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
