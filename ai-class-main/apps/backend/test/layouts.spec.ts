import { createTestApp, fixture, TestApp } from './harness/test-app';
import { loadCsvFolder } from '../src/etl/load-csv-folder';

const tile = (id: string, position: number, w = 6, h = 1) => ({ id, position, w, h });
const layout = { pages: { pulso: { tiles: [tile('autonomia', 1, 12, 2), tile('triagem', 2)] }, receita: { tiles: [tile('simulador', 1, 4)] } } };

describe('/api/layouts/:profile', () => {
  let t: TestApp;
  afterEach(async () => t?.close());

  it('GET devolve 404 { error } sem layout guardado', async () => {
    t = await createTestApp();
    const res = await t.api.get('/api/layouts/diretor').expect(404);
    expect(typeof res.body.error).toBe('string');
  });

  it('PUT guarda e GET devolve o mesmo layout; PUT substitui', async () => {
    t = await createTestApp();
    await t.api.put('/api/layouts/diretor').send({ layout }).expect(200);
    expect((await t.api.get('/api/layouts/diretor').expect(200)).body).toEqual({ layout });
    const outro = { pages: { porque: { tiles: [tile('fornecedores', 1, 12)] } } };
    await t.api.put('/api/layouts/diretor').send({ layout: outro }).expect(200);
    expect((await t.api.get('/api/layouts/diretor').expect(200)).body).toEqual({ layout: outro });
    await t.api.get('/api/layouts/comprador').expect(404); // perfis independentes
  });

  it('DELETE apaga e é idempotente (204)', async () => {
    t = await createTestApp();
    await t.api.put('/api/layouts/comprador').send({ layout }).expect(200);
    await t.api.delete('/api/layouts/comprador').expect(204);
    await t.api.get('/api/layouts/comprador').expect(404);
    await t.api.delete('/api/layouts/comprador').expect(204);
  });

  const big = { pages: { pulso: { tiles: [tile('a', 1)] } }, extra: 'x'.repeat(20000) };
  it.each([
    ['perfil inválido', '/api/layouts/admin', { layout }, 'profile'],
    ['página desconhecida', '/api/layouts/diretor', { layout: { pages: { xpto: { tiles: [] } } } }, 'layout.pages.xpto'],
    ['sem layout', '/api/layouts/diretor', {}, 'layout'],
    ['w fora dos limites', '/api/layouts/diretor', { layout: { pages: { pulso: { tiles: [tile('a', 1, 13)] } } } }, 'layout.pages.pulso.tiles[0].w'],
    ['w a zero', '/api/layouts/diretor', { layout: { pages: { pulso: { tiles: [tile('a', 1, 0)] } } } }, 'layout.pages.pulso.tiles[0].w'],
    ['posição não inteira', '/api/layouts/diretor', { layout: { pages: { pulso: { tiles: [tile('a', 1.5)] } } } }, 'layout.pages.pulso.tiles[0].position'],
    ['id não é texto', '/api/layouts/diretor', { layout: { pages: { pulso: { tiles: [{ id: 5, position: 1, w: 1, h: 1 }] } } } }, 'layout.pages.pulso.tiles[0].id'],
    ['id repetido', '/api/layouts/diretor', { layout: { pages: { pulso: { tiles: [tile('a', 1), tile('a', 2)] } } } }, 'layout.pages.pulso.tiles[1].id'],
    ['JSON demasiado grande', '/api/layouts/diretor', { layout: big }, 'layout'],
  ])('PUT rejeita com 400 { error, field }: %s', async (_n, url, body, field) => {
    t = await createTestApp();
    const res = await t.api.put(url).send(body).expect(400);
    expect(typeof res.body.error).toBe('string');
    expect(res.body.field).toBe(field);
  });

  it('o layout sobrevive a um refresh do ETL', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    await t.api.put('/api/layouts/gestor-armazem').send({ layout }).expect(200);
    await loadCsvFolder(t.pool, fixture('f1'));
    expect((await t.api.get('/api/layouts/gestor-armazem').expect(200)).body).toEqual({ layout });
  });
});
