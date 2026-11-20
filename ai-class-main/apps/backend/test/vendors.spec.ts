import { createTestApp, fixture, TestApp } from './harness/test-app';

// Fixture vendors3 (valores à mão):
//  V001 LT 10,10 -> média 10, desvio 0, CV 0;   0 de 2 artigos em risco (autonomia 100 d)
//  V002 LT 10,20 -> média 15, desvio 5, CV 1/3; 1 de 2 em risco (autonomia 5 d < LT 10 -> folga -5)
//  V003 LT 15,15 -> média 15, desvio 0, CV 0;   0 de 2 em risco
// Ranks (1 = melhor, empate = rank médio):
//  média: V001 1, V002 2,5, V003 2,5 | CV: V001 1,5, V002 3, V003 1,5 | % risco: V001 1,5, V002 3, V003 1,5
//  índice: V001 (1+1,5+1,5)/3 = 1,333 | V002 (2,5+3+3)/3 = 2,833 | V003 (2,5+1,5+1,5)/3 = 1,833
describe('GET /api/vendors', () => {
  let t: TestApp;
  afterEach(async () => t?.close());
  const get = async (qs = '') => (await t.api.get(`/api/vendors${qs}`).expect(200)).body;
  const by = (b: any, id: string) => b.vendors.find((v: any) => v.vendorId === id);

  it('estatísticas de LT, artigos em risco e índice de risco (média de ranks, com empates)', async () => {
    t = await createTestApp({ csvDir: fixture('vendors3') });
    const b = await get();
    expect(by(b, 'V001')).toMatchObject({ mean: 10, stdDev: 0, cv: 0, items: 2, itemsAtRisk: 0, pctAtRisk: 0 });
    expect(by(b, 'V002')).toMatchObject({ mean: 15, stdDev: 5, cv: 0.333, items: 2, itemsAtRisk: 1, pctAtRisk: 50 });
    expect(by(b, 'V003')).toMatchObject({ mean: 15, stdDev: 0, cv: 0, items: 2, itemsAtRisk: 0, pctAtRisk: 0 });
    expect(by(b, 'V001').risk).toMatchObject({ ranks: { mean: 1, cv: 1.5, atRisk: 1.5 }, index: 1.333 });
    expect(by(b, 'V002').risk).toMatchObject({ ranks: { mean: 2.5, cv: 3, atRisk: 3 }, index: 2.833 });
    expect(by(b, 'V003').risk).toMatchObject({ ranks: { mean: 2.5, cv: 1.5, atRisk: 1.5 }, index: 1.833 });
  });

  it('"nenhum fornecedor se distingue" quando a diferença de médias é < distinguishDays', async () => {
    t = await createTestApp({ csvDir: fixture('vendors3') });
    const wide = await get(); // diferença 5 dias >= 1
    expect(wide.distinguishes).toBe(true);
    expect(wide.maxDifferenceDays).toBe(5);
    expect(wide.distinguishText).not.toMatch(/nenhum fornecedor se distingue/i);
    const narrow = await get('?distinguishDays=6'); // 5 < 6
    expect(narrow.distinguishes).toBe(false);
    expect(narrow.distinguishText).toMatch(/nenhum fornecedor se distingue/i);
  });

  it('prometido vs. real: declarado e datas do vendor_data contra o tempo médio do inventário', async () => {
    t = await createTestApp({ csvDir: fixture('vendors3') });
    const b = await get();
    expect(by(b, 'V001')).toMatchObject({ declaredDays: 5, datesDays: 5, mean: 10 });
    expect(by(b, 'V002')).toMatchObject({ declaredDays: 30, datesDays: 44, mean: 15 });
    expect(by(b, 'V003')).toMatchObject({ declaredDays: 15, datesDays: 20, mean: 15 });
  });

  it('sazonalidade: média do LT por mês do ano, com número de observações', async () => {
    t = await createTestApp({ csvDir: fixture('vendors3') });
    const b = await get();
    expect(b.seasonality).toEqual([
      { month: 1, mean: 10, observations: 2 },
      { month: 2, mean: 12.5, observations: 2 },
      { month: 3, mean: 17.5, observations: 2 },
    ]);
  });

  it('os filtros globais aplicam-se (fornecedor V002)', async () => {
    t = await createTestApp({ csvDir: fixture('vendors3') });
    const b = await get('?fornecedor=V002');
    expect(b.vendors.map((v: any) => v.vendorId)).toEqual(['V002']);
  });

  it('explain: índice de risco e prometido vs. real', async () => {
    t = await createTestApp();
    const a = (await t.api.get('/api/kpis/vendor-risk/explain').expect(200)).body;
    expect(a.formula).toMatch(/média dos ranks/i);
    const p = (await t.api.get('/api/kpis/promised-vs-real/explain').expect(200)).body;
    expect(p.source).toContain('vendor_data');
  });

  it('sem dados: lista vazia', async () => {
    t = await createTestApp();
    const b = await get();
    expect(b.vendors).toEqual([]);
    expect(b.distinguishes).toBe(false);
  });
});
