import { PageTiles } from '../../layout/PageTiles';
import { parseFilterState } from '../../filters/filters';
import { InsightSection } from '../../insights/InsightSection';
import { AbcParetoSection } from '../../kpis/AbcParetoSection';
import { CalendarSection } from '../../kpis/CalendarSection';
import { ExcessBarsSection } from '../../kpis/ExcessSections';
import { ScatterSection } from '../../kpis/ScatterSection';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseFilterState(await searchParams);
  return (
    <>
      <h1>Onde dói</h1>
      <PageTiles
        page="onde-doi"
        nodes={{
          'insights': <InsightSection page="onde-doi" filters={filters} />,
          'dispersao': <ScatterSection filters={filters} />,
          'pareto-abc': <AbcParetoSection filters={filters} />,
          'excesso-barras': <ExcessBarsSection filters={filters} />,
          'calendario': <CalendarSection filters={filters} />,
        }}
      />
    </>
  );
}
