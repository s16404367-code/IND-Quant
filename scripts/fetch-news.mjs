#!/usr/bin/env node
/**
 * Hourly news refresh (used by .github/workflows/news-refresh.yml, or run locally: `npm run news`).
 * Adds every new headline to the permanent archive in data-snapshot/news/ — nothing is ever deleted.
 * Needs public/data/universe.json (stock names for matching) — restored automatically from the snapshot.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { refreshNewsArchive } from './news-archive.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let stocks = [];
try {
  stocks = JSON.parse(await readFile(path.join(root, 'public', 'data', 'universe.json'), 'utf8')).items;
} catch {
  console.warn('! public/data/universe.json missing — headlines will not be matched to stocks. Run `npm run data:restore` first.');
}
const { latest } = await refreshNewsArchive({ root, stocks, seedFile: path.join(root, 'public', 'data', 'news.json') });
await mkdir(path.join(root, 'public', 'data'), { recursive: true });
await writeFile(path.join(root, 'public', 'data', 'news.json'), JSON.stringify(latest));
