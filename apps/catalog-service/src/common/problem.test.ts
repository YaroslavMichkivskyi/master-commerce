import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { toProblem } from './problem.js';

describe('toProblem', () => {
  it('hides the reason of an unexpected error', () => {
    expect(toProblem(new Error('password authentication failed'), '/categories')).toEqual({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      instance: '/categories',
    });
  });

  it('keeps a client error with its message', () => {
    expect(toProblem(new BadRequestException('bad slug'), '/x')).toMatchObject({
      title: 'Bad Request',
      status: 400,
      detail: 'bad slug',
    });
  });
});
