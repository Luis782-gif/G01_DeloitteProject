import { PageTiles } from '../../layout/PageTiles';
import { parseFilterState } from '../../filters/filters';
import { InsightSection } from '../../insights/InsightSection';
import { BeforeAfterSection } from '../../kpis/BeforeAfterSection';
import { ReorderSection } from '../../kpis/ReorderSection';
import { SimulatorSection } from '../../kpis/SimulatorSection';

/** Cada bloco da Receita é uma secção independente (um componente por bloco): acrescentar uma linha por bloco novo. */
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseFilterState(await searchParams);
  return (
    <>
      <h1>Receita</h1>
      <PageTiles
        page="receita"
        nodes={{
          'insights': <InsightSection page="receita" filters={filters} />,
          'reposicao': <ReorderSection filters={filters} />,
          'antes-depois': <BeforeAfterSection filters={filters} />,
          'simulador': <SimulatorSection filters={filters} />,
        }}
      />
    </>
  );
}
