import { defineConfig } from '@rsbuild/core';
import { pluginBabel } from '@rsbuild/plugin-babel';

export default defineConfig({
  source: {
    entry: {
      index: './main.tsx',
    },
  },
  html: {
    template: './public/index.html',
  },
  plugins: [
    pluginBabel({
      include: /\.(js|jsx|ts|tsx)$/,
      exclude: /node_modules/,
      babelLoaderOptions: {
        presets: [
          [
            '@babel/preset-react',
            {
              runtime: 'automatic',
              importSource: 'react',
            },
          ],
          '@babel/preset-env',
          '@babel/preset-typescript',
        ],
      },
    }),
  ],
});
