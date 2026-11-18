'use client';

import { useEffect, useState } from 'react';
import { readMode, saveMode } from '../theme/mode';
import { MODES, type ModeId } from '../theme/tokens';

/** Alternador "Consulta" / "Bloco operatório"; a escolha persiste em localStorage. */
export function ModeToggle() {
  const [mode, setMode] = useState<ModeId>('consulta');

  useEffect(() => {
    setMode(readMode(window.localStorage));
  }, []);

  const choose = (next: ModeId) => {
    setMode(next);
    document.documentElement.dataset.mode = next;
    saveMode(window.localStorage, next);
  };

  return (
    <div role="group" aria-label="Modo visual" className="mode-toggle">
      {(Object.keys(MODES) as ModeId[]).map((id) => (
        <button key={id} type="button" aria-pressed={mode === id} onClick={() => choose(id)}>
          {MODES[id].label}
        </button>
      ))}
    </div>
  );
}
