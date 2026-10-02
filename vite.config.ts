import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { existsSync, readFileSync } from 'node:fs';

/**
 * 1. Emits version.json (used by the in-app "update available → refresh" feature).
 * 2. Removes the "branch-mode loader" from the BUILT index.html — that loader is only needed when
 *    GitHub Pages serves the raw repository ("Deploy from a branch").
 */
function indQuantBuildInfo(): Plugin {
  return {
    name: 'ind-quant-build-info',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        if (!ctx.bundle) return html; // dev server: keep as is
        return html.replace(/<!-- IQ-BRANCH-LOADER:START -->[\s\S]*?<!-- IQ-BRANCH-LOADER:END -->/g, '');
      },
    },
    generateBundle(_options, bundle) {
      // Build id = content hash of the app bundle, so it only changes when the app code changes.
      const entry = Object.values(bundle).find((c) => c.type === 'chunk' && c.isEntry);
      const buildId = entry?.fileName.match(/ind-quant-([A-Za-z0-9_-]+)\.js$/)?.[1] ?? 'unknown';
      // Owner details file — read by the app at runtime (see src/config/siteConfig.ts).
      if (existsSync('site-config.json')) {
        this.emitFile({ type: 'asset', fileName: 'site-config.json', source: readFileSync('site-config.json', 'utf8') });
      }
      this.emitFile({
        type: 'asset',
        fileName: 'version.json',
        source: JSON.stringify({ buildId, builtAtIso: new Date().toISOString(), app: 'IND-QUANT', version: '4.1' }, null, 2),
      });
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), indQuantBuildInfo()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Content-hashed names: a new build always gets new file names, so browsers can never mix old & new code.
        entryFileNames: 'assets/ind-quant-[hash].js',
        chunkFileNames: 'assets/ind-quant-[name]-[hash].js',
        assetFileNames: 'assets/ind-quant-[hash].[ext]',
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    allowedHosts: true,
    cors: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    allowedHosts: true,
  },
});
