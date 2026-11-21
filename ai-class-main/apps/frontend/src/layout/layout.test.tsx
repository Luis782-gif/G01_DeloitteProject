import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  PAGE_TILES, defaultLayout, reconcile, moveTile, moveTileTo, resizeTile, parseProfile, DEFAULT_PROFILE, PROFILE_OPTIONS,
  MIN_W, MAX_W, MAX_H, mergePage, type TileLayout,
} from './model';
import { TileGridView } from './TileGridView';

const ids = (t: TileLayout[]) => t.map((x) => x.id);
const tile = (id: string, position: number, w = 12, h = 1): TileLayout => ({ id, position, w, h });

test('disposição por defeito: ordem da página, largura por defeito, posições 1..n', () => {
  const d = defaultLayout('porque');
  assert.deepEqual(ids(d), PAGE_TILES.porque.map((t) => t.id));
  assert.deepEqual(d.map((t) => t.position), [1, 2]);
  assert.ok(d.every((t) => t.w === 12 && t.h === 1));
  assert.deepEqual(ids(defaultLayout('pulso')), ['insights', 'kpis', 'tendencia', 'triagem', 'urgentes', 'abaixo-do-minimo', 'prazo-entrega', 'rotacao']);
});

test('disposição por defeito segue topo/meio/fim: frase e KPI a toda a largura, depois linhas completas de 12 colunas', () => {
  for (const page of Object.keys(PAGE_TILES) as (keyof typeof PAGE_TILES)[]) {
    const d = defaultLayout(page);
    assert.deepEqual(d.slice(0, 1).map((t) => [t.id, t.w]), [['insights', 12]], page);
    // Os mosaicos lado a lado fecham sempre uma linha (sem buracos na grelha por defeito).
    let row = 0;
    for (const t of d) {
      row += t.w;
      assert.ok(row <= 12, `${page}: linha passa de 12 colunas em ${t.id}`);
      if (row === 12) row = 0;
    }
    assert.equal(row, 0, `${page}: última linha incompleta`);
  }
  assert.deepEqual(defaultLayout('pulso').map((t) => t.w), [12, 12, 8, 4, 7, 5, 6, 6]);
});

test('reconciliar: sem layout guardado = por defeito', () => {
  assert.deepEqual(reconcile(undefined, 'porque'), defaultLayout('porque'));
});

test('reconciliar: mosaicos em falta vão para o fim (por defeito) e ids desconhecidos são ignorados', () => {
  const saved = [tile('fornecedores', 1, 6), tile('antigo-removido', 2), ];
  const r = reconcile(saved, 'porque');
  assert.deepEqual(ids(r), ['fornecedores', 'insights']);
  assert.equal(r[0].w, 6);
  assert.deepEqual(r.map((t) => t.position), [1, 2]);
  assert.equal(r[1].w, 12);
});

test('reconciliar: respeita a ordem por position e corrige valores fora dos limites', () => {
  const r = reconcile([tile('fornecedores', 5, 99, 99), tile('insights', 2, 0, 0)], 'porque');
  assert.deepEqual(ids(r), ['insights', 'fornecedores']);
  assert.equal(r[1].w, MAX_W);
  assert.equal(r[1].h, MAX_H);
  assert.equal(r[0].w, MIN_W);
  assert.equal(r[0].h, 1);
});

test('mover para cima/baixo troca com o vizinho e para nos extremos', () => {
  const l = [tile('a', 1), tile('b', 2), tile('c', 3)];
  assert.deepEqual(ids(moveTile(l, 'b', -1)), ['b', 'a', 'c']);
  assert.deepEqual(ids(moveTile(l, 'b', 1)), ['a', 'c', 'b']);
  assert.deepEqual(ids(moveTile(l, 'a', -1)), ['a', 'b', 'c']);
  assert.deepEqual(ids(moveTile(l, 'c', 1)), ['a', 'b', 'c']);
  assert.deepEqual(moveTile(l, 'a', 1).map((t) => t.position), [1, 2, 3]);
});

test('mover para um índice (arrastar)', () => {
  const l = [tile('a', 1), tile('b', 2), tile('c', 3)];
  assert.deepEqual(ids(moveTileTo(l, 'a', 2)), ['b', 'c', 'a']);
  assert.deepEqual(ids(moveTileTo(l, 'c', 0)), ['c', 'a', 'b']);
  assert.deepEqual(ids(moveTileTo(l, 'a', 99)), ['b', 'c', 'a']);
  assert.deepEqual(ids(moveTileTo(l, 'zzz', 0)), ['a', 'b', 'c']);
});

test('redimensionar: passos com limites de largura e altura', () => {
  const l = [tile('a', 1, 6, 2)];
  assert.equal(resizeTile(l, 'a', 'w', 1)[0].w, 7);
  assert.equal(resizeTile(l, 'a', 'w', -1)[0].w, 5);
  assert.equal(resizeTile([tile('a', 1, MAX_W)], 'a', 'w', 1)[0].w, MAX_W);
  assert.equal(resizeTile([tile('a', 1, MIN_W)], 'a', 'w', -1)[0].w, MIN_W);
  assert.equal(resizeTile(l, 'a', 'h', -1)[0].h, 1);
  assert.equal(resizeTile([tile('a', 1, 6, 1)], 'a', 'h', -1)[0].h, 1);
  assert.equal(resizeTile([tile('a', 1, 6, MAX_H)], 'a', 'h', 1)[0].h, MAX_H);
});

test('mergePage substitui só a página indicada no layout completo', () => {
  const full = { pages: { pulso: { tiles: [tile('x', 1)] } } };
  const m = mergePage(full, 'porque', [tile('fornecedores', 1, 6)]);
  assert.deepEqual(m.pages.pulso, full.pages.pulso);
  assert.deepEqual(m.pages.porque?.tiles, [tile('fornecedores', 1, 6)]);
  assert.deepEqual(mergePage(undefined, 'porque', []).pages, { porque: { tiles: [] } });
});

test('perfil: cookie inválido ou ausente = primeiro perfil', () => {
  assert.equal(DEFAULT_PROFILE, 'diretor');
  assert.equal(parseProfile(undefined), 'diretor');
  assert.equal(parseProfile('hacker'), 'diretor');
  assert.equal(parseProfile('comprador'), 'comprador');
  assert.deepEqual(PROFILE_OPTIONS.map((p) => p.id), ['diretor', 'gestor-armazem', 'comprador']);
});

const meta = [{ id: 'a', title: 'Alfa', node: <p>conteudo-a</p> }, { id: 'b', title: 'Beta', node: <p>conteudo-b</p> }];
const view = (editing: boolean) =>
  renderToStaticMarkup(
    <TileGridView tiles={meta} layout={[tile('b', 1, 6), tile('a', 2, 12, 2)]} editing={editing} announcement="" draggingId={null}
      onMove={() => {}} onResize={() => {}} onDragStart={() => {}} onDropOn={() => {}} onDragEnd={() => {}} />,
  );

test('fora do modo de edição: mosaicos estáticos, na ordem do layout, sem controlos nem arrastar', () => {
  const html = view(false);
  assert.ok(html.indexOf('conteudo-b') < html.indexOf('conteudo-a'));
  assert.doesNotMatch(html, /draggable/);
  assert.doesNotMatch(html, /<button/);
  assert.match(html, /--w:6/);
  assert.match(html, /data-editing="false"/);
});

test('modo de edição: controlos de teclado com ARIA por mosaico, desativados nos extremos', () => {
  const html = view(true);
  assert.match(html, /draggable="true"/);
  assert.match(html, /aria-label="Mover Beta para cima"[^>]*disabled/);
  assert.match(html, /aria-label="Mover Beta para baixo"/);
  assert.match(html, /aria-label="Mover Alfa para baixo"[^>]*disabled/);
  assert.match(html, /aria-label="Tornar Alfa mais estreito"/);
  assert.match(html, /aria-label="Tornar Alfa mais largo"/);
  assert.match(html, /aria-label="Tornar Alfa mais baixo"/);
  assert.match(html, /aria-label="Tornar Alfa mais alto"/);
  assert.match(html, /role="group" aria-label="Disposição de Alfa"/);
  assert.match(html, /Largura 12 de 12/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /data-editing="true"/);
});
