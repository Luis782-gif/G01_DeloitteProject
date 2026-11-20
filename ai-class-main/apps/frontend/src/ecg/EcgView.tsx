import type { CSSProperties } from 'react';
import { ecgCycleSeconds, ECG_REST_SECONDS } from './ecg';

// Dois períodos de 120 unidades; o deslocamento de -120 fecha o ciclo sem salto.
const period = (x: number) => `M${x} 12h30l4-3 4 3h8l3 3 4-14 4 20 3-9h8l4-3 4 3h44`;
const PATH = `${period(0)}${period(120)}`;

export function EcgView({ count }: { count: number | null }) {
  const cycle = count === null ? ECG_REST_SECONDS : ecgCycleSeconds(count);
  const text = count === null ? 'Nível 5: indisponível' : `${count} ${count === 1 ? 'artigo' : 'artigos'} em nível 5`;
  return (
    <div className="ecg" role="status" aria-label={text}>
      <span className="ecg-window" aria-hidden="true">
        <svg className="ecg-line" style={{ '--ecg-cycle': `${cycle}s` } as CSSProperties} aria-hidden="true" viewBox="0 0 240 24" focusable="false">
          <path d={PATH} />
        </svg>
      </span>
      <span className="ecg-text">{text}</span>
    </div>
  );
}
