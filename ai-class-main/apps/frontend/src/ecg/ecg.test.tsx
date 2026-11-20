import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { ecgCycleSeconds, ECG_REST_SECONDS, ECG_MIN_SECONDS, level5Count, ecgCss } from './ecg';
import { EcgView } from './EcgView';
import { themeCss } from '../theme/tokens';

test('ritmo: 0 artigos = repouso (ciclo mais lento)', () => {
  assert.equal(ecgCycleSeconds(0), ECG_REST_SECONDS);
});

test('ritmo: nunca abranda quando há mais artigos em nível 5 (monótona)', () => {
  let prev = ecgCycleSeconds(0);
  for (let n = 1; n <= 200; n++) {
    const c = ecgCycleSeconds(n);
    assert.ok(c <= prev, `n=${n}`);
    prev = c;
  }
  assert.ok(ecgCycleSeconds(10) < ecgCycleSeconds(1));
  assert.ok(ecgCycleSeconds(1) < ecgCycleSeconds(0));
});

test('ritmo: tem teto (ciclo nunca abaixo do mínimo) e entradas inválidas dão repouso', () => {
  assert.ok(ecgCycleSeconds(1e9) >= ECG_MIN_SECONDS);
  assert.ok(ECG_MIN_SECONDS >= 0.8);
  for (const bad of [-3, NaN, Infinity]) assert.equal(ecgCycleSeconds(bad), ECG_REST_SECONDS);
});

test('level5Count lê o nível 5 da distribuição e ignora respostas inesperadas', () => {
  const counts = [5, 9, 2, 24, 10];
  const dist = counts.map((count, i) => ({ level: i + 1, count }));
  assert.equal(level5Count(dist), 10);
  assert.equal(level5Count([]), null);
  assert.equal(level5Count(null), null);
});

test('cabeçalho mostra o nº em nível 5 como texto acessível', () => {
  const html = renderToStaticMarkup(<EcgView count={10} />);
  assert.match(html, /10 artigos em nível 5/);
  assert.match(html, /role="status"[^>]*aria-label="10 artigos em nível 5"|aria-label="10 artigos em nível 5"[^>]*role="status"/);
});

test('singular e zero', () => {
  assert.match(renderToStaticMarkup(<EcgView count={1} />), /1 artigo em nível 5/);
  assert.match(renderToStaticMarkup(<EcgView count={0} />), /0 artigos em nível 5/);
});

test('o ritmo da linha vem do nº (ciclo em segundos)', () => {
  const fast = renderToStaticMarkup(<EcgView count={30} />);
  const slow = renderToStaticMarkup(<EcgView count={0} />);
  assert.match(fast, new RegExp(`--ecg-cycle:${ecgCycleSeconds(30)}s`));
  assert.match(slow, new RegExp(`--ecg-cycle:${ECG_REST_SECONDS}s`));
});

test('API indisponível: linha em repouso e "indisponível"', () => {
  const html = renderToStaticMarkup(<EcgView count={null} />);
  assert.match(html, /indisponível/i);
  assert.match(html, new RegExp(`--ecg-cycle:${ECG_REST_SECONDS}s`));
});

test('a linha é decorativa (aria-hidden) e anima só com transform', () => {
  const html = renderToStaticMarkup(<EcgView count={10} />);
  assert.match(html, /<svg[^>]*aria-hidden="true"/);
  const css = ecgCss();
  assert.match(css, /transform:\s*translateX/);
  assert.doesNotMatch(css, /@keyframes[^{]*\{[^}]*(left|width|top)\s*:/);
});

test('prefers-reduced-motion: linha estática', () => {
  const css = ecgCss();
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)\s*\{[^}]*\.ecg-line[^}]*animation:\s*none/);
  assert.ok(themeCss().includes(css));
});
