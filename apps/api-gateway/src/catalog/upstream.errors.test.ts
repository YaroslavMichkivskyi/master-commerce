import { toProblem } from '@master-commerce/service-core';
import { describe, expect, it } from 'vitest';
import { UpstreamBadResponseError, UpstreamUnavailableError } from './upstream.errors.js';

describe('upstream errors as problem details', () => {
  it('an unreachable upstream is 503 with its name', () => {
    expect(toProblem(new UpstreamUnavailableError('catalog-service'), '/x')).toEqual({
      type: 'about:blank',
      title: 'Service Unavailable',
      status: 503,
      detail: 'catalog-service is unavailable',
      instance: '/x',
    });
  });

  it('a bad upstream response is 502 without the reason', () => {
    const error = new UpstreamBadResponseError('catalog-service', 'HTTP 500');
    const problem = toProblem(error, '/x');
    expect(problem).toMatchObject({ status: 502, title: 'Bad Gateway' });
    expect(problem.detail).toBe('catalog-service answered with an error');
    expect((error.cause as Error).message).toBe('HTTP 500');
  });
});
