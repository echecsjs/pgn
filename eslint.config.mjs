import eslint from '@eslint/js';
import vitest from '@vitest/eslint-plugin';
import prettier from 'eslint-config-prettier';
import * as importing from 'eslint-plugin-import-x';
import unicorn from 'eslint-plugin-unicorn';
import * as typescript from 'typescript-eslint';

export default typescript.config(
  { ignores: ['tsdown.config.ts'] },
  eslint.configs.recommended,
  ...typescript.configs.strict,
  ...typescript.configs.stylistic,
  importing.flatConfigs.recommended,
  importing.flatConfigs.typescript,
  unicorn.configs.recommended,
  /**
   * Common
   */
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'curly': ['error', 'all'],
      'eqeqeq': 'error',
      'import-x/exports-last': 'error',
      'import-x/first': 'error',
      'import-x/group-exports': 'error',
      'import-x/newline-after-import': 'error',
      'import-x/no-duplicates': 'error',
      'import-x/order': [
        'error',
        {
          'alphabetize': {
            caseInsensitive: true,
            order: 'asc',
          },
          'groups': [
            ['builtin', 'external'],
            'internal',
            ['parent', 'sibling'],
            'type',
          ],
          'newlines-between': 'always',
          'pathGroups': [
            {
              group: 'internal',
              pattern: '@/**',
            },
          ],
          'pathGroupsExcludedImportTypes': ['@/**'],
        },
      ],
      'no-async-promise-executor': 'warn',
      'no-console': 'warn',
      'sort-imports': ['error', { ignoreDeclarationSort: true }],
      'sort-keys': 'error',
      'unicorn/filename-case': [
        'error',
        {
          case: 'kebabCase',
          ignore: [/^__tests__$/],
        },
      ],
    },
  },
  /**
   * TypeScript
   */
  {
    files: ['**/*.{mts,ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      '@typescript-eslint/member-ordering': [
        'error',
        {
          default: {
            memberTypes: [
              '#private-field',
              'public-readonly-field',
              'public-field',
              'constructor',
              '#private-get',
              'public-get',
              '#private-method',
              ['public-static-method', 'public-method'],
            ],
            order: 'alphabetically',
          },
        },
      ],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
    },
    settings: {
      'import-x/resolver': {
        typescript: {
          alwaysTryTypes: true,
        },
      },
    },
  },
  /**
   * Grammar file
   */
  {
    files: ['**/grammar.cjs'],
    rules: {
      '@typescript-eslint/ban-ts-comment': 'off',
    },
  },
  /**
   * Tests
   */
  {
    files: ['**/__tests__/**/*.ts', '**/*.spec.ts', '**/*.test.ts'],
    plugins: { vitest },
    rules: {
      ...vitest.configs.recommended.rules,
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-console': 'off',
      'sort-keys': 'off',
      'vitest/valid-title': 'off',
    },
  },
  prettier,
);
