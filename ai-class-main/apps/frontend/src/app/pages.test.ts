import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { PAGES } from './pages';

const appDir = __dirname;

test('as 4 páginas existem, na ordem da spec, e cada uma mostra o seu título', () => {
  assert.deepEqual(
    PAGES.map((p) => p.title),
    ['Pulso do hospital', 'Onde dói', 'Porquê', 'Receita'],
  );
  for (const p of PAGES) {
    const file = join(appDir, p.href === '/' ? '' : p.href, 'page.tsx');
    assert.ok(existsSync(file), `falta ${file}`);
    assert.match(readFileSync(file, 'utf8'), new RegExp(`<h1>${p.title}</h1>`));
  }
});

test('o frontend não acede à base de dados nem lê CSV (só chama a API)', () => {
  const walk = (d: string): string[] =>
    readdirSync(d).flatMap((f) => {
      const p = join(d, f);
      return statSync(p).isDirectory() ? walk(p) : [p];
    });
  const sources = walk(join(appDir, '..')).filter((f) => /\.(tsx?|mjs)$/.test(f) && !f.endsWith('.test.ts'));
  for (const f of sources) {
    const src = readFileSync(f, 'utf8');
    assert.doesNotMatch(src, /from ['"](pg|node:fs|fs)['"]/, `${f} importa pg/fs`);
    assert.doesNotMatch(src, /\.csv|DATABASE_URL/, `${f} refere CSV ou DATABASE_URL`);
  }
});
