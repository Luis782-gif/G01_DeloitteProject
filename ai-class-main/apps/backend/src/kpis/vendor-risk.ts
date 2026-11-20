/** Ranks ascendentes (1 = menor = melhor); empates recebem o rank médio (ex.: 2.º e 3.º empatados -> 2,5 e 2,5). */
export function averageRanks(values: number[]): number[] {
  const EPS = 1e-9;
  return values.map((v) => {
    const smaller = values.filter((o) => o < v - EPS).length;
    const equal = values.filter((o) => Math.abs(o - v) <= EPS).length;
    return smaller + (equal + 1) / 2;
  });
}

export interface RiskInput {
  mean: number;
  cv: number;
  pctAtRisk: number;
}

export interface VendorRisk {
  ranks: { mean: number; cv: number; atRisk: number };
  /** Média dos três ranks, pesos iguais (1 = melhor, N = pior). */
  index: number;
}

const round = (n: number, d: number) => Math.round(n * 10 ** d) / 10 ** d;

/** Índice de risco do fornecedor (K11): média dos ranks de tempo médio, CV e % de artigos em risco. */
export function riskIndex(inputs: RiskInput[]): VendorRisk[] {
  const rm = averageRanks(inputs.map((i) => i.mean));
  const rc = averageRanks(inputs.map((i) => i.cv));
  const rr = averageRanks(inputs.map((i) => i.pctAtRisk));
  return inputs.map((_, k) => ({
    ranks: { mean: rm[k], cv: rc[k], atRisk: rr[k] },
    index: round((rm[k] + rc[k] + rr[k]) / 3, 3),
  }));
}

export const DEFAULT_DISTINGUISH_DAYS = 1;

/** Frase de honestidade: nenhum fornecedor se distingue se (maior - menor tempo médio) < distinguishDays. */
export function distinguishVerdict(means: number[], distinguishDays: number) {
  if (means.length < 2) {
    return { distinguishes: false, maxDifferenceDays: null, text: 'Sem dados suficientes para comparar fornecedores.' };
  }
  const diff = round(Math.max(...means) - Math.min(...means), 2);
  const distinguishes = diff >= distinguishDays;
  const fmt = (n: number) => n.toLocaleString('pt-PT', { maximumFractionDigits: 2 });
  return {
    distinguishes,
    maxDifferenceDays: diff,
    text: distinguishes
      ? `Os fornecedores distinguem-se no tempo médio de reposição: a diferença entre o maior e o menor é de ${fmt(diff)} dias (limiar: ${fmt(distinguishDays)} dia(s)).`
      : `Nenhum fornecedor se distingue no tempo médio de reposição: a diferença entre o maior e o menor é de ${fmt(diff)} dias, abaixo de ${fmt(distinguishDays)} dia(s). Não se retira daqui uma conclusão forçada.`,
  };
}
