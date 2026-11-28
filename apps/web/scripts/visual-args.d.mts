export function parseVisualArgs(
  argv: string[],
  env?: Record<string, string | undefined>,
): {
  update: boolean;
  serve: boolean;
  passThrough: string[];
  ports: { web: string; dead: string };
};
