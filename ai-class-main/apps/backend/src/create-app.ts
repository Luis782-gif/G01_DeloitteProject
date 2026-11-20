import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import { AppModule } from './app.module';

/** Cria a aplicação Nest (prefixo /api). Usada pelo main.ts e pelo harness de testes. */
export async function createApp(databaseUrl: string): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule.forRoot(databaseUrl), { logger: ['error', 'warn'] });
  app.setGlobalPrefix('api');
  return app;
}
