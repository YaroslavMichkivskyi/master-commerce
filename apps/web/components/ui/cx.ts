/** Joins class names, skipping the falsy ones: `cx('btn', active && 'btn-on')`. */
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
