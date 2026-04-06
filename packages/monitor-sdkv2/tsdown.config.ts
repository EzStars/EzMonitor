import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/core/index.ts',
    'src/plugins/performance/index.ts',
    'src/plugins/tracking/index.ts',
  ],
  dts: true,
  exports: true,
  publint: true,
})
