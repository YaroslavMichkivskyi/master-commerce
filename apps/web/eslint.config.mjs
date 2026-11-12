// The shared rules plus web-only guards.
import globals from 'globals';
import root from '../../eslint.config.mjs';

export default [
  ...root,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      // Backend DTO classes carry Nest / class-validator code; web may only use their types,
      // so nothing server-side reaches the browser bundle (approach chosen for TASK-2;
      // a generated OpenAPI client replaces this with TASK-24).
      '@typescript-eslint/no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@master-commerce/dto',
              message:
                'Import DTOs as types only: `import type { … } from "@master-commerce/dto"`.',
              allowTypeImports: true,
            },
          ],
        },
      ],
    },
  },
];
