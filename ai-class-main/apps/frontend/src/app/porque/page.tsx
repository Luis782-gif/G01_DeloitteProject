import { PageHead } from '../PageHead';
import { PageTiles } from '../../layout/PageTiles';
import { parseFilterState } from '../../filters/filters';
import { InsightSection } from '../../insights/InsightSection';
import { VendorsSection } from '../../kpis/VendorsSection';

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const filters = parseFilterState(await searchParams);
  return (
    <>
      <PageHead href="/porque">
        <h1>Porquê</h1>
      </PageHead>
      <PageTiles
        page="porque"
        nodes={{
          'insights': <InsightSection page="porque" filters={filters} />,
          'fornecedores': <VendorsSection filters={filters} />,
        }}
      />
    </>
  );
}
