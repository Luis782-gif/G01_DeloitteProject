/** Configuração do backend, lida só de variáveis de ambiente. */
export interface AppConfig {
  databaseUrl: string;
  port: number;
  /** Pasta com os CSV a carregar (usada pelo ETL, ticket #4). */
  dataDir: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL não está definida (ver .env.example).');
  }
  return {
    databaseUrl,
    port: Number(env.BACKEND_PORT ?? 3001),
    dataDir: env.DATA_DIR ?? './data',
  };
}
