import { KpiCardWithInfo } from '../explain/KpiCardWithInfo';
import type { AutonomyKpi, ShortageKpi, SlackKpi } from './autonomy';

const fmt = (n: number, d = 1) => n.toLocaleString('pt-PT', { minimumFractionDigits: d, maximumFractionDigits: d });

/** Cartões K1 autonomia, K6 dias de folga e K13 rutura prevista. Dados nulos = API indisponível. */
export function AutonomyView({
  autonomy,
  slack,
  shortage,
  error,
}: {
  autonomy: AutonomyKpi | null;
  slack: SlackKpi | null;
  shortage: ShortageKpi | null;
  error?: string;
}) {
  if (error) return <p role="alert" data-testid="autonomy-invalid-filter">Filtro inválido: {error}</p>;
  if (!autonomy || !slack || !shortage) {
    return <p data-testid="autonomy-unavailable">Autonomia e rutura prevista: indisponível (a API não respondeu).</p>;
  }
  const without = autonomy.itemsWithoutData;
  return (
    <section aria-label="Autonomia e rutura prevista">
      <KpiCardWithInfo
        kpiId="autonomy"
        label="Autonomia (mediana)"
        value={autonomy.median === null ? 'n/d' : fmt(autonomy.median)}
        unit="dias"
        status={autonomy.status ?? 'ok'}
      />
      <KpiCardWithInfo
        kpiId="slack-days"
        label="Dias de folga (mediana)"
        value={slack.median === null ? 'n/d' : fmt(slack.median)}
        unit="dias"
        status={slack.status ?? 'ok'}
      />
      <KpiCardWithInfo kpiId="shortage-rate" label="Rutura prevista" value={fmt(shortage.pct)} unit="%" status={shortage.status} />
      <p data-testid="shortage-summary">
        {shortage.count} de {shortage.n} artigos com folga negativa
        {autonomy.noConsumption > 0 && ` · ${autonomy.noConsumption} sem consumo`}
      </p>
      {without > 0 && (
        <p data-testid="autonomy-without-data">
          {without} artigo{without === 1 ? '' : 's'} sem dados no período
        </p>
      )}
    </section>
  );
}
