import { createTestApp, fixture, TestApp } from './harness/test-app';

const Q1 = 'periodo=2025-01-01..2025-03-31';

describe('GET /api/kpis/rotation', () => {
  let t: TestApp;
  afterEach(async () => {
    await t?.close();
  });

  it('F2 (spec 12.2): artigo 100 Ventilator, 2025-01-01..2025-03-31 (90 dias)', async () => {
    t = await createTestApp({ csvDir: fixture('f2') });
    const res = await t.api.get(`/api/kpis/rotation?${Q1}`).expect(200);
    expect(res.body.periodDays).toBe(90);
    expect(res.body.itemsWithoutData).toBe(0);
    expect(res.body.items).toHaveLength(1);
    const i = res.body.items[0];
    expect(i.itemRef).toBe('100:ventilator');
    expect(i.snapshots).toBe(3);
    expect(i.estimatedConsumption).toBe(18090);
    expect(i.averageStock).toBeCloseTo(1267.33, 2);
    expect(i.rotation).toBeCloseTo(14.274, 3);
    expect(i.annualizedRotation).toBeCloseTo(57.89, 2);
    // agregada = razão das somas (um só artigo: igual à do artigo)
    expect(res.body.estimatedConsumption).toBe(18090);
    expect(res.body.rotation).toBeCloseTo(14.274, 3);
    expect(res.body.annualizedRotation).toBeCloseTo(57.89, 2);
  });

  it('versão em valor: identificada como secundária; consumo x custo médio / stock_value médio', async () => {
    t = await createTestApp({ csvDir: fixture('f2') });
    const res = await t.api.get(`/api/kpis/rotation?${Q1}`).expect(200);
    const unitCost = (12144.29 + 12615.11 + 19150.22) / 3;
    const avgValue = (690 * 12144.29 + 1196 * 12615.11 + 1916 * 19150.22) / 3;
    const expected = (18090 * unitCost) / avgValue;
    expect(res.body.value.secondary).toBe(true);
    expect(res.body.items[0].value.rotation).toBeCloseTo(expected, 3);
    expect(res.body.value.rotation).toBeCloseTo(expected, 3);
    expect(res.body.value.annualizedRotation).toBeCloseTo(expected * (365 / 90), 2);
  });

  it('sem filtro de período usa o intervalo completo dos dados (inclusivo)', async () => {
    t = await createTestApp({ csvDir: fixture('f2') });
    const res = await t.api.get('/api/kpis/rotation').expect(200);
    // 2025-01-04 a 2025-02-18 = 46 dias inclusivos; consumo médio diário = (353+55+195)/3 = 201
    expect(res.body.periodDays).toBe(46);
    expect(res.body.items[0].estimatedConsumption).toBeCloseTo(201 * 46, 6);
  });

  it('artigo sem snapshots no período: nulo e conta em "sem dados"', async () => {
    t = await createTestApp({ csvDir: fixture('f2') });
    const res = await t.api.get('/api/kpis/rotation?periodo=2024').expect(200);
    expect(res.body.items).toEqual([]);
    expect(res.body.itemsWithoutData).toBe(1);
    expect(res.body.rotation).toBeNull();
    expect(res.body.annualizedRotation).toBeNull();
    expect(res.body.value.rotation).toBeNull();
  });

  it('os filtros globais aplicam-se (fornecedor; inválido = 400)', async () => {
    t = await createTestApp({ csvDir: fixture('f2') });
    const v = await t.api.get(`/api/kpis/rotation?${Q1}&fornecedor=V002`).expect(200);
    expect(v.body.items[0].snapshots).toBe(1);
    expect(v.body.items[0].estimatedConsumption).toBe(353 * 90);
    expect(v.body.items[0].rotation).toBeCloseTo((353 * 90) / 690, 3);
    await t.api.get(`/api/kpis/rotation?${Q1}&fornecedor=V999`).expect(400); // fornecedor desconhecido
    await t.api.get('/api/kpis/rotation?periodo=abc').expect(400);
  });
});
