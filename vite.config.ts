import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Independent terrain workspaces and the original exercise share one build.
export default defineConfig({
  build: { rollupOptions: { input: readdirSync('.').filter(name => name.endsWith('.html')).map(name => resolve(name)) } },
});
