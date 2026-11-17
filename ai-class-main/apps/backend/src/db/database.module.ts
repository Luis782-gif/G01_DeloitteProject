import { Global, Inject, Injectable, Module, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';

export const PG_POOL = 'PG_POOL';

@Injectable()
class PoolShutdown implements OnModuleDestroy {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}
  async onModuleDestroy() {
    await this.pool.end();
  }
}

/** Fornece o Pool do `pg`. O URL é passado a `forRoot` (vem de DATABASE_URL em produção, da base de teste nos testes). */
@Global()
@Module({})
export class DatabaseModule {
  static forRoot(databaseUrl: string) {
    return {
      module: DatabaseModule,
      providers: [
        { provide: PG_POOL, useFactory: () => new Pool({ connectionString: databaseUrl }) },
        PoolShutdown,
      ],
      exports: [PG_POOL],
    };
  }
}
