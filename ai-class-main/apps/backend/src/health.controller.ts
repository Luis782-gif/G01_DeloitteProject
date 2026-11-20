import { Controller, Get, Inject } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from './db/database.module';

@Controller('health')
export class HealthController {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  @Get()
  async health() {
    const { rows } = await this.pool.query('SELECT count(*)::int AS n FROM etl_run');
    return { status: 'ok', database: 'up', etlRuns: rows[0].n };
  }
}
