import { KpiCardWithInfo } from '../explain/KpiCardWithInfo';
import { classCounts, type ParetoRow } from './abc';
import type { AutonomyKpi, ShortageKpi, SlackKpi } from './autonomy';
import { belowMinimumStatus, type BelowMinimum } from './below-minimum';
import { fmtEur, type ExcessCapital, type IdleStock } from './excess';
import type { LeadTime } from './lead-time';
import type { Rotation } from './rotation';

const fmt = (n: number | null | undefined, d = 1) =>
  n === null || n === undefined ? 'n/d' : n.toLocaleString('pt-PT', { minimumFractionDigits: d, maximumFractionDigits: d });
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export interface KpiStripData {
  autonomy: AutonomyKpi | null;
  slack: SlackKpi | null;
  shortage: ShortageKpi | null;
  belowMinimum: BelowMinimum | null;
  excess: ExcessCapital | null;
  idle: IdleStock | null;
  abc: ParetoRow[] | null;
  rotation: Rotation | null;
  leadTime: LeadTime | null;
}

/** % do valor de stock concentrado na classe A (a última linha A do Pareto tem a % acumulada da classe). */
export function classAShare(rows: ParetoRow[]): number | null {
  const a = rows.filter((r) => r.class === 'A');
  return a.length === 0 ? null : a[a.length - 1].cumPct;
}

/**
 * Topo do "Pulso do hospital": os 5 KPI mínimos do enunciado e os que a administração mais quer
 * (folga, rutura prevista, capital em excesso), lidos de uma vez. 1.ª linha = risco de rutura (P1),
 * 2.ª linha = capital (P2) e reposição (P5). Um KPI sem resposta da API mostra "n/d", nunca zero.
 */
export function KpiStripView({ data, error }: { data: KpiStripData; error?: string }) {
  if (error) return <p role="alert" data-testid="kpi-strip-invalid-filter">Filtro inválido: {error}</p>;
  const { autonomy, slack, shortage, belowMinimum: below, excess, idle, abc, rotation, leadTime } = data;
  const counts = abc ? classCounts(abc) : null;
  const share = abc ? classAShare(abc) : null;
  const without = Math.max(
    autonomy?.itemsWithoutData ?? 0,
    below?.itemsWithoutData ?? 0,
    excess?.itemsWithoutData ?? 0,
    rotation?.itemsWithoutData ?? 0,
  );
  const na = 'API indisponível';
  return (
    <section aria-label="Indicadores principais" data-testid="kpi-strip">
      <div className="kpi-strip">
        <KpiCardWithInfo
          kpiId="autonomy"
          label="Autonomia (mediana)"
          value={fmt(autonomy?.median)}
          unit="dias"
          status={autonomy ? (autonomy.status ?? 'ok') : undefined}
          hint={autonomy ? `Stock ÷ consumo diário${autonomy.noConsumption > 0 ? ` · ${autonomy.noConsumption} sem consumo` : ''}` : na}
        />
        <KpiCardWithInfo
          kpiId="slack-days"
          label="Dias de folga (mediana)"
          value={fmt(slack?.median)}
          unit="dias"
          status={slack ? (slack.status ?? 'ok') : undefined}
          hint={slack ? 'Autonomia − tempo de reposição' : na}
        />
        <KpiCardWithInfo
          kpiId="shortage-rate"
          label="Rutura prevista"
          value={fmt(shortage?.pct)}
          unit="%"
          status={shortage?.status}
          hint={shortage ? `${shortage.count} de ${shortage.n} artigos com folga negativa` : na}
        />
        <KpiCardWithInfo
          kpiId="below-minimum"
          label="Abaixo do mínimo"
          value={fmt(below?.pct)}
          unit="%"
          status={below ? belowMinimumStatus(below.pct) : undefined}
          hint={below ? `${below.count} de ${below.eligible} artigos elegíveis · ${below.excluded} excluídos` : na}
        />
        <KpiCardWithInfo
          kpiId="excess-capital"
          label="Capital em excesso"
          value={fmt(excess?.pct)}
          unit="% do stock"
          status={excess?.status}
          hint={
            excess
              ? `${fmtEur(excess.valueEur)} em ${plural(excess.itemsAbove, 'artigo', 'artigos')} acima do máximo${idle ? ` · parado (> ${idle.days} d): ${fmtEur(idle.valueEur)}` : ''}`
              : na
          }
        />
        <KpiCardWithInfo
          kpiId="abc"
          label="Classe A (ABC)"
          value={counts ? String(counts.A) : 'n/d'}
          unit={abc ? `de ${abc.length} artigos` : undefined}
          hint={counts && share !== null ? `${fmt(share)} % do valor de stock · B ${counts.B} · C ${counts.C}` : abc ? 'Sem artigos de classe A' : na}
        />
        <KpiCardWithInfo
          kpiId="rotation"
          label="Rotação do stock"
          value={fmt(rotation?.annualizedRotation, 2)}
          unit="× por ano"
          hint={rotation ? `${fmt(rotation.rotation, 2)} × em ${rotation.periodDays} dias (aproximação)` : na}
        />
        <KpiCardWithInfo
          kpiId="lead-time"
          label="Tempo médio de reposição"
          value={fmt(leadTime?.mean)}
          unit="dias"
          hint={leadTime ? `Desvio-padrão ${fmt(leadTime.stdDev)} d · ${leadTime.observations} observações` : na}
        />
      </div>
      {without > 0 && (
        <p data-testid="items-without-data">{plural(without, 'artigo', 'artigos')} sem dados no período (fora dos KPI, nunca contados como zero)</p>
      )}
    </section>
  );
}
