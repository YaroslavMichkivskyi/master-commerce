// The shared rules plus web-only guards.
import globals from 'globals';
import root from '../../eslint.config.mjs';

// A `[` that opens a class (`[mask:none]`) or follows a utility (`w-[37px]`, `md:[…]`);
// the attribute variants `data-[state=open]:` and `aria-[sort=asc]:` hold no raw value.
const arbitrary = String.raw`/(^|[\s:!]|(?<!data|aria)-)\[/`;
// Class strings live in `className`, in `cx()` calls, and in constants and objects of
// classes (`const FIELD = '…' + '…'`, `VARIANTS = { primary: '…' }`). Arguments of other
// calls are not checked: there `[data-…]` is a CSS selector (`closest('[data-x]')`).
const arbitraryValues = ['Literal[value', 'TemplateElement[value.raw']
  .flatMap((node) => [
    `:matches(JSXAttribute[name.name='className'], CallExpression[callee.name='cx']) ${node}=${arbitrary}]`,
    `:matches(VariableDeclarator, Property, BinaryExpression) > ${node}=${arbitrary}]`,
    `:matches(VariableDeclarator, Property) > TemplateLiteral > ${node}=${arbitrary}]`,
  ])
  .map((selector) => ({
    selector,
    message: 'Arbitrary Tailwind values are not allowed: add a token to app/theme.css.',
  }));

export default [
  ...root,
  // What Playwright writes (results, the HTML report): generated, never linted.
  { ignores: ['e2e/.results/**', 'e2e/.report/**'] },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      globals: { ...globals.browser },
    },
    rules: {
      // Raw colours, sizes and breakpoints live only in app/theme.css (ADR 0024): Tailwind
      // arbitrary values (`w-[37px]`, `bg-[#123]`, `[mask:none]`) in class names are refused.
      'no-restricted-syntax': ['error', ...arbitraryValues],
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
