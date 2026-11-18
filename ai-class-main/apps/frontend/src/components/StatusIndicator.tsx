import type { Status } from '../theme/tokens';

export const STATUS_LABELS: Record<Status, string> = {
  ok: 'OK',
  atencao: 'Atenção',
  critico: 'Crítico',
};

function Triangle() {
  return (
    <svg data-icon="triangulo" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinejoin="round">
      <path d="M12 3 22 20H2Z" />
      <path d="M12 10v4M12 17v.5" strokeLinecap="round" />
    </svg>
  );
}

function Pulse() {
  return (
    <svg data-icon="pulso" className="pulse-icon" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12h5l3-8 4 16 3-8h5" />
    </svg>
  );
}

/**
 * Estado OK / atenção / crítico, codificado por intensidade (cor da barra),
 * ícone e forma (a borda do cartão é definida por `data-status` no tema),
 * nunca só pela cor. O texto do estado é sempre visível.
 */
export function StatusIndicator({ status }: { status: Status }) {
  return (
    <div className="status-indicator" data-status={status}>
      <span className="status-bar" />
      <span className="status-label">
        {status === 'atencao' && <Triangle />}
        {status === 'critico' && <Pulse />}
        {STATUS_LABELS[status]}
      </span>
    </div>
  );
}
