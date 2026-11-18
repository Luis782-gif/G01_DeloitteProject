import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Pool, PoolClient } from 'pg';
import { InventoryRecord, QualityEntry, transformInventory, transformVendors, VendorRecord } from './transform';

export const CSV_FILES = [
  'inventory_data.csv',
  'vendor_data.csv',
  'financial_data.csv',
  'patient_data.csv',
  'staff_data.csv',
] as const;

export interface EtlResult {
  runId: number;
  rowsRead: number;
  rowsLoaded: number;
  rowsFlagged: number;
  rowsRejected: number;
}

const ymd = (iso: string) => Number(iso.replaceAll('-', ''));

/**
 * ETL: lê os CSV da pasta e substitui, numa só transação, o conteúdo das dimensões, do facto e do
 * registo de qualidade da execução anterior. Idempotente: os mesmos CSV dão a mesma base de dados
 * (exceto `etl_run`/`etl_run_file`, que guardam o histórico das execuções). Nunca escreve nos CSV.
 */
export async function loadCsvFolder(pool: Pool, dir: string): Promise<EtlResult> {
  const read = (file: string) => readFileSync(join(dir, file), 'utf8');
  // Leitura e validação antes de tocar na base: um ficheiro ilegível não deixa estado a meio.
  const vendors = transformVendors(read('vendor_data.csv'));
  const knownVendors = new Set(vendors.records.map((v) => v.vendorId));
  const inventory = transformInventory(read('inventory_data.csv'), knownVendors);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(4)');

    const rowsRead = vendors.rowsRead + inventory.rowsRead;
    const rowsFlagged = vendors.rowsFlagged + inventory.rowsFlagged;
    const rowsRejected = vendors.rowsRejected + inventory.rowsRejected;
    const rowsLoaded = vendors.records.length + inventory.records.length;

    const { rows } = await client.query(
      `INSERT INTO etl_run (rows_read, rows_loaded, rows_flagged, rows_rejected)
       VALUES ($1, $2, $3, $4) RETURNING run_id`,
      [rowsRead, rowsLoaded, rowsFlagged, rowsRejected],
    );
    const runId: number = rows[0].run_id;

    await client.query(
      `TRUNCATE etl_quality_log, fact_inventory_snapshot, dim_item, dim_item_type, dim_vendor, dim_date
       RESTART IDENTITY`,
    );

    await insertVendors(client, vendors.records);
    await insertInventory(client, runId, inventory.records);
    await insertLog(client, runId, 'vendor_data.csv', vendors.log);
    await insertLog(client, runId, 'inventory_data.csv', inventory.log);
    for (const [file, t] of [['inventory_data.csv', inventory], ['vendor_data.csv', vendors]] as const) {
      await client.query(
        `INSERT INTO etl_run_file (run_id, source_file, rows_read, rows_flagged, rows_rejected)
         VALUES ($1, $2, $3, $4, $5)`,
        [runId, file, t.rowsRead, t.rowsFlagged, t.rowsRejected],
      );
    }
    await client.query('UPDATE etl_run SET finished_at = now() WHERE run_id = $1', [runId]);
    await client.query('COMMIT');
    return { runId, rowsRead, rowsLoaded, rowsFlagged, rowsRejected };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function insertVendors(c: PoolClient, vendors: VendorRecord[]) {
  for (const v of vendors) {
    await c.query(
      `INSERT INTO dim_vendor (vendor_id, vendor_name, item_supplied, declared_lead_time_days, cost_per_item,
                               last_order_date, next_delivery_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [v.vendorId, v.vendorName, v.itemSupplied, v.declaredLeadTimeDays, v.costPerItem, v.lastOrderDate, v.nextDeliveryDate],
    );
  }
}

async function insertInventory(c: PoolClient, runId: number, recs: InventoryRecord[]) {
  if (recs.length === 0) return;
  // Dimensões, depois facto. Ordem determinística para que os ids sejam iguais em cada execução.
  const types = [...new Set(recs.map((r) => r.itemType))].sort();
  for (const t of types) await c.query('INSERT INTO dim_item_type (item_type) VALUES ($1)', [t]);
  const items = [...new Map(recs.map((r) => [`${r.itemId}|${r.itemName}`, r] as const)).values()].sort(
    (a, b) => a.itemId - b.itemId || (a.itemName < b.itemName ? -1 : a.itemName > b.itemName ? 1 : 0),
  );
  for (const i of items) await c.query('INSERT INTO dim_item (item_id, item_name) VALUES ($1, $2)', [i.itemId, i.itemName]);

  const dates = recs.map((r) => r.date).sort();
  await c.query(
    `INSERT INTO dim_date (date_key, date, year, quarter, month, day)
     SELECT to_char(d, 'YYYYMMDD')::int, d::date, extract(year from d), extract(quarter from d),
            extract(month from d), extract(day from d)
       FROM generate_series($1::date, $2::date, interval '1 day') AS g(d)`,
    [dates[0], dates[dates.length - 1]],
  );

  const itemSk = new Map((await c.query('SELECT item_sk, item_id, item_name FROM dim_item')).rows.map(
    (r) => [`${r.item_id}|${r.item_name}`, r.item_sk as number] as const));
  const typeId = new Map((await c.query('SELECT item_type_id, item_type FROM dim_item_type')).rows.map(
    (r) => [r.item_type as string, r.item_type_id as number] as const));

  const ordered = [...recs].sort((a, b) => a.line - b.line);
  for (const r of ordered) {
    await c.query(
      `INSERT INTO fact_inventory_snapshot
         (date_key, item_sk, item_type_id, vendor_id, current_stock, min_required, max_capacity, unit_cost,
          avg_usage_per_day, restock_lead_time_days, stock_value, flag_stock_above_max, flag_min_above_max,
          source_line, run_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$5::int * $8::numeric,$11,$12,$13,$14)`,
      [
        ymd(r.date), itemSk.get(`${r.itemId}|${r.itemName}`), typeId.get(r.itemType), r.vendorId, r.currentStock,
        r.minRequired, r.maxCapacity, r.unitCost, r.avgUsagePerDay, r.restockLeadTimeDays,
        r.flagStockAboveMax, r.flagMinAboveMax, r.line, runId,
      ],
    );
  }
}

async function insertLog(c: PoolClient, runId: number, file: string, entries: QualityEntry[]) {
  for (const e of entries) {
    await c.query(
      `INSERT INTO etl_quality_log (run_id, source_file, source_line, rule_id, level, message)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [runId, file, e.line, e.rule, e.level, e.message],
    );
  }
}

