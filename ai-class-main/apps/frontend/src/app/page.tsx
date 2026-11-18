import { parseFilterState } from '../filters/filters';
import { BelowMinimumSection } from '../kpis/BelowMinimumSection';

/** Os filtros vêm do URL; todos os visuais da página recebem o mesmo estado. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseFilterState(await searchParams);
  return (
    <>
      <h1>Pulso do hospital</h1>
      <BelowMinimumSection filters={filters} />
    </>
  );
}
