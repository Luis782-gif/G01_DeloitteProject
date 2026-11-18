import { createHash } from 'node:crypto';
import { mkdtempSync, readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTestApp, fixture, TestApp } from './harness/test-app';
import { loadCsvFolder } from '../src/etl/load-csv-folder';

const hashDir = (dir: string) =>
  Object.fromEntries(
    readdirSync(dir).map((f) => [f, createHash('sha256').update(readFileSync(join(dir, f))).digest('hex')]),
  );

const inv = (b: { byFile: { file: string }[] }) => b.byFile.find((f) => f.file === 'inventory_data.csv');

describe('ETL do inventário e fornecedores + GET /api/meta/data-quality', () => {
  let t: TestApp;
  afterEach(async () => t?.close());

  it('sem nenhuma execução, devolve zeros e lastRefreshAt nulo', async () => {
    t = await createTestApp();
    const res = await t.api.get('/api/meta/data-quality').expect(200);
    expect(res.body.lastRefreshAt).toBeNull();
    expect(res.body.total).toMatchObject({ read: 0, treated: 0, flagged: 0, rejected: 0 });
    expect(res.body.byFile).toEqual([]);
  });

  it('F1: 5 inventário + 3 fornecedores, 7 tratados e 1 assinalado (min > max na linha 457)', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const res = await t.api.get('/api/meta/data-quality').expect(200);
    expect(typeof res.body.lastRefreshAt).toBe('string');
    expect(res.body.total).toEqual({
      read: 8, treated: 7, flagged: 1, rejected: 0,
      pctTreated: 87.5, pctFlagged: 12.5, pctRejected: 0,
    });
    expect(res.body.byFile).toEqual([
      { file: 'financial_data.csv', read: 0, flagged: 0, rejected: 0 },
      { file: 'inventory_data.csv', read: 5, flagged: 1, rejected: 0 },
      { file: 'patient_data.csv', read: 0, flagged: 0, rejected: 0 },
      { file: 'staff_data.csv', read: 0, flagged: 0, rejected: 0 },
      { file: 'vendor_data.csv', read: 3, flagged: 0, rejected: 0 },
    ]);
  });

  it('F1: o artigo é o par (código, nome): 5 artigos, 108 aparece com dois nomes', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const { rows } = await t.pool.query('SELECT item_id, item_name FROM dim_item ORDER BY 1, 2');
    expect(rows).toEqual([
      { item_id: 100, item_name: 'Gloves' },
      { item_id: 104, item_name: 'Surgical Mask' },
      { item_id: 107, item_name: 'X-ray Machine' },
      { item_id: 108, item_name: 'Gloves' },
      { item_id: 108, item_name: 'X-ray Machine' },
    ]);
  });

  it('F1: facto com valor de stock, flags, custo em numeric e tipo/fornecedor no facto', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const { rows } = await t.pool.query(
      `SELECT f.date_key, i.item_id, i.item_name, ty.item_type, f.vendor_id, f.unit_cost::text AS unit_cost,
              f.stock_value::text AS stock_value, f.flag_stock_above_max, f.flag_min_above_max, f.source_line
         FROM fact_inventory_snapshot f
         JOIN dim_item i USING (item_sk) JOIN dim_item_type ty USING (item_type_id)
        WHERE i.item_id = 108 AND i.item_name = 'Gloves'`,
    );
    expect(rows).toEqual([
      {
        date_key: 20251230, item_id: 108, item_name: 'Gloves', item_type: 'Consumable', vendor_id: 'V003',
        unit_cost: '18954.09', stock_value: '27483430.50',
        flag_stock_above_max: true, flag_min_above_max: true, source_line: 6,
      },
    ]);
  });

  it('F1: fornecedores em dim_vendor e dim_date cobre o intervalo de datas', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const v = await t.pool.query(
      `SELECT vendor_id, declared_lead_time_days, cost_per_item::text AS c, next_delivery_date::text AS n FROM dim_vendor ORDER BY 1`,
    );
    expect(v.rows[1]).toEqual({ vendor_id: 'V002', declared_lead_time_days: 30, c: '20000.00', n: '2024-10-15' });
    const d = await t.pool.query(`SELECT count(*)::int AS n, min(date_key) AS a, max(date_key) AS b FROM dim_date`);
    expect(d.rows[0]).toEqual({ n: 148, a: 20250805, b: 20251230 });
  });

  it('linha rejeitada (data inválida, R02): não entra no facto e o motivo fica registado', async () => {
    t = await createTestApp({ csvDir: fixture('rejected') });
    const res = await t.api.get('/api/meta/data-quality').expect(200);
    expect(inv(res.body)).toEqual({ file: 'inventory_data.csv', read: 2, flagged: 0, rejected: 1 });
    expect(res.body.total).toMatchObject({ read: 5, treated: 4, flagged: 0, rejected: 1 });
    const facts = await t.pool.query('SELECT count(*)::int AS n FROM fact_inventory_snapshot');
    expect(facts.rows[0].n).toBe(1);
    const log = await t.pool.query('SELECT source_file, source_line, rule_id, level, message FROM etl_quality_log');
    expect(log.rows).toHaveLength(1);
    expect(log.rows[0]).toMatchObject({ source_file: 'inventory_data.csv', source_line: 3, rule_id: 'R02', level: 'reject' });
    expect(log.rows[0].message).toContain('2025-13-45');
  });

  it('stock acima do máximo (R10) é assinalado mas carregado', async () => {
    t = await createTestApp({ csvDir: fixture('stock-above-max') });
    const res = await t.api.get('/api/meta/data-quality').expect(200);
    expect(inv(res.body)).toEqual({ file: 'inventory_data.csv', read: 2, flagged: 1, rejected: 0 });
    const log = await t.pool.query('SELECT rule_id, level, source_line FROM etl_quality_log');
    expect(log.rows).toEqual([{ rule_id: 'R10', level: 'flag', source_line: 3 }]);
    const f = await t.pool.query(
      'SELECT flag_stock_above_max AS a, flag_min_above_max AS m FROM fact_inventory_snapshot ORDER BY snapshot_id',
    );
    expect(f.rows).toEqual([{ a: false, m: false }, { a: true, m: false }]);
  });

  it('mínimo acima do máximo (R11) é assinalado mas carregado', async () => {
    t = await createTestApp({ csvDir: fixture('min-above-max') });
    const res = await t.api.get('/api/meta/data-quality').expect(200);
    expect(inv(res.body)).toEqual({ file: 'inventory_data.csv', read: 2, flagged: 1, rejected: 0 });
    const log = await t.pool.query('SELECT rule_id FROM etl_quality_log');
    expect(log.rows).toEqual([{ rule_id: 'R11' }]);
  });

  it('idempotente: correr duas vezes deixa os dados idênticos e regista cada execução', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const snapshot = async () => {
      const out: Record<string, unknown> = {};
      for (const tbl of ['dim_item', 'dim_item_type', 'dim_vendor', 'dim_date', 'fact_inventory_snapshot', 'etl_quality_log']) {
        out[tbl] = (await t.pool.query(`SELECT * FROM ${tbl} ORDER BY 1`)).rows;
      }
      return JSON.parse(JSON.stringify(out, (k, v) => (k === 'run_id' ? undefined : v)));
    };
    const before = await snapshot();
    await loadCsvFolder(t.pool, fixture('f1'));
    expect(await snapshot()).toEqual(before);
    const runs = await t.pool.query('SELECT count(*)::int AS n FROM etl_run');
    expect(runs.rows[0].n).toBe(2);
    const res = await t.api.get('/api/meta/data-quality').expect(200);
    expect(res.body.total.read).toBe(8);
  });

  it('não altera os CSV de origem (hash antes e depois)', async () => {
    const before = hashDir(fixture('f1'));
    t = await createTestApp({ csvDir: fixture('f1') });
    expect(hashDir(fixture('f1'))).toEqual(before);
  });

  it('aceita CSV com CRLF e dá o mesmo resultado que com LF', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'etl-crlf-'));
    try {
      for (const f of readdirSync(fixture('f1'))) {
        writeFileSync(join(dir, f), readFileSync(join(fixture('f1'), f), 'utf8').replace(/\n/g, '\r\n'));
      }
      t = await createTestApp({ csvDir: dir });
      const res = await t.api.get('/api/meta/data-quality').expect(200);
      expect(res.body.total).toMatchObject({ read: 8, flagged: 1, rejected: 0 });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
