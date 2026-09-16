import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// Pacific, CENTCOM and the equipment reference share one build.
export default defineConfig({
  build: { rollupOptions: { input: readdirSync('.').filter(name => name.endsWith('.html')).map(name => resolve(name)) } },
});
