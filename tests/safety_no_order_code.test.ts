import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

function collectCodeFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      files.push(...collectCodeFiles(full));
    } else if (/\.(ts|tsx|js|mjs|py)$/.test(e.name)) {
      files.push(full);
    }
  }
  return files;
}

describe('U1 & U21.2 CI Safety Grep Test — Zero Broker Order-Placement Endpoints or Order Scopes', () => {
  it('verifies that no file in src/ or services/ contains broker order placement APIs or auto-execution calls', () => {
    const root = path.resolve(__dirname, '..');
    const targetFiles = [
      ...collectCodeFiles(path.join(root, 'src')),
      ...collectCodeFiles(path.join(root, 'services')),
    ];

    // Forbidden broker order-placement SDK methods and REST endpoints
    const forbiddenPatterns = [
      /\/orders\/regular/i,
      /placeOrder\s*\(/i,
      /modifyOrder\s*\(/i,
      /cancelOrder\s*\(/i,
      /kite\.place_order/i,
      /dhan\.place_order/i,
      /upstox\.placeOrder/i,
      /smartApi\.placeOrder/i,
    ];

    for (const file of targetFiles) {
      const content = fs.readFileSync(file, 'utf8');
      for (const regex of forbiddenPatterns) {
        expect(
          regex.test(content),
          `Forbidden order-execution pattern ${regex} found in ${file}`
        ).toBe(false);
      }
    }
  });
});
