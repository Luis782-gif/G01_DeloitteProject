import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTestApp, fixture, TestApp } from './harness/test-app';

const HEADER = 'Date,Item_ID,Item_Type,Item_Name,Current_Stock,Min_Required,Max_Capacity,Unit_Cost,Avg_Usage_Per_Day,Restock_Lead_Time,Vendor_ID';
const VENDORS =
  'Vendor_ID,Vendor_Name,Item_Supplied,Avg_Lead_Time (days),Cost_Per_Item,Last_Order_Date,Next_Delivery_Date\n' +
  'V1,Acme,Stuff,5,1.00,2025-01-01,2025-01-10\n';

describe('GET /api/kpis/lead-time', () => {
  let t: TestApp;
  let tmp: string | undefined;
  afterEach(async () => {
    await t?.close();
    if (tmp) rmSync(tmp, { recursive: true, force: true });
    tmp = undefined;
  });

  it('F1 (spec 12.1): média global 14,4 dias (LT 25, 3, 13, 21, 10), desvio populacional e CV', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const res = await t.api.get('/api/kpis/lead-time').expect(200);
    expect(res.body).toMatchObject({ mean: 14.4, stdDev: 7.84, cv: 0.544, observations: 5, invalid: 0 });
  });

  it('por fornecedor e por artigo, com desvio-padrão e CV', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const res = await t.api.get('/api/kpis/lead-time').expect(200);
    const v1 = res.body.byVendor.find((v: any) => v.vendorId === 'V001');
    expect(v1).toMatchObject({ mean: 23, stdDev: 2, cv: 0.087, observations: 2 });
    const v3 = res.body.byVendor.find((v: any) => v.vendorId === 'V003');
    expect(v3).toMatchObject({ mean: 8.67, observations: 3 });
    expect(res.body.byItem).toHaveLength(5);
    expect(res.body.byItem.find((i: any) => i.itemRef === '104:surgical-mask')).toMatchObject({
      mean: 3, stdDev: 0, cv: 0, observations: 1,
    });
  });

  it('os filtros globais aplicam-se (fornecedor V001 => 23)', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const res = await t.api.get('/api/kpis/lead-time?fornecedor=V001').expect(200);
    expect(res.body).toMatchObject({ mean: 23, observations: 2 });
    expect(res.body.byVendor).toHaveLength(1);
  });

  it('LT <= 0 é assinalado (R12) e fica fora do KPI', async () => {
    tmp = mkdtempSync(join(tmpdir(), 'lt-'));
    const rows = [
      '2025-01-01,1,Equipment,Alpha,10,5,100,1.00,1,10,V1',
      '2025-01-02,2,Equipment,Beta,10,5,100,1.00,1,20,V1',
      '2025-01-03,3,Equipment,Gamma,10,5,100,1.00,1,0,V1',
      '2025-01-04,4,Equipment,Delta,10,5,100,1.00,1,-3,V1',
    ];
    writeFileSync(join(tmp, 'inventory_data.csv'), [HEADER, ...rows].join('\n') + '\n');
    writeFileSync(join(tmp, 'vendor_data.csv'), VENDORS);
    for (const f of ['financial_data.csv', 'patient_data.csv', 'staff_data.csv']) {
      writeFileSync(join(tmp, f), readFileSync(join(fixture('f1'), f), 'utf8'));
    }
    t = await createTestApp({ csvDir: tmp });
    const res = await t.api.get('/api/kpis/lead-time').expect(200);
    expect(res.body).toMatchObject({ mean: 15, observations: 2, invalid: 2 });
    expect(res.body.byItem.map((i: any) => i.itemRef).sort()).toEqual(['1:alpha', '2:beta']);
  });

  it('GET /api/kpis/lead-time/explain: fonte do inventário, desvio populacional e limitação de ~10 observações', async () => {
    t = await createTestApp();
    const res = await t.api.get('/api/kpis/lead-time/explain').expect(200);
    expect(res.body.id).toBe('lead-time');
    expect(res.body.unit).toBe('dias');
    expect(res.body.source).toContain('Restock_Lead_Time');
    expect(res.body.formula).toContain('populacional');
    expect(res.body.limitations.join(' ')).toContain('10 observações');
  });

  it('sem dados: nulos, sem divisão por zero', async () => {
    t = await createTestApp();
    const res = await t.api.get('/api/kpis/lead-time').expect(200);
    expect(res.body).toEqual({ mean: null, stdDev: null, cv: null, observations: 0, invalid: 0, itemsWithoutData: 0, byVendor: [], byItem: [] });
  });
});
