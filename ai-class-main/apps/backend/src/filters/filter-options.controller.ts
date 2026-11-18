import { Controller, Get, Inject } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/database.module';
import { itemRef } from '../kpis/reference-snapshot';

@Controller('filters')
export class FilterOptionsController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  /** Valores disponíveis de cada slicer e o intervalo de datas do facto (spec 11). Classe e triagem chegam depois. */
  @Get('options')
  async options() {
    const items = (await this.pool.query('SELECT item_id, item_name FROM dim_item ORDER BY item_id, item_name')).rows;
    const types = (await this.pool.query('SELECT item_type FROM dim_item_type ORDER BY item_type')).rows;
    const vendors = (await this.pool.query('SELECT vendor_id, vendor_name FROM dim_vendor ORDER BY vendor_id')).rows;
    const range = (
      await this.pool.query(
        `SELECT to_char(min(d.date), 'YYYY-MM-DD') AS min, to_char(max(d.date), 'YYYY-MM-DD') AS max
           FROM fact_inventory_snapshot f JOIN dim_date d ON d.date_key = f.date_key`,
      )
    ).rows[0];
    return {
      items: items.map((i) => ({ itemRef: itemRef(i.item_id, i.item_name), name: i.item_name as string })),
      types: types.map((t) => t.item_type as string),
      vendors: vendors.map((v) => ({ vendorId: v.vendor_id as string, name: v.vendor_name as string })),
      dateRange: { min: (range.min as string | null) ?? null, max: (range.max as string | null) ?? null },
    };
  }
}
