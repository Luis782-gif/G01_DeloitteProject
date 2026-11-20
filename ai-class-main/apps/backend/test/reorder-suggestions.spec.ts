import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTestApp, fixture, TestApp } from './harness/test-app';

const HEADER = 'Date,Item_ID,Item_Type,Item_Name,Current_Stock,Min_Required,Max_Capacity,Unit_Cost,Avg_Usage_Per_Day,Restock_Lead_Time,Vendor_ID';
const VENDORS =
  'Vendor_ID,Vendor_Name,Item_Supplied,Avg_Lead_Time (days),Cost_Per_Item,Last_Order_Date,Next_Delivery_Date\n' +
  'V1,Acme,Stuff,5,1.00,2025-01-01,2025-01-10\n';
/** Exemplo da aula: consumo 72 (último), σ 5,59; com Z 2,05 e LT 2: SS 17, PE 161. */
const AULA = [70, 68, 75, 58, 64, 72, 74, 76, 82, 75, 71, 70, 67, 68, 72, 78, 80, 72];
const QS = 'servicoA=98&servicoB=98&servicoC=98&cutA=88&cutB=89';

interface Case {
  name: string;
  stock: number;
  unitCost: number;
  min?: number;
  max?: number;
  type?: string;
  usage?: number[];
}

function csv(cases: Case[]): string {
  const rows: string[] = [];
  cases.forEach((c, i) => {
    (c.usage ?? AULA).forEach((u, k) => {
      const date = new Date(Date.UTC(2025, 0, 1 + k)).toISOString().slice(0, 10);
      rows.push(`${date},${i + 1},${c.type ?? 'Equipment'},${c.name},${c.stock},${c.min ?? 0},${c.max ?? 500},${c.unitCost},${u},2,V1`);
    });
  });
  return [HEADER, ...rows].join('\n') + '\n';
}

// Classes por valor (stock x custo) com cutA=88/cutB=89: só o primeiro é A, os restantes C.
const CASES: Case[] = [
  { name: 'A100', stock: 100, unitCost: 100000 }, // A: nível 5, sugere 400
  { name: 'C100', stock: 100, unitCost: 100, type: 'Consumable' }, // C: nível 4, sugere 400
  { name: 'C150', stock: 150, unitCost: 100 }, // C: nível 3 (150 >= 144, < 161), sugere 350
  { name: 'C200', stock: 200, unitCost: 100 }, // acima do PE: fora
  { name: 'C100r11', stock: 100, unitCost: 100, min: 300, max: 150 }, // R11: sugere até ao PE: 61
  { name: 'Parado', stock: 10, unitCost: 1, usage: [0, 0, 0, 0, 0, 0, 0, 0, 0] }, // sem consumo: fora
];

describe('sugestão de encomenda (Receita, spec 8.4)', () => {
  let t: TestApp;
  let tmp: string | undefined;
  afterEach(async () => {
    await t?.close();
    if (tmp) rmSync(tmp, { recursive: true, force: true });
    tmp = undefined;
  });
  async function load(cases: Case[]) {
    tmp = mkdtempSync(join(tmpdir(), 'reorder-'));
    writeFileSync(join(tmp, 'inventory_data.csv'), csv(cases));
    writeFileSync(join(tmp, 'vendor_data.csv'), VENDORS);
    for (const f of ['financial_data.csv', 'patient_data.csv', 'staff_data.csv']) {
      writeFileSync(join(tmp, f), readFileSync(join(fixture('f1'), f), 'utf8'));
    }
    t = await createTestApp({ csvDir: tmp });
  }

  it('lista os artigos abaixo do PE, por nível decrescente e folga crescente, com a quantidade sugerida', async () => {
    await load(CASES);
    const res = await t.api.get(`/api/reorder-suggestions?${QS}`).expect(200);
    const items = res.body.items as Array<Record<string, unknown>>;
    expect(items.map((i) => i.name)).toEqual(['A100', 'C100', 'C100r11', 'C150']);
    expect(items.map((i) => i.level)).toEqual([5, 4, 4, 3]);
    expect(items[0]).toMatchObject({ stock: 100, reorderPoint: 161, safetyStock: 17, suggest: 400 });
    expect(items[0].reason).toContain('stock 100 abaixo da rutura esperada no tempo de reposição (144)');
    expect(items[1]).toMatchObject({ suggest: 400 });
    expect(items[2]).toMatchObject({ suggest: 61 });
    expect(items[2].reason).toContain('ponto de encomenda');
    expect(items[3]).toMatchObject({ stock: 150, suggest: 350 });
    expect(items[3].reason).toContain('dentro da margem do stock de segurança');
    expect(res.body.totals).toEqual({ items: 4, units: 400 + 400 + 61 + 350 });
    expect(res.body.withoutConsumption).toBe(1);
  });

  it('filtro por tipo aplica-se', async () => {
    await load(CASES);
    const res = await t.api.get(`/api/reorder-suggestions?${QS}&tipo=Consumable`).expect(200);
    expect(res.body.items.map((i: { name: string }) => i.name)).toEqual(['C100']);
    expect(res.body.totals).toEqual({ items: 1, units: 400 });
  });

  it('o CSV tem o mesmo conteúdo da lista (BOM, ; e cabeçalhos PT-PT)', async () => {
    await load(CASES);
    const list = await t.api.get(`/api/reorder-suggestions?${QS}`).expect(200);
    const res = await t.api
      .get(`/api/reorder-suggestions/export.csv?${QS}`)
      .buffer(true)
      .parse((r, cb) => {
        const chunks: Buffer[] = [];
        r.on('data', (c: Buffer) => chunks.push(c));
        r.on('end', () => cb(null, Buffer.concat(chunks)));
      })
      .expect(200);
    expect(res.headers['content-type']).toMatch(/text\/csv; charset=utf-8/);
    expect(res.headers['content-disposition']).toMatch(/attachment; filename=.*\.csv/);
    const raw = res.body as Buffer;
    expect([...raw.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const lines = raw.subarray(3).toString('utf8').trim().split('\r\n');
    expect(lines[0]).toBe('Artigo;Nome;Nível de triagem;Stock;Ponto de encomenda;Stock de segurança;Quantidade sugerida;Motivo');
    expect(lines).toHaveLength(1 + list.body.items.length);
    list.body.items.forEach((it: Record<string, unknown>, k: number) => {
      const cols = lines[k + 1].split(';');
      expect(cols.slice(0, 7)).toEqual([it.itemRef, it.name, it.level, it.stock, it.reorderPoint, it.safetyStock, it.suggest].map(String));
      expect(cols[7]).toBe(it.reason);
    });
    const filtered = await t.api.get(`/api/reorder-suggestions/export.csv?${QS}&tipo=Consumable`).buffer(true).expect(200);
    expect(filtered.text.trim().split('\r\n')).toHaveLength(2);
  });
});
