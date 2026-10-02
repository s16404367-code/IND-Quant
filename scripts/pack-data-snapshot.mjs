#!/usr/bin/env node
/** Packs public/data/ into ONE file: data-snapshot/public-data.zip (run after `npm run data`). */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = path.join(root, 'public', 'data');
if (!existsSync(path.join(dataDir, 'meta.json'))) {
  console.error('public/data/meta.json missing — run `npm run data` first.');
  process.exit(1);
}
const entries = {};
const walk = (dir, rel = '') => {
  for (const f of readdirSync(dir)) {
    const abs = path.join(dir, f);
    const r = rel ? `${rel}/${f}` : f;
    if (statSync(abs).isDirectory()) walk(abs, r);
    else entries[r] = new Uint8Array(readFileSync(abs));
  }
};
walk(dataDir);
mkdirSync(path.join(root, 'data-snapshot'), { recursive: true });
writeFileSync(path.join(root, 'data-snapshot', 'public-data.zip'), zipSync(entries, { level: 9 }));
console.log(`✓ Packed ${Object.keys(entries).length} files into data-snapshot/public-data.zip`);
