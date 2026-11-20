// One row → one CSV line, the exact text that is hashed, loaded with
// `COPY … (FORMAT csv)` and written to the CSV files (plan D-1). Nothing here depends
// on the locale or the time zone.

/** A `jsonb` value, written as JSON text. */
export interface Json {
  readonly json: unknown;
}
/** A PostgreSQL `text[]` value, written as an array literal. */
export interface TextArray {
  readonly array: readonly string[];
}

export type Cell = string | number | boolean | Date | null | Json | TextArray;

export const json = (value: unknown): Json => ({ json: value });
export const textArray = (values: readonly string[]): TextArray => ({ array: values });

/** RFC 4180 quoting. A quoted empty string is '' for COPY; an unquoted empty field is NULL. */
const quote = (text: string) => `"${text.replaceAll('"', '""')}"`;

function cell(value: Cell): string {
  if (value === null) return '';
  if (typeof value === 'string') return quote(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`not a finite number: ${value}`);
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  if ('json' in value) return quote(JSON.stringify(value.json));
  // Array literal: every element double-quoted, backslash and quote escaped.
  const elements = value.array.map((v) => `"${v.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`);
  return quote(`{${elements.join(',')}}`);
}

/** The CSV line of a row, with its line end. */
export function csvLine(row: readonly Cell[]): string {
  return `${row.map(cell).join(',')}\n`;
}
