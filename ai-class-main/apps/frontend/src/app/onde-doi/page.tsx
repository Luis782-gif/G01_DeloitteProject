import { parseFilterState } from '../../filters/filters';
import { InsightSection } from '../../insights/InsightSection';
import { AbcParetoSection } from '../../kpis/AbcParetoSection';
import { ExcessBarsSection } from '../../kpis/ExcessSections';
import { ScatterSection } from '../../kpis/ScatterSection';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseFilterState(await searchParams);
  return (
    <>
      <h1>Onde dói</h1>
      <InsightSection page="onde-doi" filters={filters} />
      <ScatterSection filters={filters} />
      <AbcParetoSection filters={filters} />
      <ExcessBarsSection filters={filters} />
    </>
  );
}
