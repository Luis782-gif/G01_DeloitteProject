import { PageTiles } from '../layout/PageTiles';
import { parseFilterState } from '../filters/filters';
import { InsightSection } from '../insights/InsightSection';
import { AutonomySection } from '../kpis/AutonomySection';
import { BelowMinimumSection } from '../kpis/BelowMinimumSection';
import { ExcessCardsSection } from '../kpis/ExcessSections';
import { LeadTimeSection } from '../kpis/LeadTimeSection';
import { RotationSection } from '../kpis/RotationSection';
import { TriageSection } from '../kpis/TriageSection';
import { TrendSection } from '../kpis/TrendSection';

/** Os filtros vêm do URL; todos os visuais da página recebem o mesmo estado. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseFilterState(await searchParams);
  return (
    <>
      <h1>Pulso do hospital</h1>
      <PageTiles
        page="pulso"
        nodes={{
          'insights': <InsightSection page="pulso" filters={filters} />,
          'autonomia': <AutonomySection filters={filters} />,
          'abaixo-do-minimo': <BelowMinimumSection filters={filters} />,
          'triagem': <TriageSection filters={filters} />,
          'rotacao': <RotationSection filters={filters} />,
          'excesso': <ExcessCardsSection filters={filters} />,
          'prazo-entrega': <LeadTimeSection filters={filters} />,
          'tendencia': <TrendSection filters={filters} />,
        }}
      />
    </>
  );
}
