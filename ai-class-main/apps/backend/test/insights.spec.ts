import { pulsoSentences, vendorsSentences } from '../src/kpis/insights';
import { createTestApp, fixture, TestApp } from './harness/test-app';

// F1 (à mão): 5 artigos, todos com autonomia < tempo de reposição (folga negativa).
//  Excesso (spec 12.1): 12 945 643,47 € = 14,37 % do valor de stock -> "12,9 M€" e "14,4 %".
//  Valor de stock: 107 44,57 M€; 108 Gloves 27,48 M€ -> 79,97 % acumulado: ambos classe A (e ambos com folga negativa).
describe('GET /api/insights', () => {
  let t: TestApp;
  afterEach(async () => t?.close());
  const get = async (qs: string) => (await t.api.get(`/api/insights${qs}`).expect(200)).body;

  it('Pulso com F1: frase do template, com valores', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const b = await get('?page=pulso');
    expect(b.sentences).toHaveLength(1);
    expect(b.sentences[0].text).toBe('5 de 5 artigos têm dias de folga negativos; o capital em excesso é 12,9 M€ (14,4 % do valor de stock).');
    expect(b.sentences[0].values).toMatchObject({ nFolgaNeg: 5, nArtigos: 5, excessoEur: 12945643.47, excessoPct: 14.37 });
  });

  it('os números mudam com o filtro e coincidem com os KPI com o mesmo filtro (tipo=Equipment)', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const qs = '?tipo=Equipment';
    const b = await get(`${qs}&page=pulso`);
    expect(b.sentences[0].text).toBe('4 de 4 artigos têm dias de folga negativos; o capital em excesso é 0 € (0 % do valor de stock).');
    const sr = (await t.api.get(`/api/kpis/shortage-rate${qs}`).expect(200)).body;
    const ex = (await t.api.get(`/api/kpis/excess-capital${qs}`).expect(200)).body;
    expect(b.sentences[0].values).toMatchObject({ nFolgaNeg: sr.count, nArtigos: sr.n, excessoEur: ex.valueEur, excessoPct: ex.pct });
  });

  it('Onde dói: artigos de classe A com folga negativa (sem falar de triagem)', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const b = await get('?page=onde-doi');
    expect(b.sentences[0].text).toBe('2 artigos de classe A têm dias de folga negativos.');
    expect(b.sentences[0].text).not.toMatch(/triagem/i);
    const pareto = (await t.api.get('/api/abc/pareto').expect(200)).body;
    expect(pareto.filter((p: any) => p.class === 'A')).toHaveLength(2);
  });

  it('Porquê: intervalo do tempo de reposição e distinção de fornecedores (vendors3: 10 a 15 dias)', async () => {
    t = await createTestApp({ csvDir: fixture('vendors3') });
    const wide = await get('?page=porque');
    expect(wide.sentences[0].text).toBe('O tempo médio de reposição varia entre 10 e 15 dias entre fornecedores.');
    expect(wide.sentences[0].values).toMatchObject({ min: 10, max: 15 });
    expect(wide.sentences[1].text).not.toMatch(/nenhum fornecedor se distingue/i);
    const narrow = await get('?page=porque&distinguishDays=6');
    const api = (await t.api.get('/api/vendors?distinguishDays=6').expect(200)).body;
    expect(narrow.sentences[1].text).toMatch(/nenhum fornecedor se distingue/i);
    expect(narrow.sentences[1].text).toBe(api.distinguishText);
  });

  it('Receita: frase prudente com artigos de folga negativa', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    const b = await get('?page=receita');
    expect(b.sentences[0].text).toBe('5 artigos têm dias de folga negativos: o stock não chega para o tempo de reposição.');
  });

  it('sem dados: as frases omitem as cláusulas (lista vazia)', async () => {
    t = await createTestApp();
    for (const page of ['pulso', 'onde-doi', 'porque', 'receita']) {
      expect((await get(`?page=${page}`)).sentences).toEqual([]);
    }
  });

  it('página inválida: 400; filtro inválido: 400', async () => {
    t = await createTestApp({ csvDir: fixture('f1') });
    await t.api.get('/api/insights?page=x').expect(400);
    await t.api.get('/api/insights?page=pulso&periodo=lixo').expect(400);
  });
});

describe('templates: omissão de cláusulas', () => {
  it('Pulso sem a contagem: só a cláusula do excesso; sem o excesso: só a contagem', () => {
    const ex = { valueEur: 1_500_000, totalValueEur: 10_000_000, pct: 15 };
    expect(pulsoSentences(null, ex)[0].text).toBe('O capital em excesso é 1,5 M€ (15 % do valor de stock).');
    expect(pulsoSentences({ count: 1, n: 3 }, null)[0].text).toBe('1 de 3 artigos têm dias de folga negativos.');
    expect(pulsoSentences(null, null)).toEqual([]);
  });
  it('Porquê com menos de dois fornecedores: sem o intervalo', () => {
    expect(vendorsSentences([10], { distinguishes: false, text: 'x' })).toEqual([{ text: 'x', values: {} }]);
  });
});
