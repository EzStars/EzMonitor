import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';
import { pluginSass } from '@rsbuild/plugin-sass';

export default defineConfig({
  plugins: [pluginReact(), pluginSass()],
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
