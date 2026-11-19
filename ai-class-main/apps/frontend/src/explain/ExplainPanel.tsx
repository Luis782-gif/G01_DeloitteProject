'use client';
import { useEffect, useState } from 'react';

/** Conteúdo do painel "Como é calculado" (vem de GET /api/kpis/:id/explain). */
export interface ExplainEntry {
  id: string;
  title: string;
  formula: string;
  source: string;
  columns: string[];
  unit: string;
  approximation: string;
  limitations: string[];
}

/** Apresentação pura (testável sem browser). `entry` nulo e sem `error` = a carregar. */
export function ExplainView({ entry, error, onClose }: { entry: ExplainEntry | null; error?: string; onClose?: () => void }) {
  return (
    <aside role="dialog" aria-label="Como é calculado" data-testid="explain-panel" className="explain-panel">
      <header>
        <h4>Como é calculado{entry ? `: ${entry.title}` : ''}</h4>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Fechar">
            Fechar
          </button>
        )}
      </header>
      {error ? (
        <p role="alert">{error}</p>
      ) : !entry ? (
        <p>A carregar...</p>
      ) : (
        <dl>
          <dt>Fórmula</dt>
          <dd>{entry.formula}</dd>
          <dt>Fonte na aula</dt>
          <dd>{entry.source}</dd>
          <dt>Colunas usadas</dt>
          <dd>{entry.columns.join(', ')}</dd>
          <dt>Unidade</dt>
          <dd>{entry.unit}</dd>
          <dt>Aproximação</dt>
          <dd>{entry.approximation}</dd>
          <dt>Limitações</dt>
          <dd>
            <ul>
              {entry.limitations.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </dd>
        </dl>
      )}
    </aside>
  );
}

/** Obtém a entrada à API (via proxy /api/*) e mostra-a. */
export function ExplainPanel({ kpiId, onClose }: { kpiId: string; onClose?: () => void }) {
  const [entry, setEntry] = useState<ExplainEntry | null>(null);
  const [error, setError] = useState<string>();
  useEffect(() => {
    let cancelled = false;
    setEntry(null);
    setError(undefined);
    fetch(`/api/kpis/${encodeURIComponent(kpiId)}/explain`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (cancelled) return;
        if (res.ok) setEntry(body as ExplainEntry);
        else setError((body as { error?: string }).error ?? 'Não foi possível obter a explicação.');
      })
      .catch(() => !cancelled && setError('Não foi possível obter a explicação (a API não respondeu).'));
    return () => {
      cancelled = true;
    };
  }, [kpiId]);
  return <ExplainView entry={entry} error={error} onClose={onClose} />;
}
