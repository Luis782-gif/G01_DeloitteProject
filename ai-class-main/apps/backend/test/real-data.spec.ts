import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createTestApp, TestApp } from './harness/test-app';

/**
 * AC-03 e AC-40: valores de referência da spec (6.2 e 12.6) com os CSV completos.
 * Os CSV reais estão fora do Git (DATA_DIR ou ai-class-main/data). Sem eles, o suite é ignorado.
 */
const dir = resolve(process.env.DATA_DIR ?? join(__dirname, '..', '..', '..', 'data'));
const hasData = ['inventory_data', 'vendor_data', 'financial_data', 'patient_data', 'staff_data'].every((f) =>
  existsSync(join(dir, `${f}.csv`)),
);
const describeReal = hasData ? describe : describe.skip;

describeReal('dados completos (AC-03, AC-40)', () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp({ csvDir: dir });
  });
  afterAll(async () => t?.close());

  it('AC-03: 2003 lidos, 906 tratados, 1097 assinalados, 0 rejeitados', async () => {
    const res = await t.api.get('/api/meta/data-quality').expect(200);
    expect(res.body.total).toMatchObject({ read: 2003, treated: 906, flagged: 1097, rejected: 0 });
  });

  it('AC-40: abaixo do mínimo 2 de 47 elegíveis, 3 excluídos (R11)', async () => {
    const { body } = await t.api.get('/api/kpis/below-minimum').expect(200);
    expect(body).toMatchObject({ count: 2, eligible: 47, excluded: 3 });
  });

  it('AC-40: 29 artigos com folga negativa em 50', async () => {
    const { body } = await t.api.get('/api/kpis/shortage-rate').expect(200);
    expect(body).toMatchObject({ count: 29, n: 50 });
  });

  it('AC-40: capital em excesso 236 614 283 € (19,9 %), 19 artigos, valor de stock 1 187 053 873 €', async () => {
    const { body } = await t.api.get('/api/kpis/excess-capital').expect(200);
    expect(body.itemsAbove).toBe(19);
    expect(Math.round(body.valueEur)).toBe(236614283);
    expect(Math.round(body.totalValueEur)).toBe(1187053873);
    expect(body.pct).toBeCloseTo(19.9, 1);
  });

  it('AC-40: 6 artigos com autonomia > 60 dias e stock parado de 112 653 424 €', async () => {
    const { body } = await t.api.get('/api/kpis/idle-stock').expect(200);
    expect(body.itemsOver).toBe(6);
    expect(Math.round(body.valueEur)).toBe(112653424);
  });

  it('AC-41: triagem 5 / 9 / 2 / 24 / 10 nos níveis 1 a 5 (confirmada por script independente em Node a partir do CSV)', async () => {
    const { body } = await t.api.get('/api/triage/distribution').expect(200);
    expect(body.map((b: any) => b.count)).toEqual([5, 9, 2, 24, 10]);
  });

  it('AC-40: ABC 80/95 dá A = 24, B = 13, C = 13 (spec 7)', async () => {
    const { body } = await t.api.get('/api/abc/pareto').expect(200);
    const n = (c: string) => body.filter((r: any) => r.class === c).length;
    expect([n('A'), n('B'), n('C')]).toEqual([24, 13, 13]);
  });

  it('Receita: 36 de 50 artigos abaixo do PE, 150697 unidades sugeridas (verificado fora da aplicação)', async () => {
    const { body } = await t.api.get('/api/reorder-suggestions').expect(200);
    expect(body.totals).toEqual({ items: 36, units: 150697 });
    expect(body.withoutConsumption).toBe(0);
  });
});
