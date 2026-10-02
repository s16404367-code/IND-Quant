import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { applySiteConfig, SITE_CONFIG } from '../src/config/siteConfig';
import { getLegalDocs } from '../src/components/shell/Legal';
import { rawRepoDataBases, isBranchMode } from '../src/data/marketData';
import { CURRENT_BUILD_ID, RefreshButton, UpdateBanner } from '../src/components/shell/UpdateChecker';

const ORIGINAL = { ...SITE_CONFIG };
const g = globalThis as unknown as { window?: unknown };

afterEach(() => {
  Object.assign(SITE_CONFIG, ORIGINAL);
  delete g.window;
});

describe('Runtime owner config (site-config.json)', () => {
  it('applies only the allowed text fields', () => {
    const n = applySiteConfig({ ownerDisplayName: 'Ravi Kumar', contactEmail: 'r@example.com', siteName: 'HACK', evil: '<script>' });
    expect(n).toBe(2);
    expect(SITE_CONFIG.ownerDisplayName).toBe('Ravi Kumar');
    expect(SITE_CONFIG.siteName).toBe('IND-QUANT');
    expect(applySiteConfig(null)).toBe(0);
    expect(applySiteConfig({ ownerDisplayName: 42 })).toBe(0);
  });
  it('legal documents pick up the owner name', () => {
    applySiteConfig({ ownerDisplayName: 'Ravi Kumar', jurisdictionCity: 'Guntur' });
    const text = JSON.stringify(getLegalDocs());
    expect(text).toContain('Ravi Kumar');
    expect(text).toContain('Guntur');
  });
  it('the repo ships a valid site-config.json', () => {
    const j = JSON.parse(readFileSync('site-config.json', 'utf8'));
    expect(typeof j.ownerDisplayName).toBe('string');
    expect(typeof j.legalVersion).toBe('string');
  });
});

describe('GitHub Pages "Deploy from a branch" support', () => {
  it('derives raw.githubusercontent.com data URLs for a project site', () => {
    g.window = { location: { hostname: 'ravi.github.io', pathname: '/ind-quant/' } };
    expect(rawRepoDataBases()).toEqual([
      'https://raw.githubusercontent.com/ravi/ind-quant/main/data-snapshot/',
      'https://raw.githubusercontent.com/ravi/ind-quant/master/data-snapshot/',
    ]);
  });
  it('handles a user site (OWNER.github.io repository) and other hosts', () => {
    g.window = { location: { hostname: 'ravi.github.io', pathname: '/index.html' } };
    expect(rawRepoDataBases()[0]).toBe('https://raw.githubusercontent.com/ravi/ravi.github.io/main/data-snapshot/');
    g.window = { location: { hostname: 'example.com', pathname: '/' } };
    expect(rawRepoDataBases()).toEqual([]);
  });
  it('branch mode flag is off by default', () => {
    expect(isBranchMode()).toBe(false);
  });
  it('index.html has the branch loader, and it is marked for removal in built pages', () => {
    const html = readFileSync('index.html', 'utf8');
    expect(html).toContain('<!-- IQ-BRANCH-LOADER:START -->');
    expect(html).toContain('./site/app.js');
    expect(html).toContain('./site/version.json');
    const stripped = html.replace(/<!-- IQ-BRANCH-LOADER:START -->[\s\S]*?<!-- IQ-BRANCH-LOADER:END -->/g, '');
    expect(stripped).not.toContain('site/app.js');
    expect(stripped).toContain('/src/main.tsx');
  });
  it('workflow commits data + site and only deploys via Actions when Pages uses Actions', () => {
    const wf = readFileSync('.github/workflows/ci-and-pages.yml', 'utf8');
    expect(wf).toContain('contents: write');
    expect(wf).toContain('.build_type');
    expect(wf).toContain("pages_mode == 'workflow'");
    expect(wf).toContain('[skip ci]');
    expect(wf).toContain('site/');
  });
});

describe('Refresh & update notifications', () => {
  it('build id is "dev" in tests (so no false update alerts)', () => {
    expect(CURRENT_BUILD_ID).toBe('dev');
  });
  it('Refresh button is always rendered with an accessible label', () => {
    const html = renderToString(<RefreshButton />);
    expect(html).toContain('aria-label="Refresh page and data"');
    expect(renderToString(<RefreshButton hasUpdate />)).toContain('Update ready');
  });
  it('banner appears only when an update exists', () => {
    expect(renderToString(<UpdateBanner appUpdate={false} dataUpdateIso={null} autoRefresh />)).toBe('');
    const app = renderToString(<UpdateBanner appUpdate dataUpdateIso={null} autoRefresh />);
    expect(app).toContain('A new version of IND-QUANT is');
    expect(app).toContain('Refresh now');
    expect(app).toContain('Refreshing automatically');
    const data = renderToString(<UpdateBanner appUpdate={false} dataUpdateIso="2026-10-05T13:10:00.000Z" autoRefresh={false} />);
    expect(data).toContain('New market data is');
    expect(data).not.toContain('Refreshing automatically');
  });
});
