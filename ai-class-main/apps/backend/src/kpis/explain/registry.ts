import type { ExplainEntry } from './explain-entry';
import autonomy from './entries/autonomy';
import excessCapital from './entries/excess-capital';
import idleStock from './entries/idle-stock';
import shortageRate from './entries/shortage-rate';
import slackDays from './entries/slack-days';

/** Uma linha por entrada: importar o ficheiro de `entries/` e acrescentá-lo à lista. */
const ENTRIES: ExplainEntry[] = [
  autonomy,
  slackDays,
  shortageRate,
  excessCapital,
  idleStock,
];

const BY_ID = new Map(ENTRIES.map((e) => [e.id, e]));

export const getExplainEntry = (id: string): ExplainEntry | undefined => BY_ID.get(id);
export const explainEntries = (): ExplainEntry[] => [...ENTRIES];
