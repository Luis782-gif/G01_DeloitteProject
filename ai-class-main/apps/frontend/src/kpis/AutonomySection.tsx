import { fetchWithFilters } from '../filters/api';
import type { FilterState } from '../filters/filters';
import { AutonomyView } from './AutonomyView';
import type { AutonomyKpi, ShortageKpi, SlackKpi } from './autonomy';

/** Cartões de autonomia, folga e rutura prevista (Pulso do hospital). */
export async function AutonomySection({ filters }: { filters: FilterState }) {
  const [a, s, r] = await Promise.all([
    fetchWithFilters<AutonomyKpi>('/api/kpis/autonomy', filters),
    fetchWithFilters<SlackKpi>('/api/kpis/slack-days', filters),
    fetchWithFilters<ShortageKpi>('/api/kpis/shortage-rate', filters),
  ]);
  const bad = [a, s, r].find((x) => !x.ok && x.message);
  return (
    <AutonomyView
      autonomy={a.ok ? a.data : null}
      slack={s.ok ? s.data : null}
      shortage={r.ok ? r.data : null}
      error={bad && !bad.ok ? (bad.message ?? undefined) : undefined}
    />
  );
}
