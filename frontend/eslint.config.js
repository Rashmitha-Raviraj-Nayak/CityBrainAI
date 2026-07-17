import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import nextPlugin from '@next/eslint-plugin-next';

export default [
  {
    ignores: ['.next/**', 'node_modules/**', '.venv/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        URL: 'readonly',
        File: 'readonly',
        React: 'readonly',
        process: 'readonly',
        fetch: 'readonly',
        module: 'readonly',
        require: 'readonly',
        HTMLInputElement: 'readonly',
        HTMLDivElement: 'readonly',
        MediaRecorder: 'readonly',
        Blob: 'readonly',
        BlobPart: 'readonly',
      },
    },
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      '@next/next/no-duplicate-head': 'off',
      '@next/next/no-html-link-for-pages': 'off',
      '@next/next/no-img-element': 'off',
      'no-unused-vars': 'off',
    },
  },
];
