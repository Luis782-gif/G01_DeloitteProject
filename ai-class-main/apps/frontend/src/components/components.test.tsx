import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { KpiCard } from './KpiCard';
import { StatusIndicator } from './StatusIndicator';

const kpi = (status: 'ok' | 'atencao' | 'critico') =>
  renderToStaticMarkup(<KpiCard label="Rutura de stock" value="12,5" unit="%" status={status} />);

test('cartão KPI mostra rótulo, valor, unidade e estado em texto', () => {
  const html = kpi('ok');
  assert.match(html, /Rutura de stock/);
  assert.match(html, /12,5/);
  assert.match(html, />%</);
  assert.match(html, /data-status="ok"/);
  assert.match(html, /OK/);
});

test('cartão KPI tem o ícone (i) como botão acessível para "Como é calculado"', () => {
  const html = kpi('ok');
  assert.match(html, /<button[^>]*aria-label="Como é calculado: Rutura de stock"/);
  assert.match(html, /\(i\)|ⓘ/);
});

test('OK: barra cheia, sem ícone', () => {
  const html = renderToStaticMarkup(<StatusIndicator status="ok" />);
  assert.match(html, /class="status-bar"/);
  assert.doesNotMatch(html, /<svg/);
});

test('atenção: barra cheia e ícone de triângulo (borda tracejada vem do estado)', () => {
  const html = renderToStaticMarkup(<StatusIndicator status="atencao" />);
  assert.match(html, /class="status-bar"/);
  assert.match(html, /data-icon="triangulo"/);
  assert.match(html, /Atenção/);
  assert.doesNotMatch(html, /pulse-icon/);
});

test('crítico: ícone de pulso animado (classe pulse-icon) e texto "Crítico"', () => {
  const html = renderToStaticMarkup(<StatusIndicator status="critico" />);
  assert.match(html, /data-icon="pulso"/);
  assert.match(html, /pulse-icon/);
  assert.match(html, /Crítico/);
});

test('ícones são decorativos para leitores de ecrã (o texto do estado é o nome acessível)', () => {
  for (const s of ['atencao', 'critico'] as const) {
    assert.match(renderToStaticMarkup(<StatusIndicator status={s} />), /<svg[^>]*aria-hidden="true"/);
  }
});

test('cartão KPI distingue os 3 estados só pelo atributo de estado e marcadores (sem cor inline)', () => {
  const htmls = (['ok', 'atencao', 'critico'] as const).map(kpi);
  assert.equal(new Set(htmls).size, 3);
  for (const h of htmls) assert.doesNotMatch(h, /style=/);
});
