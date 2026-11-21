import { fetchWithFilters } from '../filters/api';
import type { FilterState } from '../filters/filters';
import { TriageView, type TriagePart } from './TriageView';
import type { TriageBucket, TriageItems } from './triage';

export async function TriageSection({ filters, part = 'all' }: { filters: FilterState; part?: TriagePart }) {
  const [d, i] = await Promise.all([
    fetchWithFilters<TriageBucket[]>('/api/triage/distribution', filters),
    fetchWithFilters<TriageItems>('/api/triage/items', filters),
  ]);
  const error = !d.ok ? d.message : !i.ok ? i.message : null;
  return <TriageView distribution={d.ok ? d.data : null} items={i.ok ? i.data : null} error={error ?? undefined} part={part} />;
}
