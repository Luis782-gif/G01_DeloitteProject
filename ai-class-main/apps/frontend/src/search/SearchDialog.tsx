import { optionId, type SearchResult } from './search';

export type SearchStatus = 'idle' | 'loading' | 'done' | 'error';

const overlay = {
  position: 'fixed', inset: 0, zIndex: 30, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', paddingTop: '12vh',
  background: 'rgba(0,0,0,.5)',
} as const;
const box = {
  width: 'min(560px, 94vw)', maxHeight: '70vh', overflowY: 'auto', padding: 16, borderRadius: 8,
  background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)',
} as const;

/** Apresentação pura do diálogo de pesquisa (os eventos de teclado vêm do contentor). */
export function SearchDialog({
  query, results, activeIndex, status, onQueryChange, onKeyDown, onChoose, onClose,
}: {
  query: string;
  results: SearchResult[];
  activeIndex: number;
  status: SearchStatus;
  onQueryChange: (q: string) => void;
  onKeyDown: (e: { key: string; preventDefault: () => void; stopPropagation?: () => void }) => void;
  onChoose: (r: SearchResult) => void;
  onClose: () => void;
}) {
  const showList = results.length > 0;
  return (
    <div style={overlay} data-testid="search-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Pesquisa global" style={box}>
        <label htmlFor="global-search-input" style={{ display: 'block', fontWeight: 600 }}>
          Pesquisar artigo ou fornecedor
        </label>
        <input
          id="global-search-input"
          type="search"
          role="combobox"
          autoComplete="off"
          aria-expanded={showList}
          aria-controls="global-search-list"
          aria-autocomplete="list"
          aria-activedescendant={showList && activeIndex >= 0 ? optionId(activeIndex) : undefined}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Nome ou código do artigo, nome ou id do fornecedor"
          style={{ width: '100%', boxSizing: 'border-box', margin: '8px 0', padding: 8, font: 'inherit', color: 'var(--text)', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 6 }}
        />
        <ul id="global-search-list" role="listbox" aria-label="Resultados" style={{ listStyle: 'none', margin: 0, padding: 0 }} hidden={!showList}>
          {results.map((r, i) => (
            <li
              key={`${r.kind}:${r.ref}`}
              id={optionId(i)}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                onChoose(r);
              }}
              style={{
                padding: '6px 8px', cursor: 'pointer', borderRadius: 4,
                background: i === activeIndex ? 'var(--text)' : 'transparent', color: i === activeIndex ? 'var(--bg)' : 'var(--text)',
              }}
            >
              <strong>{r.label}</strong> <small>({r.kind === 'artigo' ? 'Artigo' : 'Fornecedor'} · {r.detail})</small>
            </li>
          ))}
        </ul>
        <p role="status" data-testid="search-status" style={{ margin: '8px 0 0', color: 'var(--text-muted)' }}>
          {status === 'error'
            ? 'Não foi possível pesquisar (a API não respondeu).'
            : status === 'loading'
              ? 'A pesquisar...'
              : status === 'done' && results.length === 0
                ? 'Sem resultados.'
                : status === 'done'
                  ? `${results.length} resultado${results.length === 1 ? '' : 's'}. Use as setas e Enter.`
                  : 'Escreva pelo menos 2 caracteres. Esc fecha.'}
        </p>
      </div>
    </div>
  );
}
