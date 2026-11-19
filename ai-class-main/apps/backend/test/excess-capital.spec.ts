import { createTestApp, fixture, TestApp } from './harness/test-app';

describe('GET /api/kpis/excess-capital (K7)', () => {
  let t: TestApp;
  afterEach(async () => t?.close());

  it('F1 (spec 12.1): 12 945 643,47 €, 14,37 % do total, estado crítico, só o artigo 457', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const res = await t.api.get('/api/kpis/excess-capital').expect(200);
    expect(res.body).toMatchObject({
      valueEur: 12945643.47,
      totalValueEur: 90098726.9,
      pct: 14.37,
      status: 'critico',
      itemsAbove: 1,
      thresholds: { okPct: 5, atencaoPct: 10 },
      itemsWithoutData: 0,
    });
    expect(res.body.byType).toEqual([
      {
        type: 'Consumable',
        valueEur: 12945643.47,
        items: [{ itemRef: '108:gloves', name: 'Gloves', excessUnits: 683, valueEur: 12945643.47 }],
      },
    ]);
  });

  it('o registo R11 (mínimo 990 > máximo 767) entra: usa só o máximo', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const res = await t.api.get('/api/kpis/excess-capital').expect(200);
    expect(res.body.itemsAbove).toBe(1);
  });

  it('limiares parametrizáveis: com okPct=15 o mesmo valor passa a OK; inválido = 400', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const res = await t.api.get('/api/kpis/excess-capital?okPct=15&atencaoPct=20').expect(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.thresholds).toEqual({ okPct: 15, atencaoPct: 20 });
    const mid = await t.api.get('/api/kpis/excess-capital?okPct=5&atencaoPct=14.5').expect(200);
    expect(mid.body.status).toBe('critico');
    const att = await t.api.get('/api/kpis/excess-capital?okPct=5&atencaoPct=15').expect(200);
    expect(att.body.status).toBe('atencao');
    await t.api.get('/api/kpis/excess-capital?okPct=x').expect(400);
  });

  it('respeita os filtros globais: tipo Equipment não tem excesso; filtro inválido = 400', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const res = await t.api.get('/api/kpis/excess-capital?tipo=Equipment').expect(200);
    expect(res.body).toMatchObject({ valueEur: 0, pct: 0, status: 'ok', itemsAbove: 0, byType: [] });
    await t.api.get('/api/kpis/excess-capital?periodo=lixo').expect(400);
  });

  it('sem dados: zeros', async () => {
    t = await createTestApp();
    const res = await t.api.get('/api/kpis/excess-capital').expect(200);
    expect(res.body).toMatchObject({ valueEur: 0, totalValueEur: 0, pct: 0, itemsAbove: 0, byType: [] });
  });
});

describe('GET /api/kpis/idle-stock (K7b)', () => {
  let t: TestApp;
  afterEach(async () => t?.close());

  it('F1 com X = 60 (por defeito): 0 €', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const res = await t.api.get('/api/kpis/idle-stock').expect(200);
    expect(res.body).toMatchObject({ days: 60, valueEur: 0, itemsOver: 0 });
  });

  it('F1 com X = 3, à mão: 107 (2270−3×405=1055) × 19636,33 = 20 716 328,15; 108 Gloves (1450−3×149=1003) × 18954,09 = 19 010 952,27; os outros 3 ficam a 0', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const res = await t.api.get('/api/kpis/idle-stock?dias=3').expect(200);
    expect(res.body).toMatchObject({ days: 3, itemsOver: 2, valueEur: 39727280.42 });
  });

  it('dias inválido: 400', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    await t.api.get('/api/kpis/idle-stock?dias=0').expect(400);
  });
});
