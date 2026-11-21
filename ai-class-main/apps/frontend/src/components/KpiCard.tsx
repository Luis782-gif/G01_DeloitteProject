import type { Status } from '../theme/tokens';
import { StatusIndicator } from './StatusIndicator';

export interface KpiCardProps {
  label: string;
  value: string;
  unit?: string;
  /** Sem alvo (KPI só de comparação): omitir o estado. */
  status?: Status;
  /** Linha de contexto por baixo do valor (ex.: "2 de 47 artigos"). */
  hint?: string;
  /** Abrirá o painel "Como é calculado" (ainda sem conteúdo). */
  onInfo?: () => void;
}

export function KpiCard({ label, value, unit, status, hint, onInfo }: KpiCardProps) {
  return (
    <article className="kpi-card" data-status={status} aria-label={label}>
      <header>
        <h3>{label}</h3>
        <button type="button" aria-label={`Como é calculado: ${label}`} onClick={onInfo}>
          <span aria-hidden="true">(i)</span>
        </button>
      </header>
      <p>
        <span className="kpi-value">{value}</span>
        {unit && <span className="kpi-unit">{unit}</span>}
      </p>
      {hint && <p className="kpi-hint">{hint}</p>}
      {status && <StatusIndicator status={status} />}
    </article>
  );
}
