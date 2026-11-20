import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { TrendTooltipBody } from './TrendTooltip';
import { TrendView } from './TrendView';

const gap = { month: '2025-03', value: null, previousValue: 0, delta: null, snapshots: 0 };
const pt = { month: '2025-02', value: 0, previousValue: 50, delta: -50, snapshots: 1 };

test('tooltip: mês, valor, mês anterior, variação e nº de snapshots', () => {
  const html = renderToStaticMarkup(<TrendTooltipBody point={pt} unit="%" />);
  assert.match(html, /fev 2025/);
  assert.match(html, /50 %/);
  assert.match(html, /-50 %/);
  assert.match(html, /Nº de snapshots<\/dt><dd>1</);
});

test('tooltip de lacuna: sem registos, nunca zero', () => {
  const html = renderToStaticMarkup(<TrendTooltipBody point={gap} unit="%" />);
  assert.match(html, /Sem registos neste mês/);
  assert.match(html, /Valor<\/dt><dd>—/);
});

test('vista: nome da métrica e aviso de lacunas; API indisponível', () => {
  const html = renderToStaticMarkup(<TrendView data={{ below_min_pct: [pt, gap], lead_time: [] }} />);
  assert.match(html, /% de registos abaixo do mínimo no mês/);
  assert.match(html, /1 mês sem registos aparece como interrupção/);
  assert.match(renderToStaticMarkup(<TrendView data={null} />), /indisponível/);
});
