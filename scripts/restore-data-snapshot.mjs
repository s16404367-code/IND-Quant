#!/usr/bin/env node
/**
 * Restores public/data/ from the single-file snapshot data-snapshot/public-data.zip
 * when public/data/meta.json is missing (fresh clone / GitHub web upload / NSE unreachable).
 *
 * Why: GitHub's web uploader accepts max 100 files at a time, while the data folder has 220+
 * small JSON files. Keeping them inside ONE zip lets the whole project be uploaded in one go.
 *
 * Usage:  node scripts/restore-data-snapshot.mjs          (only if data is missing)
 *         node scripts/restore-data-snapshot.mjs --force  (always overwrite)
 */
import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { unzipSync } from 'fflate';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'public', 'data');
const zipPath = path.join(root, 'data-snapshot', 'public-data.zip');
const force = process.argv.includes('--force');

/** Always copy the news archive (data-snapshot/news/) into public/data/news/ — it is updated hourly. */
function syncNews() {
  const src = path.join(root, 'data-snapshot', 'news');
  if (!existsSync(path.join(src, 'latest.json'))) return;
  cpSync(src, path.join(outDir, 'news'), { recursive: true });
  copyFileSync(path.join(src, 'latest.json'), path.join(outDir, 'news.json'));
  console.log('✓ News archive synced into public/data/news/');
}

if (!force && existsSync(path.join(outDir, 'meta.json'))) {
  console.log('✓ public/data already present — snapshot restore not needed.');
  syncNews();
  process.exit(0);
}
if (!existsSync(zipPath)) {
  console.warn('! data-snapshot/public-data.zip not found — the site will show labelled sample data until `npm run data` succeeds.');
  process.exit(0);
}
const files = unzipSync(new Uint8Array(readFileSync(zipPath)));
let n = 0;
for (const [name, bytes] of Object.entries(files)) {
  if (name.endsWith('/')) continue;
  const safe = path.normalize(name).replace(/^(\.\.(\/|\\|$))+/, '');
  const target = path.join(outDir, safe);
  if (!target.startsWith(outDir)) continue; // zip-slip guard
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, bytes);
  n++;
}
console.log(`✓ Restored ${n} data files from data-snapshot/public-data.zip into public/data/`);
syncNews();
