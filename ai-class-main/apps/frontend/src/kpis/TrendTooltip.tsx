import { fmtDelta, fmtValue, monthLabel, type TrendPoint } from './trend';

/** Conteúdo do tooltip: mês, valor, mês anterior, variação e nº de snapshots. Mês sem dados diz-o. */
export function TrendTooltipBody({ point, unit }: { point: TrendPoint; unit: string }) {
  return (
    <div data-testid="trend-tooltip" style={{ background: 'var(--surface, #fff)', border: '1px solid var(--border, #ccc)', padding: 8 }}>
      <strong>{monthLabel(point.month)}</strong>
      {point.value === null && <p>Sem registos neste mês</p>}
      <dl>
        <dt>Valor</dt><dd>{fmtValue(point.value, unit)}</dd>
        <dt>Mês anterior</dt><dd>{fmtValue(point.previousValue, unit)}</dd>
        <dt>Variação</dt><dd>{fmtDelta(point.delta, unit)}</dd>
        <dt>Nº de snapshots</dt><dd>{point.snapshots}</dd>
      </dl>
    </div>
  );
}
