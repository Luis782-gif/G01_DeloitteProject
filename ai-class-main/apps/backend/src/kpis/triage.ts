/** Níveis de serviço por classe ABC (spec 6.2 K8) e conversão para Z. */
export interface ServiceLevels {
  A: number;
  B: number;
  C: number;
}

/** Em %, por classe: A 99, B 97,5, C 95. Editáveis na API entre 95 e 99. */
export const DEFAULT_SERVICE_LEVELS: ServiceLevels = { A: 99, B: 97.5, C: 95 };

/** Z da aula (slides 58-61, 70) para os níveis de serviço usuais; os restantes arredondam a 2 casas. */
const KNOWN_Z: Record<number, number> = { 99: 2.33, 97.5: 1.96, 95: 1.645 };

/** Inverso da normal padrão (Acklam), precisão ~1e-9. */
function normInv(p: number): number {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const lo = 0.02425;
  if (p < lo) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - lo) return -normInv(1 - p);
  const q = p - 0.5;
  const r = q * q;
  return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

/** Z para um nível de serviço em % (ex.: 98 -> 2,05). */
export function zForService(percent: number): number {
  return KNOWN_Z[percent] ?? Math.round(normInv(percent / 100) * 100) / 100;
}

/** Entrada da regra de triagem para um artigo no snapshot de referência. */
export interface TriageInput {
  stock: number;
  usage: number;
  /** Tempo de reposição (dias). */
  lt: number;
  /** Desvio-padrão do consumo diário (null = sem histórico). */
  sigma: number | null;
  /** Z da classe ABC do artigo. */
  z: number;
  class: 'A' | 'B' | 'C';
  minRequired: number;
  /** R11: mínimo > máximo (a regra do mínimo não se aplica). */
  minAboveMax: boolean;
}

export interface TriageOutcome {
  /** Stock de segurança (null sem consumo). */
  ss: number | null;
  /** Ponto de encomenda (null sem consumo). */
  pe: number | null;
  level: 1 | 2 | 3 | 4 | 5;
}

/** Arredonda a 9 casas antes do teto, como a CTE SQL (evita 17,0000000001 -> 18). */
const round9 = (n: number) => Math.round(n * 1e9) / 1e9;

/**
 * K8, K9, K10 numa função pura (a CTE `triage` do SQL é a fonte de verdade para os filtros; os testes garantem que dão o mesmo):
 * SS = ceil(σ · Z · √LT); PE = consumo · LT + SS; nível = 1 + (0 se stock ≥ PE; 2 se ≥ consumo·LT; senão 3) + 1 se classe A;
 * abaixo do mínimo (e sem R11) sobe a pelo menos 4. Sem consumo: sem SS nem PE, nível 1 (ou 4 pela regra do mínimo).
 */
export function evaluateTriage(i: TriageInput): TriageOutcome {
  const noUsage = i.usage === 0;
  const ss = noUsage ? null : Math.ceil(round9((i.sigma ?? 0) * i.z * Math.sqrt(Math.max(i.lt, 0))));
  const pe = ss === null ? null : i.usage * i.lt + ss;
  let base = 1;
  if (pe !== null) base = 1 + (i.stock >= pe ? 0 : i.stock >= i.usage * i.lt ? 2 : 3) + (i.class === 'A' ? 1 : 0);
  const level = !i.minAboveMax && i.stock < i.minRequired ? Math.max(base, 4) : base;
  return { ss, pe, level: level as TriageOutcome['level'] };
}

export interface Scenario {
  /** Dias a somar ao tempo de reposição (só a artigos com tempo de reposição válido, > 0). */
  leadTimeDeltaDays: number;
  /** Só os artigos deste fornecedor (null = todos). */
  vendorId: string | null;
  /** Aumento do consumo, em % (σ escala na mesma proporção). */
  usageDeltaPct: number;
}

/** Aplica o cenário a um artigo (consumo constante, sem previsão): folga (K6) e triagem resultantes. */
export function simulateItem(i: TriageInput & { vendorId: string }, s: Scenario): { slack: number | null; outcome: TriageOutcome } {
  const factor = 1 + s.usageDeltaPct / 100;
  const affected = s.vendorId === null || s.vendorId === i.vendorId;
  const lt = affected && i.lt > 0 ? i.lt + s.leadTimeDeltaDays : i.lt;
  const usage = i.usage * factor;
  const sim = { ...i, usage, sigma: i.sigma === null ? null : i.sigma * factor, lt };
  const autonomy = usage > 0 ? i.stock / usage : null;
  return { slack: autonomy === null || lt <= 0 ? null : autonomy - lt, outcome: evaluateTriage(sim) };
}
