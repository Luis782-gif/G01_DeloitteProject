import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTestApp, fixture, TestApp } from './harness/test-app';

const HEADER = 'Date,Item_ID,Item_Type,Item_Name,Current_Stock,Min_Required,Max_Capacity,Unit_Cost,Avg_Usage_Per_Day,Restock_Lead_Time,Vendor_ID';
const VENDORS =
  'Vendor_ID,Vendor_Name,Item_Supplied,Avg_Lead_Time (days),Cost_Per_Item,Last_Order_Date,Next_Delivery_Date\n' +
  'V1,Acme,Stuff,5,1.00,2025-01-01,2025-01-10\n';

describe('correções do code-review da onda 1', () => {
  let t: TestApp;
  let tmp: string | undefined;
  afterEach(async () => {
    await t?.close();
    if (tmp) rmSync(tmp, { recursive: true, force: true });
    tmp = undefined;
  });

  const start = async (rows: string[]) => {
    tmp = mkdtempSync(join(tmpdir(), 'rv-'));
    writeFileSync(join(tmp, 'inventory_data.csv'), [HEADER, ...rows].join('\n') + '\n');
    writeFileSync(join(tmp, 'vendor_data.csv'), VENDORS);
    for (const f of ['financial_data.csv', 'patient_data.csv', 'staff_data.csv']) {
      writeFileSync(join(tmp, f), readFileSync(join(fixture('f1'), f), 'utf8'));
    }
    t = await createTestApp({ csvDir: tmp });
  };

  it('A: total do período <= 0 não rebenta (sem divisão por zero) e tudo fica em classe C', async () => {
    await start([
      '2025-06-01,1,Equipment,Alpha,10,5,500,1.00,1,5,V1',
      '2025-06-01,2,Equipment,Beta,-50,5,500,1.00,1,5,V1',
    ]);
    const res = await t.api.get('/api/abc/pareto').expect(200);
    expect(JSON.stringify(res.body)).toContain('"C"');
    expect(JSON.stringify(res.body)).not.toContain('"A"');
    await t.api.get('/api/kpis/slack-days?classe=C').expect(200);
  });

  it('B: artigo com id fora do intervalo inteiro -> 400 no filtro e 404 no detalhe', async () => {
    await start(['2025-06-01,1,Equipment,Alpha,10,5,500,1.00,1,5,V1']);
    const r = await t.api.get('/api/kpis/autonomy?artigo=99999999999:x').expect(400);
    expect(r.body.field).toBe('artigo');
    expect(typeof r.body.error).toBe('string');
    const d = await t.api.get('/api/items/99999999999:x').expect(404);
    expect(typeof d.body.error).toBe('string');
  });

  it('C: registo com tempo de reposição <= 0 fica fora da folga, é contado e não rebenta', async () => {
    await start([
      '2025-06-01,1,Equipment,Alpha,10,5,500,1.00,10,0,V1', // autonomia 1, LT 0: sem folga (antes: folga 1 "atenção")
      '2025-06-01,2,Equipment,Beta,10,5,500,1.00,10,5,V1', // autonomia 1, folga -4 (crítico)
    ]);
    const s = await t.api.get('/api/kpis/slack-days').expect(200);
    const alpha = s.body.items.find((i: { itemRef: string }) => i.itemRef === '1:alpha');
    expect(alpha).toMatchObject({ slack: null, status: null });
    expect(s.body).toMatchObject({ n: 1, invalidLeadTime: 1, noConsumption: 0, median: -4 });
    expect(s.body.counts).toEqual({ ok: 0, atencao: 0, critico: 1 });
    const r = await t.api.get('/api/kpis/shortage-rate').expect(200);
    expect(r.body).toMatchObject({ count: 1, n: 1, invalidLeadTime: 1 });
    const v = await t.api.get('/api/vendors').expect(200);
    expect(v.body.vendors[0]).toMatchObject({ items: 2, itemsAtRisk: 1, pctAtRisk: 100 });
  });

  it('D: slackOk tem de ser maior que slackCritical (400 com field)', async () => {
    await start(['2025-06-01,1,Equipment,Alpha,10,5,500,1.00,1,5,V1']);
    const r = await t.api.get('/api/kpis/slack-days?slackOk=-20&slackCritical=-5').expect(400);
    expect(r.body.field).toBe('slackOk');
    expect(r.body.error).toMatch(/slackOk/);
    await t.api.get('/api/kpis/slack-days?slackOk=3').expect(200);
    await t.api.get('/api/kpis/slack-days?slackCritical=7').expect(400);
  });

  it('E: período totalmente fora dos dados -> 0 dias, rotação nula e "sem dados"', async () => {
    await start([
      '2025-01-01,1,Equipment,Alpha,100,5,500,1.00,10,5,V1',
      '2025-03-31,1,Equipment,Alpha,100,5,500,1.00,10,5,V1',
    ]);
    const full = (await t.api.get('/api/kpis/rotation').expect(200)).body;
    expect(full.periodDays).toBe(90);
    const out = (await t.api.get('/api/kpis/rotation?periodo=2030').expect(200)).body;
    expect(out).toMatchObject({ periodDays: 0, rotation: null, annualizedRotation: null, itemsWithoutData: 1, noData: true });
  });

  it('F: mensagem de corte indica o parâmetro enviado e o field certo', async () => {
    await start(['2025-06-01,1,Equipment,Alpha,10,5,500,1.00,1,5,V1']);
    const a = await t.api.get('/api/abc/pareto?cutA=96').expect(400);
    expect(a.body.field).toBe('cutA');
    expect(a.body.error).toMatch(/cutA/);
    expect(a.body.error).toMatch(/95/);
    const b = await t.api.get('/api/abc/pareto?cutB=70').expect(400);
    expect(b.body.field).toBe('cutB');
    const both = await t.api.get('/api/abc/pareto?cutA=90&cutB=85').expect(400);
    expect(both.body.field).toBe('cutB');
  });
});
