import { KpiCardWithInfo } from '../explain/KpiCardWithInfo';
import { filtersToSearch, type FilterState } from '../filters/filters';
import { LeadTimeIntervalChart, SeasonalityChart } from './VendorCharts';
import { MONTHS, type Vendors } from './vendors';

const fmt = (n: number | null, digits = 1) =>
  n === null ? '—' : n.toLocaleString('pt-PT', { minimumFractionDigits: digits, maximumFractionDigits: digits });

/** Ligação ao drill-through do fornecedor (?detalhe=fornecedor:<id>), preservando os filtros globais. */
const detailHref = (filters: FilterState, vendorId: string) =>
  `?${[filtersToSearch(filters), `detalhe=fornecedor:${vendorId}`].filter(Boolean).join('&')}`;

/** Página Porquê (P5): variabilidade do LT, prometido vs. real, índice de risco e sazonalidade. */
export function VendorsView({ data, filters, error }: { data: Vendors | null; filters: FilterState; error?: string }) {
  if (error) return <p role="alert" data-testid="vendors-invalid-filter">Filtro inválido: {error}</p>;
  if (!data) return <p data-testid="vendors-unavailable">Fornecedores: indisponível (a API não respondeu).</p>;
  const { vendors } = data;
  return (
    <>
      <p data-testid="vendors-honesty" role="note">{data.distinguishText}</p>

      <section aria-label="Tempo de reposição por fornecedor">
        <h2>Tempo de reposição por fornecedor (média ± desvio-padrão)</h2>
        <LeadTimeIntervalChart vendors={vendors} />
        <table data-testid="vendors-lead-time">
          <thead>
            <tr>
              <th scope="col">Fornecedor</th>
              <th scope="col">Média (dias)</th>
              <th scope="col">Desvio-padrão</th>
              <th scope="col">CV</th>
              <th scope="col">Artigos (referência)</th>
              <th scope="col">Em risco</th>
              <th scope="col">Detalhe</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => (
              <tr key={v.vendorId}>
                <td>{v.vendorId} {v.vendorName}</td>
                <td>{fmt(v.mean)}</td>
                <td>{fmt(v.stdDev)}</td>
                <td>{v.cv === null ? '—' : `${fmt(v.cv * 100)} %`}</td>
                <td>{v.items}</td>
                <td>{fmt(v.pctAtRisk)} % ({v.itemsAtRisk})</td>
                <td><a href={detailHref(filters, v.vendorId)}>Ver detalhe</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-label="Prometido vs. real">
        <KpiCardWithInfo kpiId="promised-vs-real" label="Prometido vs. real" value={`${vendors.length}`} unit="fornecedores" />
        <table data-testid="promised-vs-real-table">
          <thead>
            <tr>
              <th scope="col">Fornecedor</th>
              <th scope="col">Prazo declarado (dias)</th>
              <th scope="col">Prazo pelas datas (dias)</th>
              <th scope="col">Tempo médio do inventário (dias)</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => (
              <tr key={v.vendorId}>
                <td>{v.vendorId}</td>
                <td>{v.declaredDays ?? '—'}</td>
                <td>{v.datesDays ?? '—'}</td>
                <td>{fmt(v.mean)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-label="Índice de risco do fornecedor">
        <KpiCardWithInfo kpiId="vendor-risk" label="Índice de risco do fornecedor" value="1 a 3" unit="menor = melhor" />
        <table data-testid="vendor-risk-table">
          <thead>
            <tr>
              <th scope="col">Fornecedor</th>
              <th scope="col">Rank tempo médio</th>
              <th scope="col">Rank CV</th>
              <th scope="col">Rank % em risco</th>
              <th scope="col">Índice (média dos ranks)</th>
            </tr>
          </thead>
          <tbody>
            {vendors.map((v) => (
              <tr key={v.vendorId}>
                <td>{v.vendorId}</td>
                <td>{v.risk ? fmt(v.risk.ranks.mean) : '—'}</td>
                <td>{v.risk ? fmt(v.risk.ranks.cv) : '—'}</td>
                <td>{v.risk ? fmt(v.risk.ranks.atRisk) : '—'}</td>
                <td>{v.risk ? fmt(v.risk.index, 2) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section aria-label="Sazonalidade mensal do tempo de reposição">
        <h2>Sazonalidade mensal do tempo de reposição</h2>
        <p data-testid="seasonality-caveat" role="note">
          Atenção: cerca de 10 observações por artigo (base fraca). Padrões mensais devem ler-se com cautela.
        </p>
        {data.seasonality.length > 0 && <SeasonalityChart data={data.seasonality} />}
        <table data-testid="seasonality-table">
          <thead>
            <tr>
              <th scope="col">Mês</th>
              <th scope="col">Média (dias)</th>
              <th scope="col">Observações</th>
            </tr>
          </thead>
          <tbody>
            {data.seasonality.map((s) => (
              <tr key={s.month}>
                <td>{MONTHS[s.month - 1]}</td>
                <td>{fmt(s.mean)}</td>
                <td>{s.observations}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
