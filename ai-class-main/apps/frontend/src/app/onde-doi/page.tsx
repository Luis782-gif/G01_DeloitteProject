import { parseFilterState } from '../../filters/filters';
import { ScatterSection } from '../../kpis/ScatterSection';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseFilterState(await searchParams);
  return (
    <>
      <h1>Onde dói</h1>
      <ScatterSection filters={filters} />
    </>
  );
}
