import { ESLint } from 'eslint';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// The web ESLint rule against arbitrary Tailwind values (ADR 0024): class strings are
// checked wherever they live. The AI review of TASK-36 found the first version checked
// only `className` and `cx()`, not the constants most classes live in.

const eslint = new ESLint({ cwd: fileURLToPath(new URL('.', import.meta.url)) });
const RULE = 'no-restricted-syntax';

/** Lines the rule flags in `code`, linted as if it were a component of the app. */
async function flagged(code: string): Promise<number[]> {
  const [result] = await eslint.lintText(code, { filePath: 'components/ui/cx.ts' });
  return result!.messages.filter((m) => m.ruleId === RULE).map((m) => m.line);
}

describe('no arbitrary Tailwind values (ADR 0024)', () => {
  it('flags them in constants, joined strings, objects and templates', async () => {
    const code = [
      "export const A = 'min-h-[37px] p-2';",
      "export const B = 'p-2 ' + 'text-[#123]';",
      "export const C = { x: 'w-[10px]' };",
      'export const D = `md:[mask:none] ${A}`;',
    ].join('\n');
    expect(await flagged(code)).toEqual([1, 2, 3, 4]);
  });

  it('leaves tokens, attribute variants and CSS selectors alone', async () => {
    const code = [
      "export const A = 'min-h-8 p-2 data-[state=open]:block aria-[sort=asc]:font-bold';",
      "export const B = (el: Element) => el.closest('[data-close-filters]');",
    ].join('\n');
    expect(await flagged(code)).toEqual([]);
  });
}, 60_000);
