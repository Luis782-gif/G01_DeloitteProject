import { PageTiles } from '../layout/PageTiles';
import { parseFilterState } from '../filters/filters';
import { InsightSection } from '../insights/InsightSection';
import { BelowMinimumSection } from '../kpis/BelowMinimumSection';
import { KpiStripSection } from '../kpis/KpiStripSection';
import { LeadTimeSection } from '../kpis/LeadTimeSection';
import { RotationSection } from '../kpis/RotationSection';
import { TriageSection } from '../kpis/TriageSection';
import { TrendSection } from '../kpis/TrendSection';
import { PageHead } from './PageHead';

/**
 * Pulso do hospital: o diagnóstico num relance. Topo = frase-insight + KPI; meio = tendência e triagem;
 * fim = listas acionáveis. Os filtros vêm do URL; todos os visuais da página recebem o mesmo estado.
 */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseFilterState(await searchParams);
  return (
    <>
      <PageHead href="/">
        <h1>Pulso do hospital</h1>
      </PageHead>
      <PageTiles
        page="pulso"
        nodes={{
          'insights': <InsightSection page="pulso" filters={filters} />,
          'kpis': <KpiStripSection filters={filters} />,
          'tendencia': <TrendSection filters={filters} />,
          'triagem': <TriageSection filters={filters} part="chart" />,
          'urgentes': <TriageSection filters={filters} part="table" />,
          'abaixo-do-minimo': <BelowMinimumSection filters={filters} showCard={false} />,
          'prazo-entrega': <LeadTimeSection filters={filters} showCard={false} />,
          'rotacao': <RotationSection filters={filters} showCard={false} />,
        }}
      />
    </>
  );
}
