import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { SimulatorForm } from './SimulatorForm';
import { SimulatorResultView } from './SimulatorResultView';
import { clamp, simulationBody, simulationHref, type SimulationResult } from './simulator';

const result: SimulationResult = {
  itemsTotal: 50,
  negativeSlackBefore: 29,
  negativeSlackAfter: 33,
  newNegativeSlack: 4,
  triageBefore: [1, 2, 3, 4, 5].map((level, i) => ({ level, count: [5, 9, 2, 24, 10][i] })),
  triageAfter: [1, 2, 3, 4, 5].map((level, i) => ({ level, count: [5, 7, 2, 24, 12][i] })),
};

test('o pedido leva os filtros do URL e o fornecedor só se escolhido', () => {
  assert.equal(simulationHref({ tipo: 'Equipment', periodo: '2025' }), '/api/simulations?periodo=2025&tipo=Equipment');
  assert.equal(simulationHref({}), '/api/simulations');
  assert.deepEqual(simulationBody({ leadTimeDeltaDays: 5, usageDeltaPct: 0 }), { leadTimeDeltaDays: 5, usageDeltaPct: 0 });
  assert.deepEqual(simulationBody({ leadTimeDeltaDays: 5, usageDeltaPct: 20, vendorId: 'V2' }), { leadTimeDeltaDays: 5, usageDeltaPct: 20, vendorId: 'V2' });
});

test('clamp limita ao intervalo permitido', () => {
  assert.equal(clamp(99, 60), 60);
  assert.equal(clamp(-3, 60), 0);
  assert.equal(clamp(Number.NaN, 60), 0);
});

test('o resultado mostra antes/depois da folga negativa e a triagem em tabela', () => {
  const html = renderToStaticMarkup(<SimulatorResultView result={result} />);
  assert.match(html, /4<\/span>/);
  assert.match(html, /<strong>29<\/strong> antes, <strong>33<\/strong> depois/);
  assert.match(html, /Nível 2/);
  assert.match(html, /\+2/);
  assert.match(html, /-2/);
});

test('o formulário tem controlos rotulados (intervalo e campo numérico) e o botão Simular', () => {
  const html = renderToStaticMarkup(<SimulatorForm filters={{}} vendors={[{ vendorId: 'V1', name: 'Acme' }]} />);
  assert.match(html, /type="range"/);
  assert.match(html, /type="number"/);
  assert.match(html, /for="sim-lt-range"/);
  assert.match(html, /Consumo sobe/);
  assert.match(html, /Simular/);
  assert.match(html, /V1 Acme/);
});
