#!/usr/bin/env node
/** Writes the in-app legal texts to /LEGAL/*.md so they are also visible on GitHub. */
import { writeFile, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getLegalDocuments } from '../src/legal/legalContent.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cfgSrc = await readFile(path.join(root, 'src/config/siteConfig.ts'), 'utf8');
const pick = (k) => (cfgSrc.match(new RegExp(`${k}:\\s*'([^']*)'`)) || [])[1] ?? '';
const cfg = {
  ownerDisplayName: pick('ownerDisplayName'),
  contactEmail: pick('contactEmail'),
  jurisdictionCity: pick('jurisdictionCity'),
  legalEffectiveDate: pick('legalEffectiveDate'),
  siteName: pick('siteName'),
  legalVersion: pick('legalVersion'),
};

const files = { disclaimer: 'DISCLAIMER.md', risk: 'RISK_DISCLOSURE.md', terms: 'TERMS_OF_USE.md', privacy: 'PRIVACY_POLICY.md', sources: 'DATA_SOURCES.md' };
await mkdir(path.join(root, 'LEGAL'), { recursive: true });
for (const doc of getLegalDocuments(cfg)) {
  let md = `# ${doc.title}\n\n> ${doc.summary}\n>\n> Version ${cfg.legalVersion} · Effective ${cfg.legalEffectiveDate}\n\n`;
  for (const s of doc.sections) {
    md += `## ${s.heading}\n\n`;
    for (const p of s.paras ?? []) md += `${p}\n\n`;
    for (const b of s.bullets ?? []) md += `- ${b}\n`;
    if (s.bullets?.length) md += '\n';
  }
  await writeFile(path.join(root, 'LEGAL', files[doc.id]), md);
  console.log('wrote LEGAL/' + files[doc.id]);
}
