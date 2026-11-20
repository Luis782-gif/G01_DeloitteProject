import { BadRequestException, Controller, Get, Inject, Query } from '@nestjs/common';
import type { Pool } from 'pg';
import { PG_POOL } from '../db/database.module';
import { AbcController } from './abc.controller';
import { AutonomyController } from './autonomy.controller';
import { ExcessCapitalController } from './excess-capital.controller';
import { ondeDoiSentences, pulsoSentences, receitaSentences, vendorsSentences, type Sentence } from './insights';
import { VendorsController } from './vendors.controller';

const PAGES = ['pulso', 'onde-doi', 'porque', 'receita'] as const;

/** Frases-insight por página. Cada número vem das mesmas consultas dos KPI (os controladores existentes), com os mesmos filtros. */
@Controller('insights')
export class InsightsController {
  private readonly autonomy: AutonomyController;
  private readonly excess: ExcessCapitalController;
  private readonly abc: AbcController;
  private readonly vendors: VendorsController;

  constructor(@Inject(PG_POOL) pool: Pool) {
    this.autonomy = new AutonomyController(pool);
    this.excess = new ExcessCapitalController(pool);
    this.abc = new AbcController(pool);
    this.vendors = new VendorsController(pool);
  }

  @Get()
  async insights(@Query() query: Record<string, unknown>): Promise<{ sentences: Sentence[] }> {
    const page = query.page;
    if (typeof page !== 'string' || !(PAGES as readonly string[]).includes(page)) {
      throw new BadRequestException({ error: `Página inválida: ${String(page)}`, field: 'page' });
    }
    return { sentences: await this.build(page as (typeof PAGES)[number], query) };
  }

  private async build(page: (typeof PAGES)[number], query: Record<string, unknown>): Promise<Sentence[]> {
    switch (page) {
      case 'pulso': {
        const [s, e] = await Promise.all([this.autonomy.shortageRate(query), this.excess.excessCapital(query)]);
        return pulsoSentences({ count: s.count, n: s.n }, { valueEur: e.valueEur, totalValueEur: e.totalValueEur, pct: e.pct });
      }
      case 'onde-doi': {
        const [slack, pareto] = await Promise.all([this.autonomy.slackDaysKpi(query), this.abc.pareto(query)]);
        const classA = new Set(pareto.filter((p) => p.class === 'A').map((p) => p.itemRef));
        return ondeDoiSentences(slack.items.filter((i) => i.slack !== null && i.slack < 0 && classA.has(i.itemRef)).length);
      }
      case 'porque': {
        const v = await this.vendors.vendors(query);
        const means = v.vendors.flatMap((x) => (x.mean === null ? [] : [x.mean]));
        return vendorsSentences(means, { distinguishes: v.distinguishes, text: v.distinguishText });
      }
      case 'receita':
        return receitaSentences((await this.autonomy.shortageRate(query)).count);
    }
  }
}
