import type { Status } from '../theme/tokens';
import { StatusIndicator } from './StatusIndicator';

export interface KpiCardProps {
  label: string;
  value: string;
  unit?: string;
  /** Omitido nos KPI sem alvo (só comparação): sem indicador de estado. */
  status?: Status;
  /** Abrirá o painel "Como é calculado" (ainda sem conteúdo). */
  onInfo?: () => void;
}

export function KpiCard({ label, value, unit, status, onInfo }: KpiCardProps) {
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
      {status && <StatusIndicator status={status} />}
    </article>
  );
}
