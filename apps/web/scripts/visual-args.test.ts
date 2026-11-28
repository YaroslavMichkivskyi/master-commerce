import { describe, expect, it } from 'vitest';
import { parseVisualArgs } from './visual-args.mjs';

describe('test:visual arguments', () => {
  it('reads our flags before `--` and passes the rest to Playwright', () => {
    expect(parseVisualArgs(['--update', '--', '--grep', 'chips'])).toMatchObject({
      update: true,
      serve: false,
      passThrough: ['--grep', 'chips'],
    });
  });

  it('never takes a flag after `--` as ours (it would rewrite the screenshots)', () => {
    expect(parseVisualArgs(['--', '--grep', '--update'])).toMatchObject({
      update: false,
      passThrough: ['--grep', '--update'],
    });
  });

  it('serves on the ports the environment names, 3300 / 3310 by default', () => {
    expect(parseVisualArgs(['--serve']).ports).toEqual({ web: '3300', dead: '3310' });
    expect(parseVisualArgs(['--serve'], { VISUAL_PORT: '4000' }).ports.web).toBe('4000');
  });
});
