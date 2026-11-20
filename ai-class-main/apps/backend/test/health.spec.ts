import { createTestApp, fixture, TestApp } from './harness/test-app';

describe('GET /api/health (harness: base de teste + CSV + API HTTP)', () => {
  let t: TestApp;
  afterEach(async () => t?.close());

  it('responde ok sobre uma base de dados vazia', async () => {
    t = await createTestApp();
    const res = await t.api.get('/api/health').expect(200);
    expect(res.body).toEqual({ status: 'ok', database: 'up', etlRuns: 0 });
  });

  it('carrega uma pasta de CSV de teste e a API vê o resultado', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const res = await t.api.get('/api/health').expect(200);
    expect(res.body.etlRuns).toBe(1);
    const { rows } = await t.pool.query('SELECT rows_read FROM etl_run');
    expect(rows[0].rows_read).toBe(5 + 3); // 5 linhas F1 de inventário + 3 fornecedores
  });
});
