import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { canSearch, isOpenShortcut, keyAction, moveActive, resultHref, searchApiPath } from './search';
import { SearchDialog } from './SearchDialog';

test('Ctrl+K e Cmd+K abrem; K sozinho ou Alt não', () => {
  assert.equal(isOpenShortcut({ key: 'k', ctrlKey: true }), true);
  assert.equal(isOpenShortcut({ key: 'K', metaKey: true }), true);
  assert.equal(isOpenShortcut({ key: 'k' }), false);
  assert.equal(isOpenShortcut({ key: 'k', ctrlKey: true, altKey: true }), false);
  assert.equal(isOpenShortcut({ key: 'j', ctrlKey: true }), false);
});

test('setas movem o índice ativo com volta; sem resultados => -1', () => {
  assert.equal(moveActive(0, 3, 'ArrowDown'), 1);
  assert.equal(moveActive(2, 3, 'ArrowDown'), 0);
  assert.equal(moveActive(0, 3, 'ArrowUp'), 2);
  assert.equal(moveActive(-1, 3, 'ArrowUp'), 2);
  assert.equal(moveActive(-1, 3, 'ArrowDown'), 0);
  assert.equal(moveActive(0, 0, 'ArrowDown'), -1);
});

test('Enter escolhe o índice ativo; Esc fecha; Enter sem seleção não faz nada', () => {
  assert.deepEqual(keyAction('Enter', 1, 3), { type: 'choose', index: 1 });
  assert.deepEqual(keyAction('Enter', -1, 3), { type: 'none' });
  assert.deepEqual(keyAction('Enter', 0, 0), { type: 'none' });
  assert.deepEqual(keyAction('Escape', 0, 3), { type: 'close' });
  assert.deepEqual(keyAction('ArrowDown', 2, 3), { type: 'move', index: 0 });
  assert.deepEqual(keyAction('a', 0, 3), { type: 'none' });
});

test('só pesquisa com 2+ caracteres; o caminho da API é codificado', () => {
  assert.equal(canSearch('x'), false);
  assert.equal(canSearch(' x '), false);
  assert.equal(canSearch('xr'), true);
  assert.equal(searchApiPath(' x-ray & co '), '/api/search?q=x-ray%20%26%20co');
});

test('resultHref abre o detalhe preservando os filtros', () => {
  assert.equal(resultHref('periodo=2025-Q3&tipo=Equipment', { kind: 'artigo', ref: '108:xray-machine' }), '?periodo=2025-Q3&tipo=Equipment&detalhe=artigo:108:xray-machine');
  assert.equal(resultHref('', { kind: 'fornecedor', ref: 'V002' }), '?detalhe=fornecedor:V002');
});

const noop = () => {};
const results = [
  { kind: 'artigo' as const, ref: '108:xray-machine', label: 'X-ray Machine', detail: 'Código 108' },
  { kind: 'fornecedor' as const, ref: 'V002', label: 'EquipMed Co.', detail: 'V002 · Ventilator' },
];

test('diálogo: ARIA modal, campo rotulado, combobox com aria-activedescendant e opções', () => {
  const html = renderToStaticMarkup(
    <SearchDialog query="x" results={results} activeIndex={1} status="done" onQueryChange={noop} onKeyDown={noop} onChoose={noop} onClose={noop} />,
  );
  assert.match(html, /role="dialog"/);
  assert.match(html, /aria-modal="true"/);
  assert.match(html, /<label for="global-search-input"/);
  assert.match(html, /role="combobox"/);
  assert.match(html, /aria-activedescendant="global-search-option-1"/);
  assert.match(html, /role="listbox"/);
  assert.match(html, /id="global-search-option-0"[^>]*role="option"[^>]*aria-selected="false"/);
  assert.match(html, /id="global-search-option-1"[^>]*role="option"[^>]*aria-selected="true"/);
});

test('diálogo: mensagem "Sem resultados." quando não há correspondências, sem activedescendant', () => {
  const html = renderToStaticMarkup(
    <SearchDialog query="zzzz" results={[]} activeIndex={-1} status="done" onQueryChange={noop} onKeyDown={noop} onChoose={noop} onClose={noop} />,
  );
  assert.match(html, /role="status"[^>]*>Sem resultados\./);
  assert.doesNotMatch(html, /aria-activedescendant/);
});
