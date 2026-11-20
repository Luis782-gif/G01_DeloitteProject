import { DetailLink } from '../detail/DetailLink';
import { KpiCardWithInfo } from '../explain/KpiCardWithInfo';
import { TriageBadge } from './TriageBadge';
import type { ReorderSuggestions } from './reorder';

/** Receita: lista de triagem com a sugestão de encomenda (heurística, sem QEE) e exportação CSV. */
export function ReorderView({ data, error, exportHref }: { data: ReorderSuggestions | null; error?: string; exportHref: string }) {
  if (error) return <p role="alert" data-testid="reorder-invalid-filter">Filtro inválido: {error}</p>;
  if (!data) return <p data-testid="reorder-unavailable">Lista de compras: indisponível (a API não respondeu).</p>;
  return (
    <section aria-label="Lista de compras sugerida">
      <h2>Lista de compras</h2>
      <KpiCardWithInfo
        kpiId="reorder-suggestion"
        label="Artigos a encomendar"
        value={String(data.totals.items)}
        unit={`${data.totals.units} unidades sugeridas`}
        status={data.totals.items === 0 ? 'ok' : 'atencao'}
      />
      <p data-testid="reorder-caveat">Sugestão heurística, sem quantidade económica de encomenda.</p>
      <p>
        <a href={exportHref} download data-testid="reorder-export">Exportar lista de compras</a> (CSV, abre no Excel)
      </p>
      {data.withoutConsumption > 0 && (
        <p data-testid="reorder-no-consumption">
          {data.withoutConsumption} artigo(s) sem consumo ficam fora da lista (sem consumo não há ponto de encomenda).
        </p>
      )}
      <table data-testid="reorder-table">
        <caption>Artigos abaixo do ponto de encomenda, do mais ao menos urgente</caption>
        <thead>
          <tr>
            <th scope="col">Artigo</th>
            <th scope="col">Nível</th>
            <th scope="col">Stock</th>
            <th scope="col">Ponto de encomenda</th>
            <th scope="col">Stock de segurança</th>
            <th scope="col">Quantidade sugerida</th>
            <th scope="col">Motivo</th>
          </tr>
        </thead>
        <tbody>
          {data.items.length === 0 && (
            <tr>
              <td colSpan={7}>Nenhum artigo abaixo do ponto de encomenda.</td>
            </tr>
          )}
          {data.items.map((i) => (
            <tr key={i.itemRef}>
              <td><DetailLink kind="artigo" itemRef={i.itemRef} /></td>
              <td><TriageBadge level={i.level} /></td>
              <td>{i.stock}</td>
              <td>{i.reorderPoint}</td>
              <td>
                {i.safetyStock}
                {i.lowConfidence && <small title="Menos de 8 observações de consumo"> (confiança baixa)</small>}
              </td>
              <td>{i.suggest}</td>
              <td>{i.reason}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
