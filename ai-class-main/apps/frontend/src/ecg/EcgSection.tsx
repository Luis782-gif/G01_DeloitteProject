import { fetchWithFilters } from '../filters/api';
import { EcgView } from './EcgView';
import { level5Count } from './ecg';

/** Cabeçalho ECG no layout (partilhado por todas as páginas): usa a distribuição sem filtros do URL. */
export async function EcgSection() {
  const r = await fetchWithFilters<{ level: number; count: number }[]>('/api/triage/distribution', {});
  return <EcgView count={r.ok ? level5Count(r.data) : null} />;
}
