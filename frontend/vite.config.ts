import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// https://vite.dev/config/
//
// The @common alias mirrors the path in tsconfig.app.json / tsconfig.node.json and
// is required for a clean resolve during the production build.
const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@common': path.resolve(dirname, '../common/src'),
    },
  },
});
