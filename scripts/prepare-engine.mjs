import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
const require = createRequire(import.meta.url);
const source = dirname(require.resolve('stockfish/package.json'));
const target = new URL('../public/engine/', import.meta.url);
await mkdir(target, { recursive: true });
const files = {};
for (const name of [
  'stockfish-19-lite-single.js',
  'stockfish-19-lite-single.wasm',
  'stockfish-19-single.js',
  'stockfish-19-single.wasm',
  'Copying.txt',
]) {
  const input = join(source, name === 'Copying.txt' ? name : 'bin/' + name);
  await copyFile(input, new URL(name, target));
  files[name] = {
    sha256: createHash('sha256')
      .update(await readFile(input))
      .digest('hex'),
  };
}
await writeFile(
  new URL('SOURCE.json', target),
  JSON.stringify(
    {
      package: 'stockfish',
      version: '19.0.1',
      license: 'GPL-3.0',
      upstream: 'https://github.com/nmrugg/stockfish.js',
      source: 'https://github.com/nmrugg/stockfish.js/tree/v19.0.1',
      files,
    },
    null,
    2,
  ),
);
console.log('Stockfish 19.0.1: Lite and Full single-threaded engines ready.');
