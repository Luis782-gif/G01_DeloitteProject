import { Module } from '@nestjs/common';
import { DatabaseModule } from './db/database.module';
import { FilterOptionsController } from './filters/filter-options.controller';
import { HealthController } from './health.controller';
import { AutonomyController } from './kpis/autonomy.controller';
import { BelowMinimumController } from './kpis/below-minimum.controller';
import { ExplainController } from './kpis/explain/explain.controller';
import { MetaController } from './meta.controller';

@Module({})
export class AppModule {
  static forRoot(databaseUrl: string) {
    return {
      module: AppModule,
      imports: [DatabaseModule.forRoot(databaseUrl)],
      controllers: [HealthController, MetaController, BelowMinimumController, AutonomyController, ExplainController, FilterOptionsController],
    };
  }
}
