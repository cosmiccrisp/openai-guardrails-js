module.exports = {
  parser: '@typescript-eslint/parser',
  extends: ['eslint:recommended'],
  plugins: ['@typescript-eslint'],
  env: {
    node: true,
    es2020: true,
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  rules: {
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['warn', { 'varsIgnorePattern': '^_', 'argsIgnorePattern': '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-explicit-any': 'warn',
    'no-redeclare': 'off',
    '@typescript-eslint/no-redeclare': 'off',
  },
  overrides: [
    {
      files: ['**/__tests__/**/*.ts', '**/__tests__/**/*.js'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'off',
      },
    },
  ],
};
