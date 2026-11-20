import { DEFAULT_MODE, MODES, type ModeId } from './tokens';

export const MODE_STORAGE_KEY = 'modo-visual';

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function isMode(v: unknown): v is ModeId {
  return typeof v === 'string' && Object.prototype.hasOwnProperty.call(MODES, v);
}

export function readMode(storage: Pick<StorageLike, 'getItem'>): ModeId {
  try {
    const v = storage.getItem(MODE_STORAGE_KEY);
    return isMode(v) ? v : DEFAULT_MODE;
  } catch {
    return DEFAULT_MODE;
  }
}

export function saveMode(storage: Pick<StorageLike, 'setItem'>, mode: ModeId): void {
  try {
    storage.setItem(MODE_STORAGE_KEY, mode);
  } catch {
    /* armazenamento indisponível: a escolha vale só para esta sessão */
  }
}

/** Script inline (corre antes da pintura) que aplica o modo guardado ao <html>. */
export function initModeScript(): string {
  const valid = JSON.stringify(Object.keys(MODES));
  return `(function(){var m=${JSON.stringify(DEFAULT_MODE)};try{var v=localStorage.getItem(${JSON.stringify(MODE_STORAGE_KEY)});if(${valid}.indexOf(v)>-1)m=v;}catch(e){}document.documentElement.dataset.mode=m;})();`;
}
