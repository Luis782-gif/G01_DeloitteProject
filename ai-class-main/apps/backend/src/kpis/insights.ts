/**
 * Templates determinísticos das frases-insight (spec 6.3). Funções puras: recebem números já consultados
 * ao servidor (ou null quando faltam) e omitem a cláusula em falta em vez de a inventar.
 */
export interface Sentence {
  text: string;
  values: Record<string, number | string | boolean | null>;
}

const num = (n: number, maxDecimals = 1) => n.toLocaleString('pt-PT', { maximumFractionDigits: maxDecimals, useGrouping: true }).replace(/ | /g, ' ');

/** "236,6 M€" a partir de 1 M€; abaixo, euros inteiros ("12 345 €"). */
export const eur = (n: number) => (Math.abs(n) >= 1_000_000 ? `${num(n / 1_000_000, 1)} M€` : `${num(Math.round(n), 0)} €`);
export const pct = (n: number) => `${num(n, 1)} %`;

export interface ShortageInput { count: number; n: number }
export interface ExcessInput { valueEur: number; totalValueEur: number; pct: number }

export function pulsoSentences(shortage: ShortageInput | null, excess: ExcessInput | null): Sentence[] {
  const a = shortage && shortage.n > 0 ? shortage : null;
  const b = excess && excess.totalValueEur > 0 ? excess : null;
  if (!a && !b) return [];
  const values: Sentence['values'] = {};
  let text: string;
  if (a) {
    Object.assign(values, { nFolgaNeg: a.count, nArtigos: a.n });
    text = `${num(a.count, 0)} de ${num(a.n, 0)} artigos têm dias de folga negativos`;
  } else text = '';
  if (b) {
    Object.assign(values, { excessoEur: b.valueEur, excessoPct: b.pct });
    const clause = `o capital em excesso é ${eur(b.valueEur)} (${pct(b.pct)} do valor de stock)`;
    text = a ? `${text}; ${clause}` : clause.charAt(0).toUpperCase() + clause.slice(1);
  }
  return [{ text: `${text}.`, values }];
}

/** Hoje a triagem (nível 4-5) não existe: usa-se "classe A com folga negativa". */
export function ondeDoiSentences(classACount: number | null): Sentence[] {
  if (!classACount) return [];
  const text = classACount === 1 ? '1 artigo de classe A tem dias de folga negativos.' : `${num(classACount, 0)} artigos de classe A têm dias de folga negativos.`;
  return [{ text, values: { nClasseAFolgaNeg: classACount } }];
}

export function vendorsSentences(means: number[], verdict: { distinguishes: boolean; text: string }): Sentence[] {
  if (means.length === 0) return [];
  const out: Sentence[] = [];
  if (means.length >= 2) {
    const min = Math.min(...means);
    const max = Math.max(...means);
    out.push({ text: `O tempo médio de reposição varia entre ${num(min, 2)} e ${num(max, 2)} dias entre fornecedores.`, values: { min, max } });
  }
  out.push({ text: verdict.text, values: {} });
  return out;
}

/** Receita (página de uma onda posterior): só dados existentes, sem prometer funcionalidades. */
export function receitaSentences(negCount: number | null): Sentence[] {
  if (!negCount) return [];
  const text = negCount === 1
    ? '1 artigo tem dias de folga negativos: o stock não chega para o tempo de reposição.'
    : `${num(negCount, 0)} artigos têm dias de folga negativos: o stock não chega para o tempo de reposição.`;
  return [{ text, values: { nFolgaNeg: negCount } }];
}
