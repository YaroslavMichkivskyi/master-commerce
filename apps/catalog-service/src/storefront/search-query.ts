import { BadRequestException } from '@nestjs/common';
import { LIMITS } from './filters.js';

/**
 * The words of a search, and the `tsquery` text made of them (TASK-6 FR-010, research
 * R-4, R-9a). Only letters and digits survive, so no `tsquery` syntax from the user
 * (`&`, `|`, `!`, `:`, `<->`, quotes) reaches PostgreSQL; the words are joined with `&`
 * and the last one is a prefix, so "rtx 60" finds "RTX 6060" and "RTX 6070".
 */
export function searchQuery(q: unknown): { words: string[]; tsquery: string } {
  const text = typeof q === 'string' ? q : Array.isArray(q) ? q.map(String).join(' ') : '';
  if (text.length > LIMITS.queryLength) {
    throw new BadRequestException({
      message: 'The request is invalid',
      errors: [{ field: 'q', messages: [`q must be at most ${LIMITS.queryLength} characters`] }],
    });
  }
  const words = (
    text
      .normalize('NFKC')
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu) ?? []
  ).slice(0, LIMITS.queryWords);
  if (words.length === 0) {
    throw new BadRequestException({
      message: 'The request is invalid',
      errors: [{ field: 'q', messages: ['q must have at least one word of letters or digits'] }],
    });
  }
  const tsquery = words.map((w, i) => (i === words.length - 1 ? `${w}:*` : w)).join(' & ');
  return { words, tsquery };
}
