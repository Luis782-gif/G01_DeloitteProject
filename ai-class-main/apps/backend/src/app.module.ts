import { Module } from '@nestjs/common';
import { DatabaseModule } from './db/database.module';
import { FilterOptionsController } from './filters/filter-options.controller';
import { HealthController } from './health.controller';
import { BelowMinimumController } from './kpis/below-minimum.controller';
import { RotationController } from './kpis/rotation.controller';
import { MetaController } from './meta.controller';

@Module({})
export class AppModule {
  static forRoot(databaseUrl: string) {
    return {
      module: AppModule,
      imports: [DatabaseModule.forRoot(databaseUrl)],
      controllers: [HealthController, MetaController, BelowMinimumController, RotationController, FilterOptionsController],
    };
  }
}
