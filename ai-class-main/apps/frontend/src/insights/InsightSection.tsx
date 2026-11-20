import { fetchWithFilters } from '../filters/api';
import type { FilterState } from '../filters/filters';
import { InsightView, type InsightSentence } from './InsightView';

export type InsightPage = 'pulso' | 'onde-doi' | 'porque' | 'receita';

/** Frase gerada no servidor (GET /api/insights), recalculada com os filtros do URL. */
export async function InsightSection({ page, filters }: { page: InsightPage; filters: FilterState }) {
  const r = await fetchWithFilters<{ sentences: InsightSentence[] }>('/api/insights', filters, { page });
  return <InsightView sentences={r.ok ? r.data.sentences : null} />;
}
