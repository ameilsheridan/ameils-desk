import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

/** Relative-path static build of the site for private previews (npm run preview:build). */
export default defineConfig({
  root: r('./preview'),
  base: './',
  publicDir: r('./public'),
  resolve: {
    alias: [
      { find: 'next/navigation', replacement: r('./preview/shims/navigation.ts') },
      { find: 'next/link', replacement: r('./preview/shims/link.tsx') },
      { find: 'next/dynamic', replacement: r('./preview/shims/dynamic.tsx') },
      { find: '@', replacement: r('./src') },
    ],
  },
  define: {
    'process.env.NEXT_PUBLIC_ASSET_BASE': JSON.stringify('.'),
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  oxc: { jsx: { runtime: 'automatic' } },
  build: { outDir: r('./dist-preview'), emptyOutDir: true, chunkSizeWarningLimit: 6000, assetsInlineLimit: (file: string) => (/\.(woff2?|ttf)$/.test(file) ? true : undefined) },
  plugins: [{
    // the site's meshopt model is not used by the preview; keep it out of the output
    name: 'drop-site-model',
    generateBundle() {},
    closeBundle() {
      import('node:fs').then((fs) => fs.rmSync(r('./dist-preview/models'), { recursive: true, force: true }));
    },
  }],
});
