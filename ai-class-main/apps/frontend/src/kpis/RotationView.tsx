import { KpiCard } from '../components/KpiCard';
import type { Rotation } from './rotation';

const fmt = (n: number | null) =>
  n === null ? 'sem dados' : n.toLocaleString('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Cartão K2 (sem alvo, sem estado) e tabela por artigo. `data` nulo = API indisponível. */
export function RotationView({ data, error }: { data: Rotation | null; error?: string }) {
  if (error) {
    return <p role="alert" data-testid="rotation-invalid-filter">Filtro inválido: {error}</p>;
  }
  if (!data) {
    return <p data-testid="rotation-unavailable">Rotação do stock: indisponível (a API não respondeu).</p>;
  }
  return (
    <section aria-label="Rotação do stock">
      <KpiCard label="Rotação do stock" value={fmt(data.rotation)} unit="× no período" />
      <p data-testid="rotation-summary">
        Anualizada: {fmt(data.annualizedRotation)} × por ano · {data.periodDays} dias · aproximação a partir do consumo médio diário
      </p>
      <p data-testid="rotation-value">
        Em valor (versão secundária): {fmt(data.value.rotation)} × no período · {fmt(data.value.annualizedRotation)} × por ano
      </p>
      {data.itemsWithoutData > 0 && (
        <p data-testid="items-without-data">
          {data.itemsWithoutData} artigo{data.itemsWithoutData === 1 ? '' : 's'} sem dados no período
        </p>
      )}
      {data.items.length > 0 && (
        <table data-testid="rotation-table">
          <thead>
            <tr>
              <th scope="col">Artigo</th>
              <th scope="col">Consumo estimado</th>
              <th scope="col">Stock médio</th>
              <th scope="col">Rotação</th>
              <th scope="col">Anualizada</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((i) => (
              <tr key={i.itemRef}>
                <td>{i.itemRef}</td>
                <td>{fmt(i.estimatedConsumption)}</td>
                <td>{fmt(i.averageStock)}</td>
                <td>{fmt(i.rotation)}</td>
                <td>{fmt(i.annualizedRotation)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
