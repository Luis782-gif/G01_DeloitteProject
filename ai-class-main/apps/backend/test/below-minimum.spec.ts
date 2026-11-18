import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTestApp, fixture, TestApp } from './harness/test-app';

const HEADER = 'Date,Item_ID,Item_Type,Item_Name,Current_Stock,Min_Required,Max_Capacity,Unit_Cost,Avg_Usage_Per_Day,Restock_Lead_Time,Vendor_ID';
const VENDORS =
  'Vendor_ID,Vendor_Name,Item_Supplied,Avg_Lead_Time (days),Cost_Per_Item,Last_Order_Date,Next_Delivery_Date\n' +
  'V1,Acme,Stuff,5,1.00,2025-01-01,2025-01-10\n';

describe('GET /api/kpis/below-minimum', () => {
  let t: TestApp;
  let tmp: string | undefined;
  afterEach(async () => {
    await t?.close();
    if (tmp) rmSync(tmp, { recursive: true, force: true });
    tmp = undefined;
  });

  it('F1 (spec 12.1): contagem 2, elegíveis 4, excluídos 1, 50 %', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const res = await t.api.get('/api/kpis/below-minimum').expect(200);
    expect(res.body).toMatchObject({ count: 2, eligible: 4, excluded: 1, pct: 50 });
    expect(res.body.items).toEqual([
      { itemRef: '108:xray-machine', name: 'X-ray Machine', stock: 715, min: 953, referenceDate: '2025-11-21', stale: false },
      { itemRef: '104:surgical-mask', name: 'Surgical Mask', stock: 542, min: 589, referenceDate: '2025-11-22', stale: false },
    ]);
  });

  it('sem dados carregados: zeros, sem divisão por zero e lista vazia', async () => {
    t = await createTestApp();
    const res = await t.api.get('/api/kpis/below-minimum').expect(200);
    expect(res.body).toEqual({ count: 0, eligible: 0, excluded: 0, pct: 0, itemsWithoutData: 0, items: [] });
  });

  it('só o snapshot de referência conta; desatualizado quando > 90 dias antes da data de corte', async () => {
    tmp = mkdtempSync(join(tmpdir(), 'bm-'));
    const rows = [
      '2025-01-01,1,Equipment,Alpha,10,50,100,1.00,1,1,V1', // substituído pelo snapshot seguinte
      '2025-02-01,1,Equipment,Alpha,80,50,100,1.00,1,1,V1', // referência de Alpha: acima do mínimo
      '2025-02-01,2,Equipment,Beta Item,5,50,100,1.00,1,1,V1', // 120 dias antes do corte: desatualizado
      '2025-03-03,4,Equipment,Delta,5,50,100,1.00,1,1,V1', // exatamente 90 dias antes do corte: não desatualizado
      '2025-06-01,3,Equipment,Gamma,5,50,100,1.00,1,1,V1', // data de corte
    ];
    writeFileSync(join(tmp, 'inventory_data.csv'), [HEADER, ...rows].join('\n') + '\n');
    writeFileSync(join(tmp, 'vendor_data.csv'), VENDORS);
    // O ETL exige os 5 CSV (ticket #6): os restantes só com cabeçalho.
    for (const f of ['financial_data.csv', 'patient_data.csv', 'staff_data.csv']) {
      writeFileSync(join(tmp, f), readFileSync(join(fixture('f1'), f), 'utf8'));
    }
    t = await createTestApp({ csvDir: tmp });
    const res = await t.api.get('/api/kpis/below-minimum').expect(200);
    expect(res.body).toMatchObject({ count: 3, eligible: 4, excluded: 0, pct: 75 });
    expect(res.body.items).toEqual([
      { itemRef: '2:beta-item', name: 'Beta Item', stock: 5, min: 50, referenceDate: '2025-02-01', stale: true },
      { itemRef: '4:delta', name: 'Delta', stock: 5, min: 50, referenceDate: '2025-03-03', stale: false },
      { itemRef: '3:gamma', name: 'Gamma', stock: 5, min: 50, referenceDate: '2025-06-01', stale: false },
    ]);
  });

  it('pagina a lista sem alterar os totais', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const res = await t.api.get('/api/kpis/below-minimum?page=2&pageSize=1').expect(200);
    expect(res.body.count).toBe(2);
    expect(res.body.items.map((i: any) => i.itemRef)).toEqual(['104:surgical-mask']);
  });
});
