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
