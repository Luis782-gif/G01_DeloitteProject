import { parseFilterState } from '../../filters/filters';
import { InsightSection } from '../../insights/InsightSection';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseFilterState(await searchParams);
  return (
    <>
      <h1>Receita</h1>
      <InsightSection page="receita" filters={filters} />
    </>
  );
}
