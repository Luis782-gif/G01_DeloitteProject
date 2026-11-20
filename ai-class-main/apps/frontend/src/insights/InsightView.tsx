export interface InsightSentence {
  text: string;
  values: Record<string, number | string | boolean | null>;
}

/** Frase-insight no topo da página; sem frases (sem dados ou API indisponível), não mostra nada. */
export function InsightView({ sentences }: { sentences: InsightSentence[] | null }) {
  if (!sentences || sentences.length === 0) return null;
  return (
    <p className="insight" data-testid="insight">
      {sentences.map((s) => s.text).join(' ')}
    </p>
  );
}
