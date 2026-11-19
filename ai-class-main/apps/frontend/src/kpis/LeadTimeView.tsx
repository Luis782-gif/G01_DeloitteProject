import { KpiCard } from '../components/KpiCard';
import type { LeadTime } from './lead-time';

const fmt = (n: number | null, digits = 1) =>
  n === null ? '—' : n.toLocaleString('pt-PT', { minimumFractionDigits: digits, maximumFractionDigits: digits });
const fmtCv = (n: number | null) => (n === null ? '—' : `${fmt(n * 100)} %`);

/** Cartão K3 (sem alvo, sem estado) e tabela por fornecedor. `data` nulo = API indisponível. */
export function LeadTimeView({ data, error }: { data: LeadTime | null; error?: string }) {
  if (error) return <p role="alert" data-testid="lead-time-invalid-filter">Filtro inválido: {error}</p>;
  if (!data) return <p data-testid="lead-time-unavailable">Tempo médio de reposição: indisponível (a API não respondeu).</p>;
  return (
    <section aria-label="Tempo médio de reposição">
      <KpiCard label="Tempo médio de reposição" value={fmt(data.mean)} unit="dias" />
      <p data-testid="lead-time-summary">
        Desvio-padrão {fmt(data.stdDev)} dias · coeficiente de variação {fmtCv(data.cv)} · {data.observations} observações
      </p>
      {data.invalid > 0 && (
        <p data-testid="lead-time-invalid">
          {data.invalid} snapshot{data.invalid === 1 ? '' : 's'} com tempo de reposição inválido (≤ 0), fora do cálculo
        </p>
      )}
      {data.byVendor.length > 0 && (
        <table data-testid="lead-time-vendors">
          <thead>
            <tr>
              <th scope="col">Fornecedor</th>
              <th scope="col">Média (dias)</th>
              <th scope="col">Desvio-padrão</th>
              <th scope="col">CV</th>
              <th scope="col">Snapshots</th>
            </tr>
          </thead>
          <tbody>
            {data.byVendor.map((v) => (
              <tr key={v.vendorId}>
                <td>{v.vendorId}</td>
                <td>{fmt(v.mean)}</td>
                <td>{fmt(v.stdDev)}</td>
                <td>{fmtCv(v.cv)}</td>
                <td>{v.observations}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
