module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    'jest/globals': true,
  },
  extends: [
    'airbnb',
    'plugin:cypress/recommended',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 12,
    sourceType: 'module',
  },
  plugins: [
    'react',
    '@typescript-eslint',
    'jest',
  ],
  rules: {
    indent: ['error', 2, {
      SwitchCase: 1,
    }],
    'object-curly-spacing': ['error', 'always'],
    'react/jsx-curly-spacing': ['error', {
      when: 'never',
      children: {
        when: 'always',
      },
    }],
    'max-len': [
      'error',
      {
        code: 124,
        ignoreComments: true,
      },
    ],
    camelcase: 'off',
    'react/jsx-one-expression-per-line': 'off',
    'react/forbid-prop-types': 'off',
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'no-param-reassign': 'off',
    'no-underscore-dangle': 'off',
    // note you must disable the base rule as it can report incorrect errors
    'no-use-before-define': 'off',
    '@typescript-eslint/no-use-before-define': ['error'],
    'react/prop-types': 'off',
    'react/jsx-props-no-spreading': 'off',
    'react/sort-comp': 'off',
    'import/no-unresolved': 'off',
    'jsx-a11y/anchor-is-valid': 'off',
    'jsx-a11y/click-events-have-key-events': 'off',
    'jsx-a11y/interactive-supports-focus': 'off',
    'react/jsx-filename-extension': 'off',
    'import/prefer-default-export': 'off',
    'import/extensions': 'off',
    'no-nested-ternary': 'off',
    'class-methods-use-this': 'off',
    'no-continue': 'off',
    'no-useless-constructor': 'off',
    'no-empty-function': 'off',
    'max-classes-per-file': 'off',
    'no-unused-vars': 'off',
    'no-shadow': 'off',
    'no-plusplus': 'off',
    '@typescript-eslint/type-annotation-spacing': ['error'],
    '@typescript-eslint/no-unused-vars': ['error'],
    '@typescript-eslint/keyword-spacing': ['error'],
    '@typescript-eslint/no-shadow': ['error'],
    '@typescript-eslint/comma-spacing': ['error'],
  },
};
