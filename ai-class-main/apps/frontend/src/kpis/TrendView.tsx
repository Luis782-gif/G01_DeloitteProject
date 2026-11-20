import { TrendChart } from './TrendChart';
import { TREND_METRICS, type TrendMetric, type TrendPoint } from './trend';

/** Gráficos de tendência das duas métricas; `null` = API indisponível. */
export function TrendView({ data, error }: { data: Record<TrendMetric, TrendPoint[]> | null; error?: string }) {
  if (error) return <p role="alert" data-testid="trend-invalid-filter">Filtro inválido: {error}</p>;
  if (!data) return <p data-testid="trend-unavailable">Tendência mensal: indisponível (a API não respondeu).</p>;
  return (
    <section aria-label="Tendência mensal">
      <h2>Tendência mensal</h2>
      {(Object.keys(TREND_METRICS) as TrendMetric[]).map((k) => {
        const { label, unit } = TREND_METRICS[k];
        const gaps = data[k].filter((p) => p.value === null).length;
        return (
          <figure key={k} data-testid={`trend-${k}`}>
            <figcaption>{label}, comparado com o mês anterior</figcaption>
            {data[k].length === 0 ? <p>Sem dados no período.</p> : <TrendChart points={data[k]} label={label} unit={unit} />}
            {gaps > 0 && <p data-testid={`trend-${k}-gaps`}>{gaps} {gaps === 1 ? 'mês sem registos aparece' : 'meses sem registos aparecem'} como interrupção (não é zero).</p>}
          </figure>
        );
      })}
    </section>
  );
}
