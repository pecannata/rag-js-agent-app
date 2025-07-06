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
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      }
    },
    rules: {
      // STRICT TYPE SAFETY RULES (Critical errors only)
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          'argsIgnorePattern': '^_',
          'varsIgnorePattern': '^_',
          'caughtErrorsIgnorePattern': '^_'
        }
      ],
      '@typescript-eslint/no-explicit-any': 'warn', // Warn but allow for AI/RAG flexibility
      '@typescript-eslint/no-non-null-assertion': 'warn', // Warn about dangerous patterns
      '@typescript-eslint/prefer-optional-chain': 'warn', // Warn to encourage better patterns
      '@typescript-eslint/consistent-type-definitions': ['warn', 'interface'],
      
      // GENERAL CODE QUALITY
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': 'warn', // Allow console but warn for production cleanup
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'no-unused-expressions': 'error',
      
      // REACT SPECIFIC
      'react/no-unescaped-entities': 'off',
      'react/prop-types': 'off', // TypeScript handles this
      'react/react-in-jsx-scope': 'off', // Next.js doesn't require this
      'react/jsx-key': 'error',
      'react-hooks/exhaustive-deps': 'error'
    }
  },
  {
    files: ['**/*.{js,jsx}'],
    rules: {
      // Basic rules for JavaScript files  
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': 'warn',
      'no-debugger': 'error',
      'no-duplicate-imports': 'error',
      'no-unused-expressions': 'error',
      'no-unused-vars': [
        'error',
        {
          'argsIgnorePattern': '^_',
          'varsIgnorePattern': '^_',
          'caughtErrorsIgnorePattern': '^_'
        }
      ]
    }
  }
];

export default eslintConfig;
