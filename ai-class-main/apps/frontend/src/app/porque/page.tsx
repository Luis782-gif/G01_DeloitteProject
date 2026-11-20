import { parseFilterState } from '../../filters/filters';
import { InsightSection } from '../../insights/InsightSection';
import { VendorsSection } from '../../kpis/VendorsSection';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseFilterState(await searchParams);
  return (
    <>
      <h1>Porquê</h1>
      <InsightSection page="porque" filters={filters} />
      <VendorsSection filters={filters} />
    </>
  );
}
