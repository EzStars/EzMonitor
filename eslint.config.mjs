import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import eslintPlugin from '@typescript-eslint/eslint-plugin';
import eslintParser from '@typescript-eslint/parser';

export default defineConfig([
  { files: ['**/*.{js,mjs,cjs,ts}'] },
  {
    files: ['**/*.{js,mjs,cjs,ts}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parser: eslintParser,
    },
  },
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // 可以设置为 "error" 完全禁止使用
    },
    plugins: {
      '@typescript-eslint': eslintPlugin,
    },
  },
  globalIgnores(['node_modules', '.turbo', '**/dist/', 'docs']),
]);
