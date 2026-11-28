// The arguments of scripts/visual.mjs: our flags come before `--`, what follows is
// Playwright's (`test:visual -- --grep chips`). The AI review of TASK-36 found a
// `--update` after `--` was taken as ours and rewrote the reference screenshots.

/**
 * @param {string[]} argv the arguments after the script name
 * @param {Record<string, string | undefined>} env the environment (ports of `--serve`)
 */
export function parseVisualArgs(argv, env = {}) {
  const split = argv.includes('--') ? argv.indexOf('--') : argv.length;
  const ours = argv.slice(0, split);
  return {
    update: ours.includes('--update'),
    serve: ours.includes('--serve'),
    passThrough: argv.slice(split + 1),
    ports: { web: env.VISUAL_PORT ?? '3300', dead: env.VISUAL_DEAD_PORT ?? '3310' },
  };
}
