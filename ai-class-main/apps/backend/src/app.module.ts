import { Module } from '@nestjs/common';
import { DatabaseModule } from './db/database.module';
import { FilterOptionsController } from './filters/filter-options.controller';
import { HealthController } from './health.controller';
import { AbcController } from './kpis/abc.controller';
import { AutonomyController } from './kpis/autonomy.controller';
import { BelowMinimumController } from './kpis/below-minimum.controller';
import { DetailController } from './kpis/detail.controller';
import { ExcessCapitalController } from './kpis/excess-capital.controller';
import { ExplainController } from './kpis/explain/explain.controller';
import { InsightsController } from './kpis/insights.controller';
import { LeadTimeController } from './kpis/lead-time.controller';
import { RotationController } from './kpis/rotation.controller';
import { ShortageCalendarController } from './kpis/shortage-calendar.controller';
import { TriageController } from './kpis/triage.controller';
import { TrendController } from './kpis/trend.controller';
import { VendorsController } from './kpis/vendors.controller';
import { MetaController } from './meta.controller';

@Module({})
export class AppModule {
  static forRoot(databaseUrl: string) {
    return {
      module: AppModule,
      imports: [DatabaseModule.forRoot(databaseUrl)],
      controllers: [HealthController, MetaController, BelowMinimumController, AbcController, AutonomyController, ExcessCapitalController, ExplainController, RotationController, DetailController, LeadTimeController, TrendController, VendorsController, InsightsController, FilterOptionsController, ShortageCalendarController, TriageController],
    };
  }
}
