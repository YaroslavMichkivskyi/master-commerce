import { describe, expect, it } from 'vitest';
import { cx } from './cx';

describe('cx', () => {
  it('joins the given class names and skips the falsy ones', () => {
    expect(cx('a', false, 'b', null, undefined, '', 'c')).toBe('a b c');
    expect(cx()).toBe('');
  });
});
