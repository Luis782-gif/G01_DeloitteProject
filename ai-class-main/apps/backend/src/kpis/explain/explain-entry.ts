/** Conteúdo do painel "Como é calculado" de um KPI (contrato partilhado por todos os KPI). */
export interface ExplainEntry {
  id: string;
  title: string;
  formula: string;
  /** Onde a fórmula aparece na aula / enunciado. */
  source: string;
  columns: string[];
  unit: string;
  approximation: string;
  limitations: string[];
}
