import { fetchWithFilters, type ApiResult } from '../filters/api';
import type { FilterState } from '../filters/filters';
import type { ParetoRow } from './abc';
import type { AutonomyKpi, ShortageKpi, SlackKpi } from './autonomy';
import type { BelowMinimum } from './below-minimum';
import type { ExcessCapital, IdleStock } from './excess';
import { KpiStripView } from './KpiStripView';
import type { LeadTime } from './lead-time';
import type { Rotation } from './rotation';

const dataOf = <T,>(r: ApiResult<T>): T | null => (r.ok ? r.data : null);

/** Faixa de KPI do topo do "Pulso do hospital": todos os pedidos levam os mesmos filtros do URL. */
export async function KpiStripSection({ filters }: { filters: FilterState }) {
  const [autonomy, slack, shortage, below, excess, idle, abc, rotation, leadTime] = await Promise.all([
    fetchWithFilters<AutonomyKpi>('/api/kpis/autonomy', filters),
    fetchWithFilters<SlackKpi>('/api/kpis/slack-days', filters),
    fetchWithFilters<ShortageKpi>('/api/kpis/shortage-rate', filters),
    fetchWithFilters<BelowMinimum>('/api/kpis/below-minimum', filters),
    fetchWithFilters<ExcessCapital>('/api/kpis/excess-capital', filters),
    fetchWithFilters<IdleStock>('/api/kpis/idle-stock', filters),
    fetchWithFilters<ParetoRow[]>('/api/abc/pareto', filters),
    fetchWithFilters<Rotation>('/api/kpis/rotation', filters),
    fetchWithFilters<LeadTime>('/api/kpis/lead-time', filters),
  ]);
  const all = [autonomy, slack, shortage, below, excess, idle, abc, rotation, leadTime];
  const bad = all.find((r) => !r.ok && r.message);
  return (
    <KpiStripView
      error={bad && !bad.ok ? (bad.message ?? undefined) : undefined}
      data={{
        autonomy: dataOf(autonomy),
        slack: dataOf(slack),
        shortage: dataOf(shortage),
        belowMinimum: dataOf(below),
        excess: dataOf(excess),
        idle: dataOf(idle),
        abc: dataOf(abc),
        rotation: dataOf(rotation),
        leadTime: dataOf(leadTime),
      }}
    />
  );
}
