import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

export default defineConfig({
  plugins: [pluginReact()],
  tools: {
    rspack: {
      resolve: {
        alias: {
          '@': './src',
        },
        fallback: {
          worker_threads: false,
          fs: false,
          path: false,
          crypto: false,
        },
      },
    },
  },
});
