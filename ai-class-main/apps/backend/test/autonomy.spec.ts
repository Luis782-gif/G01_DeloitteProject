import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTestApp, fixture, TestApp } from './harness/test-app';

const HEADER = 'Date,Item_ID,Item_Type,Item_Name,Current_Stock,Min_Required,Max_Capacity,Unit_Cost,Avg_Usage_Per_Day,Restock_Lead_Time,Vendor_ID';
const VENDORS =
  'Vendor_ID,Vendor_Name,Item_Supplied,Avg_Lead_Time (days),Cost_Per_Item,Last_Order_Date,Next_Delivery_Date\n' +
  'V1,Acme,Stuff,5,1.00,2025-01-01,2025-01-10\n';

const F1_AUTONOMY: Record<string, number> = {
  '108:xray-machine': 1.824, '104:surgical-mask': 1.319, '108:gloves': 9.731, '107:xray-machine': 5.605, '100:gloves': 2.644,
};
const F1_SLACK: Record<string, number> = {
  '108:xray-machine': -23.176, '104:surgical-mask': -1.681, '108:gloves': -3.269, '107:xray-machine': -15.395, '100:gloves': -7.356,
};

describe('KPI autonomia, dias de folga e rutura prevista', () => {
  let t: TestApp;
  let tmp: string | undefined;
  afterEach(async () => {
    await t?.close();
    if (tmp) rmSync(tmp, { recursive: true, force: true });
    tmp = undefined;
  });

  it('F1 (spec 12.1): autonomias por artigo e mediana 2,644', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const res = await t.api.get('/api/kpis/autonomy').expect(200);
    expect(res.body.median).toBeCloseTo(2.644, 3);
    expect(res.body).toMatchObject({ unit: 'dias', n: 5, noConsumption: 0, itemsWithoutData: 0 });
    expect(res.body.items).toHaveLength(5);
    for (const i of res.body.items) expect(i.autonomy).toBeCloseTo(F1_AUTONOMY[i.itemRef], 3);
  });

  it('F1: dias de folga por artigo, todos críticos; mediana da folga', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const res = await t.api.get('/api/kpis/slack-days').expect(200);
    expect(res.body.items).toHaveLength(5);
    for (const i of res.body.items) {
      expect(i.slack).toBeCloseTo(F1_SLACK[i.itemRef], 3);
      expect(i.status).toBe('critico');
    }
    expect(res.body.median).toBeCloseTo(-7.356, 3);
    expect(res.body.status).toBe('critico');
    expect(res.body.thresholds).toEqual({ ok: 7, critical: 0 });
    expect(res.body.counts).toEqual({ ok: 0, atencao: 0, critico: 5 });
  });

  it('F1: rutura prevista = 100 % (5 de 5)', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const res = await t.api.get('/api/kpis/shortage-rate').expect(200);
    expect(res.body).toMatchObject({ count: 5, n: 5, pct: 100, status: 'critico' });
  });

  it('limiares de folga parametrizáveis', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    // folga de 108:gloves = -3,269 e de 107:xray-machine = -15,395: com ok a partir de -20 passam a OK
    const res = await t.api.get('/api/kpis/slack-days?slackCritical=-5&slackOk=-20').expect(200);
    const by = Object.fromEntries(res.body.items.map((i: { itemRef: string; status: string }) => [i.itemRef, i.status]));
    expect(by['108:gloves']).toBe('ok');
    expect(by['107:xray-machine']).toBe('ok');
    expect(by['108:xray-machine']).toBe('critico');
    expect(res.body.thresholds).toEqual({ ok: -20, critical: -5 });
    await t.api.get('/api/kpis/slack-days?slackOk=abc').expect(400);
  });

  it('filtros globais aplicam-se (artigo, período inválido)', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const res = await t.api.get('/api/kpis/autonomy?artigo=100:gloves').expect(200);
    expect(res.body.n).toBe(1);
    expect(res.body.median).toBeCloseTo(2.644, 3);
    await t.api.get('/api/kpis/autonomy?periodo=lixo').expect(400);
  });

  it('consumo 0: autonomia nula, "sem consumo", fora da mediana, sem divisão por zero', async () => {
    tmp = mkdtempSync(join(tmpdir(), 'au-'));
    const rows = [
      '2025-06-01,1,Equipment,Alpha,100,10,500,1.00,10,5,V1', // autonomia 10, folga 5 (atenção)
      '2025-06-01,2,Equipment,Beta,50,10,500,1.00,0,5,V1', // sem consumo
      '2025-06-01,3,Equipment,Gamma,30,10,500,1.00,10,5,V1', // autonomia 3, folga -2 (crítico)
      '2025-06-01,4,Equipment,Delta,200,10,500,1.00,10,5,V1', // autonomia 20, folga 15 (ok)
    ];
    writeFileSync(join(tmp, 'inventory_data.csv'), [HEADER, ...rows].join('\n') + '\n');
    writeFileSync(join(tmp, 'vendor_data.csv'), VENDORS);
    for (const f of ['financial_data.csv', 'patient_data.csv', 'staff_data.csv']) {
      writeFileSync(join(tmp, f), readFileSync(join(fixture('f1'), f), 'utf8'));
    }
    t = await createTestApp({ csvDir: tmp });
    const a = await t.api.get('/api/kpis/autonomy').expect(200);
    expect(a.body).toMatchObject({ median: 10, n: 3, noConsumption: 1 });
    const beta = a.body.items.find((i: { itemRef: string }) => i.itemRef === '2:beta');
    expect(beta).toMatchObject({ autonomy: null, slack: null, noConsumption: true });
    const s = await t.api.get('/api/kpis/slack-days').expect(200);
    expect(s.body.counts).toEqual({ ok: 1, atencao: 1, critico: 1 });
    expect(s.body.noConsumption).toBe(1);
    const r = await t.api.get('/api/kpis/shortage-rate').expect(200);
    expect(r.body).toMatchObject({ count: 1, n: 3 });
    expect(r.body.pct).toBeCloseTo(33.3, 1);
  });

  it('sem dados: zeros/nulos sem erro', async () => {
    t = await createTestApp();
    const res = await t.api.get('/api/kpis/shortage-rate').expect(200);
    expect(res.body).toMatchObject({ count: 0, n: 0, pct: 0 });
    const a = await t.api.get('/api/kpis/autonomy').expect(200);
    expect(a.body).toMatchObject({ median: null, n: 0 });
  });
});

describe('GET /api/kpis/:id/explain', () => {
  let t: TestApp;
  afterEach(async () => t?.close());

  it.each(['autonomy', 'slack-days', 'shortage-rate'])('devolve a entrada %s com todos os campos', async (id) => {
    t = await createTestApp();
    const res = await t.api.get(`/api/kpis/${id}/explain`).expect(200);
    expect(res.body.id).toBe(id);
    for (const k of ['title', 'formula', 'source', 'unit', 'approximation']) expect(typeof res.body[k]).toBe('string');
    expect(res.body.columns.length).toBeGreaterThan(0);
    expect(Array.isArray(res.body.limitations)).toBe(true);
  });

  it('id inexistente: 404 com {error}', async () => {
    t = await createTestApp();
    const res = await t.api.get('/api/kpis/nao-existe/explain').expect(404);
    expect(typeof res.body.error).toBe('string');
  });
});
