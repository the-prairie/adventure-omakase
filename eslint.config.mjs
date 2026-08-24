import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import nextVitals from 'eslint-config-next/core-web-vitals';
import importPlugin from 'eslint-plugin-import-x';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const studioFiles = ['apps/studio/**/*.{js,jsx,ts,tsx}'];

function scopeConfigs(configs, files) {
  return configs.map((config) => ({ ...config, files }));
}

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/.expo/**',
      '**/.turbo/**',
      '**/dist/**',
      '**/coverage/**',
      '**/web-build/**',
      'playwright-report/**',
      'test-results/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      'import-x': importPlugin,
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      'import-x/order': [
        'error',
        {
          alphabetize: { order: 'asc', caseInsensitive: true },
          'newlines-between': 'always',
          groups: [
            'builtin',
            'external',
            'internal',
            'parent',
            'sibling',
            'index',
          ],
        },
      ],
    },
  },
  {
    files: [
      'apps/api/**/*.ts',
      'packages/db/**/*.ts',
      'scripts/**/*.ts',
      'playwright*.ts',
      '*.{config,setup}.ts',
    ],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['apps/mobile/**/*.{ts,tsx}'],
    languageOptions: {
      globals: { __DEV__: 'readonly', process: 'readonly' },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@adventure-omakase/db',
              message: 'Mobile must never import server-side database code.',
            },
            {
              name: '@adventure-omakase/api',
              message: 'Mobile must call the API through typed HTTP clients.',
            },
            {
              name: 'fastify',
              message: 'Fastify is server-only.',
            },
            {
              name: 'next',
              message: 'Next.js is not a React Native dependency.',
            },
            {
              name: 'pg',
              message: 'PostgreSQL clients are server-only.',
            },
          ],
          patterns: [
            {
              group: [
                '@adventure-omakase/db/**',
                '@adventure-omakase/api/**',
                'drizzle-orm/**',
                '**/packages/db/**',
                '**/apps/api/**',
              ],
              message:
                'Mobile may depend on contracts and clients, not server infrastructure.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['apps/**', '**/apps/**'],
              message:
                'Shared packages must not depend on application implementations.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/contracts/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'fastify',
              message: 'Contracts must remain framework-neutral.',
            },
            {
              name: 'next',
              message: 'Contracts must remain framework-neutral.',
            },
            {
              name: 'pg',
              message: 'Contracts must remain infrastructure-neutral.',
            },
            {
              name: 'react',
              message: 'React lifecycle belongs outside contracts.',
            },
            {
              name: 'react-native',
              message: 'Contracts must remain platform-neutral.',
            },
          ],
          patterns: [
            {
              group: ['@fastify/**', 'drizzle-orm/**', 'next/**'],
              message: 'Contracts must remain framework-neutral.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/domain/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'fastify',
              message: 'Domain code must be framework-free.',
            },
            {
              name: 'next',
              message: 'Domain code must be framework-free.',
            },
            {
              name: 'pg',
              message: 'Domain code must be persistence-free.',
            },
            {
              name: 'react',
              message: 'Domain code must be UI-free.',
            },
            {
              name: 'react-native',
              message: 'Domain code must be UI-free.',
            },
          ],
          patterns: [
            {
              group: ['@fastify/**', 'drizzle-orm/**', 'expo-*/**', 'next/**'],
              message:
                'Domain code may define interfaces but cannot import framework or infrastructure SDKs.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/mobile/**/*.test.{ts,tsx}'],
    languageOptions: { globals: globals.jest },
  },
  {
    files: ['**/*.{test,spec}.{ts,tsx}', 'playwright*.ts'],
    languageOptions: { globals: globals.node },
  },
  ...scopeConfigs(nextVitals, studioFiles),
  {
    files: studioFiles,
    settings: {
      next: { rootDir: 'apps/studio/' },
      react: { version: 'detect' },
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@adventure-omakase/db',
              message:
                'Studio must reach data through the API, never the database package.',
            },
            {
              name: '@adventure-omakase/api',
              message:
                'Studio must use shared contracts and HTTP boundaries, not API internals.',
            },
          ],
          patterns: [
            {
              group: ['@adventure-omakase/db/**', '**/packages/db/**'],
              message:
                'Studio must reach data through the API, never the database package.',
            },
            {
              group: ['**/apps/api/**'],
              message: 'Studio must not import Fastify application internals.',
            },
          ],
        },
      ],
      'react/prop-types': 'off',
    },
  },
  {
    ...tseslint.configs.disableTypeChecked,
    files: ['**/*.{js,cjs,mjs}'],
    languageOptions: { globals: globals.node },
  },
  eslintConfigPrettier,
);
