import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MODE_STORAGE_KEY, initModeScript, readMode, saveMode } from './mode';

const fakeStorage = (init: Record<string, string> = {}) => {
  const data = { ...init };
  return {
    data,
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => void (data[k] = v),
  };
};

test('sem escolha guardada, o modo por defeito é Consulta (claro)', () => {
  assert.equal(readMode(fakeStorage()), 'consulta');
});

test('a escolha guardada persiste entre leituras (recarregar)', () => {
  const s = fakeStorage();
  saveMode(s, 'bloco-operatorio');
  assert.equal(readMode(s), 'bloco-operatorio');
});

test('valores inválidos ou armazenamento indisponível voltam a Consulta', () => {
  assert.equal(readMode(fakeStorage({ [MODE_STORAGE_KEY]: 'neon' })), 'consulta');
  const broken = { getItem: () => { throw new Error('bloqueado'); }, setItem: () => { throw new Error('bloqueado'); } };
  assert.equal(readMode(broken), 'consulta');
  assert.doesNotThrow(() => saveMode(broken, 'bloco-operatorio'));
});

test('script inicial aplica o modo guardado ao <html> antes da pintura (sem flash)', () => {
  const run = (stored: string | null) => {
    const root = { dataset: {} as Record<string, string> };
    const localStorage = { getItem: () => stored };
    new Function('document', 'localStorage', initModeScript())({ documentElement: root }, localStorage);
    return root.dataset.mode;
  };
  assert.equal(run('bloco-operatorio'), 'bloco-operatorio');
  assert.equal(run(null), 'consulta');
  assert.equal(run('lixo'), 'consulta');
});
