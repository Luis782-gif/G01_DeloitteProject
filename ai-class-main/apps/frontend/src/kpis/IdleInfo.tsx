'use client';
import { useState } from 'react';
import { ExplainPanel } from '../explain/ExplainPanel';

/** Botão (i) do stock parado (vista informativa, sem estado): abre o painel "Como é calculado". */
export function IdleInfo({ kpiId }: { kpiId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" aria-label="Como é calculado: Stock parado" onClick={() => setOpen((o) => !o)}>
        <span aria-hidden="true">(i)</span>
      </button>
      {open && <ExplainPanel kpiId={kpiId} onClose={() => setOpen(false)} />}
    </>
  );
}
