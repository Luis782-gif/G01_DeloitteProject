import { Module } from '@nestjs/common';
import { DatabaseModule } from './db/database.module';
import { FilterOptionsController } from './filters/filter-options.controller';
import { HealthController } from './health.controller';
import { AbcController } from './kpis/abc.controller';
import { AutonomyController } from './kpis/autonomy.controller';
import { BelowMinimumController } from './kpis/below-minimum.controller';
import { ExplainController } from './kpis/explain/explain.controller';
import { RotationController } from './kpis/rotation.controller';
import { MetaController } from './meta.controller';

@Module({})
export class AppModule {
  static forRoot(databaseUrl: string) {
    return {
      module: AppModule,
      imports: [DatabaseModule.forRoot(databaseUrl)],
      controllers: [HealthController, MetaController, BelowMinimumController, AbcController, AutonomyController, ExplainController, RotationController, FilterOptionsController],
    };
  }
}
