import type { ExplainEntry } from './explain-entry';
import abc from './entries/abc';
import beforeAfter from './entries/before-after';
import calendar from './entries/calendar';
import autonomy from './entries/autonomy';
import excessCapital from './entries/excess-capital';
import idleStock from './entries/idle-stock';
import rotation from './entries/rotation';
import leadTime from './entries/lead-time';
import shortageRate from './entries/shortage-rate';
import slackDays from './entries/slack-days';
import vendorRisk from './entries/vendor-risk';
import promisedVsReal from './entries/promised-vs-real';
import triage from './entries/triage';
import safetyStock from './entries/safety-stock';
import reorderPoint from './entries/reorder-point';
import reorderSuggestion from './entries/reorder-suggestion';
import simulator from './entries/simulator';

/** Uma linha por entrada: importar o ficheiro de `entries/` e acrescentá-lo à lista. */
const ENTRIES: ExplainEntry[] = [
  autonomy,
  slackDays,
  shortageRate,
  abc,
  excessCapital,
  idleStock,
  rotation,
  leadTime,
  vendorRisk,
  promisedVsReal,
  triage,
  safetyStock,
  reorderPoint,
  reorderSuggestion,
  simulator,
  calendar,
  beforeAfter,
];

const BY_ID = new Map(ENTRIES.map((e) => [e.id, e]));

export const getExplainEntry = (id: string): ExplainEntry | undefined => BY_ID.get(id);
export const explainEntries = (): ExplainEntry[] => [...ENTRIES];
