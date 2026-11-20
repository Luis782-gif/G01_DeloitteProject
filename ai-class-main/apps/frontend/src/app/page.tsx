import { parseFilterState } from '../filters/filters';
import { AutonomySection } from '../kpis/AutonomySection';
import { BelowMinimumSection } from '../kpis/BelowMinimumSection';
import { ExcessCardsSection } from '../kpis/ExcessSections';
import { LeadTimeSection } from '../kpis/LeadTimeSection';
import { RotationSection } from '../kpis/RotationSection';
import { TrendSection } from '../kpis/TrendSection';

/** Os filtros vêm do URL; todos os visuais da página recebem o mesmo estado. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseFilterState(await searchParams);
  return (
    <>
      <h1>Pulso do hospital</h1>
      <AutonomySection filters={filters} />
      <BelowMinimumSection filters={filters} />
      <RotationSection filters={filters} />
      <ExcessCardsSection filters={filters} />
      <LeadTimeSection filters={filters} />
      <TrendSection filters={filters} />
    </>
  );
}
