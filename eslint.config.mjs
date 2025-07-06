import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Allow unused variables that start with underscore
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          'argsIgnorePattern': '^_',
          'varsIgnorePattern': '^_',
          'caughtErrorsIgnorePattern': '^_'
        }
      ],
      // Allow explicit any types (since this is common in RAG/AI applications)
      '@typescript-eslint/no-explicit-any': 'off',
      // Allow unescaped entities in React
      'react/no-unescaped-entities': 'off',
      // Make prefer-const a warning instead of error
      'prefer-const': 'warn'
    }
  }
];

export default eslintConfig;
