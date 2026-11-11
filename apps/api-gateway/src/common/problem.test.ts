import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { UpstreamBadResponseError, UpstreamUnavailableError } from '../catalog/upstream.errors.js';
import { toProblem } from './problem.js';

describe('toProblem', () => {
  it('maps an unreachable upstream to 503', () => {
    expect(toProblem(new UpstreamUnavailableError('catalog-service'), '/x')).toEqual({
      type: 'about:blank',
      title: 'Service Unavailable',
      status: 503,
      detail: 'catalog-service is unavailable',
      instance: '/x',
    });
  });

  it('maps a bad upstream response to 502 without leaking the reason', () => {
    const p = toProblem(new UpstreamBadResponseError('catalog-service', 'HTTP 500'), '/x');
    expect(p.status).toBe(502);
    expect(p.detail).toBe('catalog-service answered with an error');
  });

  it('keeps client errors and hides unknown ones', () => {
    expect(toProblem(new NotFoundException('no such route'), '/x').status).toBe(404);
    expect(toProblem(new Error('db password is wrong'), '/x')).toEqual({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      instance: '/x',
    });
  });
});
