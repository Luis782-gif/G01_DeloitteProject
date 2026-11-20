import { TONES } from '../theme/tokens';
import type { TriageLevel } from './triage';

function Pulse() {
  return (
    <svg data-icon="pulso" className="pulse-icon" aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12h5l3-8 4 16 3-8h5" />
    </svg>
  );
}

/**
 * Emblema do nível de triagem: o número está sempre visível; o tom (azul-petróleo) cresce com o nível;
 * nos níveis 4 e 5 acrescenta o ícone de pulso. Nunca depende só da cor.
 */
export function TriageBadge({ level }: { level: TriageLevel }) {
  return (
    <span
      data-testid="triage-badge"
      data-level={level}
      aria-label={`Nível de triagem ${level} de 5`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '1px 8px',
        borderRadius: 12,
        fontWeight: 700,
        background: TONES[level],
        color: level >= 4 ? TONES[1] : TONES[5],
        border: `${level >= 4 ? 3 : 1}px solid ${TONES[5]}`,
      }}
    >
      {level >= 4 && <Pulse />}
      {level}
    </span>
  );
}
