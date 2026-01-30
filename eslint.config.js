// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    type: 'lib',
    pnpm: true,
    ignores: [
      '**/*.md',
      '**/*.mdx',
      'docs/**',
      'packages/**/docs/**',
    ],
  },
  {
    rules: {
      'ts/explicit-function-return-type': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'ts/no-unsafe-function-type': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      'no-new': 'warn',
    },
  },
)
