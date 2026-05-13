import { defineConfig, mergeConfig } from 'vite';
import baseConfig from './vite.config';

export default mergeConfig(
  baseConfig,
  defineConfig({
    build: {
      outDir: 'dist-demo',
      rollupOptions: {
        input: {
          demo: 'demo-standalone.html',
        },
      },
    },
  })
);
