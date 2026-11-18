import { parseCsv } from './csv';

export type Level = 'reject' | 'flag';

export interface QualityEntry {
  line: number;
  rule: string;
  level: Level;
  message: string;
}

export interface VendorRecord {
  line: number;
  vendorId: string;
  vendorName: string;
  itemSupplied: string;
  declaredLeadTimeDays: number;
  costPerItem: string;
  lastOrderDate: string;
  nextDeliveryDate: string;
}

export interface InventoryRecord {
  line: number;
  date: string;
  itemId: number;
  itemName: string;
  itemType: string;
  currentStock: number;
  minRequired: number;
  maxCapacity: number;
  unitCost: string;
  avgUsagePerDay: number;
  restockLeadTimeDays: number;
  vendorId: string;
  flagStockAboveMax: boolean;
  flagMinAboveMax: boolean;
}

export interface Transformed<T> {
  records: T[];
  log: QualityEntry[];
  rowsRead: number;
  rowsFlagged: number;
  rowsRejected: number;
}

export const ITEM_TYPES = ['Consumable', 'Equipment'] as const;

const INVENTORY_COLUMNS = [
  'Date', 'Item_ID', 'Item_Type', 'Item_Name', 'Current_Stock', 'Min_Required', 'Max_Capacity',
  'Unit_Cost', 'Avg_Usage_Per_Day', 'Restock_Lead_Time', 'Vendor_ID',
] as const;
const VENDOR_COLUMNS = [
  'Vendor_ID', 'Vendor_Name', 'Item_Supplied', 'Avg_Lead_Time (days)', 'Cost_Per_Item', 'Last_Order_Date', 'Next_Delivery_Date',
] as const;

const INT_MAX = 2147483647;

class Reject extends Error {
  constructor(readonly rule: string, message: string) {
    super(message);
  }
}

const clean = (s: string) => s.trim().replace(/\s+/g, ' ');

function toDate(raw: string, col: string): string {
  const s = raw.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (m) {
    const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (y >= 1900 && dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d) return s;
  }
  throw new Reject('R02', `Data inválida em ${col}: "${raw}"`);
}

function toInt(raw: string, col: string): number {
  const s = raw.trim();
  if (/^-?\d+$/.test(s)) {
    const n = Number(s);
    if (Math.abs(n) <= INT_MAX) return n;
  }
  throw new Reject('R03', `Número inteiro não interpretável em ${col}: "${raw}"`);
}

function toDecimal(raw: string, col: string): string {
  const s = raw.trim();
  if (/^-?\d+(\.\d+)?$/.test(s) && Math.abs(Number(s)) < 1e10) return s;
  throw new Reject('R03', `Número decimal não interpretável em ${col}: "${raw}"`);
}

function toText(raw: string, col: string): string {
  const s = clean(raw);
  if (s === '') throw new Reject('R03', `Valor em falta em ${col}`);
  return s;
}

/** Cabeçalho -> mapa nome -> índice. Falha (ficheiro ilegível) se faltar uma coluna esperada. */
function header(cells: string[], expected: readonly string[], file: string): Map<string, number> {
  const idx = new Map(cells.map((c, i) => [c.trim(), i] as const));
  const missing = expected.filter((c) => !idx.has(c));
  if (missing.length) throw new Error(`${file}: colunas em falta no cabeçalho: ${missing.join(', ')}`);
  return idx;
}

function run<T>(
  text: string,
  file: string,
  expected: readonly string[],
  build: (get: (col: string) => string, line: number) => { record: T; flags: Omit<QualityEntry, 'line' | 'level'>[] },
  isDuplicate: (r: T) => string | null,
): Transformed<T> {
  const rows = parseCsv(text);
  if (rows.length === 0) throw new Error(`${file}: ficheiro vazio`);
  const idx = header(rows[0].cells, expected, file);
  const out: Transformed<T> = { records: [], log: [], rowsRead: 0, rowsFlagged: 0, rowsRejected: 0 };
  const seen = new Set<string>();

  for (const row of rows.slice(1)) {
    out.rowsRead++;
    if (row.cells.length !== rows[0].cells.length) {
      out.rowsRejected++;
      out.log.push({
        line: row.line, rule: 'R01', level: 'reject',
        message: `Número de colunas errado: ${row.cells.length} em vez de ${rows[0].cells.length}`,
      });
      continue;
    }
    try {
      const { record, flags } = build((c) => row.cells[idx.get(c)!], row.line);
      const dup = isDuplicate(record);
      if (dup !== null) {
        if (seen.has(dup)) throw new Reject('R04', `Chave duplicada (${dup}); mantida a primeira ocorrência`);
        seen.add(dup);
      }
      out.records.push(record);
      if (flags.length) out.rowsFlagged++;
      for (const f of flags) out.log.push({ line: row.line, level: 'flag', ...f });
    } catch (e) {
      if (!(e instanceof Reject)) throw e;
      out.rowsRejected++;
      out.log.push({ line: row.line, rule: e.rule, level: 'reject', message: e.message });
    }
  }
  return out;
}

export function transformVendors(text: string): Transformed<VendorRecord> {
  return run<VendorRecord>(
    text, 'vendor_data.csv', VENDOR_COLUMNS,
    (get, line) => ({
      record: {
        line,
        vendorId: toText(get('Vendor_ID'), 'Vendor_ID'),
        vendorName: toText(get('Vendor_Name'), 'Vendor_Name'),
        itemSupplied: toText(get('Item_Supplied'), 'Item_Supplied'),
        declaredLeadTimeDays: toInt(get('Avg_Lead_Time (days)'), 'Avg_Lead_Time (days)'),
        costPerItem: toDecimal(get('Cost_Per_Item'), 'Cost_Per_Item'),
        lastOrderDate: toDate(get('Last_Order_Date'), 'Last_Order_Date'),
        nextDeliveryDate: toDate(get('Next_Delivery_Date'), 'Next_Delivery_Date'),
      },
      flags: [],
    }),
    (r) => r.vendorId,
  );
}

/** `knownVendors`: Vendor_ID realmente carregados em dim_vendor (R05). */
export function transformInventory(text: string, knownVendors: ReadonlySet<string>): Transformed<InventoryRecord> {
  return run<InventoryRecord>(
    text, 'inventory_data.csv', INVENTORY_COLUMNS,
    (get, line) => {
      const date = toDate(get('Date'), 'Date');
      const itemId = toInt(get('Item_ID'), 'Item_ID');
      const rawType = toText(get('Item_Type'), 'Item_Type');
      const itemName = toText(get('Item_Name'), 'Item_Name');
      const currentStock = toInt(get('Current_Stock'), 'Current_Stock');
      const minRequired = toInt(get('Min_Required'), 'Min_Required');
      const maxCapacity = toInt(get('Max_Capacity'), 'Max_Capacity');
      const unitCost = toDecimal(get('Unit_Cost'), 'Unit_Cost');
      const avgUsagePerDay = toInt(get('Avg_Usage_Per_Day'), 'Avg_Usage_Per_Day');
      const restockLeadTimeDays = toInt(get('Restock_Lead_Time'), 'Restock_Lead_Time');
      const vendorId = toText(get('Vendor_ID'), 'Vendor_ID');
      if (!knownVendors.has(vendorId)) {
        throw new Reject('R05', `Vendor_ID inexistente em dim_vendor: "${vendorId}"`);
      }

      const itemType = ITEM_TYPES.find((t) => t.toLowerCase() === rawType.toLowerCase()) ?? rawType;
      const flags: Omit<QualityEntry, 'line' | 'level'>[] = [];
      const flagStockAboveMax = currentStock > maxCapacity;
      const flagMinAboveMax = minRequired > maxCapacity;
      if (flagStockAboveMax) {
        flags.push({ rule: 'R10', message: `Stock ${currentStock} acima da capacidade máxima ${maxCapacity}` });
      }
      if (flagMinAboveMax) {
        flags.push({ rule: 'R11', message: `Mínimo ${minRequired} acima da capacidade máxima ${maxCapacity}` });
      }
      const bad: string[] = [];
      if (currentStock < 0) bad.push(`Current_Stock ${currentStock} < 0`);
      if (Number(unitCost) <= 0) bad.push(`Unit_Cost ${unitCost} <= 0`);
      if (avgUsagePerDay < 0) bad.push(`Avg_Usage_Per_Day ${avgUsagePerDay} < 0`);
      if (restockLeadTimeDays <= 0) bad.push(`Restock_Lead_Time ${restockLeadTimeDays} <= 0`);
      if (bad.length) flags.push({ rule: 'R12', message: `Valor fora do domínio: ${bad.join('; ')}` });
      if (!(ITEM_TYPES as readonly string[]).includes(itemType)) {
        flags.push({ rule: 'R13', message: `Item_Type fora da lista (Consumable, Equipment): "${rawType}"` });
      }

      return {
        record: {
          line, date, itemId, itemName, itemType, currentStock, minRequired, maxCapacity, unitCost,
          avgUsagePerDay, restockLeadTimeDays, vendorId, flagStockAboveMax, flagMinAboveMax,
        },
        flags,
      };
    },
    (r) => `${r.date}|${r.itemId}|${r.itemName}`,
  );
}
