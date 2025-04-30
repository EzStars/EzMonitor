import { defineConfig, globalIgnores } from 'eslint/config';
import globals from 'globals';
import eslintPlugin from '@typescript-eslint/eslint-plugin';
import eslintParser from '@typescript-eslint/parser';

export default defineConfig([
  { files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'] }, // 添加对 .jsx 和 .tsx 文件的支持
  {
    files: ['**/*.{js,mjs,cjs,ts,jsx,tsx}'], // 添加对 .jsx 和 .tsx 文件的支持
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parser: eslintParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true, // 启用 JSX 支持
        },
      },
    },
  },
  {
    files: ['**/*.{ts,tsx}'], // 针对 TypeScript 和 TSX 文件的规则
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // 可以设置为 "error" 完全禁止使用
    },
    plugins: {
      '@typescript-eslint': eslintPlugin,
    },
  },
  globalIgnores(['node_modules', '.turbo', '**/dist/', 'docs']),
]);
