import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contrastRatio, luminance } from './contrast';
import { MODES, STATUS_ORDER, themeCss } from './tokens';

test('contrast: referências conhecidas (preto/branco = 21, igual = 1)', () => {
  assert.equal(Math.round(contrastRatio('#000000', '#ffffff')), 21);
  assert.equal(contrastRatio('#4A9AAA', '#4A9AAA'), 1);
});

for (const mode of Object.keys(MODES) as (keyof typeof MODES)[]) {
  const m = MODES[mode];
  test(`[${mode}] texto cumpre WCAG AA (>= 4.5) sobre fundo e cartão`, () => {
    for (const bg of [m.bg, m.surface]) {
      assert.ok(contrastRatio(m.text, bg) >= 4.5, `text/${bg}`);
      assert.ok(contrastRatio(m.textMuted, bg) >= 4.5, `textMuted/${bg}`);
    }
  });

  test(`[${mode}] componentes de estado cumprem WCAG AA para não-texto (>= 3) sobre o cartão`, () => {
    for (const s of STATUS_ORDER) {
      assert.ok(contrastRatio(m.status[s], m.surface) >= 3, `${s}`);
    }
    assert.ok(contrastRatio(m.border, m.surface) >= 3, 'border');
  });

  test(`[${mode}] os 3 estados distinguem-se em escala de cinzentos (intensidade crescente)`, () => {
    const [ok, att, crit] = STATUS_ORDER.map((s) => luminance(m.status[s]));
    const dist = (a: number, b: number) => Math.abs(a - b);
    assert.ok(dist(ok, att) >= 0.06 && dist(att, crit) >= 0.06, 'passos de luminância demasiado pequenos');
    const bg = luminance(m.surface);
    assert.ok(dist(ok, bg) < dist(att, bg) && dist(att, bg) < dist(crit, bg), 'intensidade não é monotónica');
  });
}

test('sem semáforo: nenhuma cor do tema é vermelha, âmbar ou verde (azul domina)', () => {
  const colors = Object.values(MODES).flatMap((m) => [m.bg, m.surface, m.text, m.textMuted, m.border, ...Object.values(m.status)]);
  for (const hex of colors) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    assert.ok(b >= r && b >= g - 10, `${hex} não é azul-petróleo`);
  }
});

test('CSS do tema: Consulta por defeito, Bloco operatório por atributo, pulso desligado com prefers-reduced-motion', () => {
  const css = themeCss();
  assert.match(css, /:root\s*\{[^}]*--bg:/);
  assert.match(css, /\[data-mode="bloco-operatorio"\]\s*\{[^}]*--bg:/);
  const rm = css.match(/@media \(prefers-reduced-motion: reduce\)\s*\{([\s\S]*?\})\s*\}/);
  assert.ok(rm, 'falta bloco prefers-reduced-motion');
  assert.match(rm[1], /\.pulse-icon[^}]*animation:\s*none/);
});
