// Page addresses of the storefront (TASK-6 FR-031, research R-7): every filter, the sort
// and the page live in the query, so a reload or a shared link shows the same result.
// Filters are plain links; changing one goes back to page 1.

export type SearchParams = Record<string, string | string[] | undefined>;

/** Reserved names; everything else is a filter of an attribute by its code. */
export const PAGE = 'page';

/** The query as one value per name; repeated names become a comma list. */
export function flatten(params: SearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    const v = Array.isArray(value) ? value.join(',') : value;
    if (v !== undefined && v !== '') out[key] = v;
  }
  return out;
}

/** An address with the changes applied (`undefined` removes); a filter change resets the page. */
export function href(
  path: string,
  params: SearchParams,
  changes: Record<string, string | undefined>,
  options: { keepPage?: boolean } = {},
): string {
  const next = flatten(params);
  if (!options.keepPage) delete next[PAGE];
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined || value === '') delete next[key];
    else next[key] = value;
  }
  const query = new URLSearchParams(
    Object.entries(next).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  ).toString();
  return query ? `${path}?${query}` : path;
}

/** The address of a page number of the same list. */
export const pageHref = (path: string, params: SearchParams, page: number) =>
  href(path, params, { [PAGE]: page === 1 ? undefined : String(page) }, { keepPage: true });

/** A comma list with `value` added or, if it is there, removed. */
export function toggle(list: string | undefined, value: string): string | undefined {
  const values = (list ?? '').split(',').filter((v) => v !== '');
  const next = values.includes(value) ? values.filter((v) => v !== value) : [...values, value];
  return next.length > 0 ? next.join(',') : undefined;
}

/** A list with anything but the page number is not to be indexed (FR-040). */
export function isFiltered(params: SearchParams): boolean {
  return Object.keys(flatten(params)).some((k) => k !== PAGE);
}

/**
 * A range form sends `<code>.min` and `<code>.max`; the address keeps `<code>=min-max`.
 * Answers the normalised query when the form's names are there, else `undefined`.
 */
export function normaliseRanges(params: SearchParams): Record<string, string> | undefined {
  const flat = flatten(params);
  const codes = new Set(
    Object.keys(params)
      .filter((k) => k.endsWith('.min') || k.endsWith('.max'))
      .map((k) => k.slice(0, -4)),
  );
  if (codes.size === 0) return undefined;
  for (const code of codes) {
    const min = flat[`${code}.min`]?.trim() ?? '';
    const max = flat[`${code}.max`]?.trim() ?? '';
    delete flat[`${code}.min`];
    delete flat[`${code}.max`];
    if (min || max) flat[code] = `${min}-${max}`;
    else delete flat[code];
  }
  delete flat[PAGE];
  return flat;
}

/** The selected range of a `min-max` parameter. */
export function rangeOf(value: string | undefined): { min?: string; max?: string } {
  const m = value ? /^([^-]*)-([^-]*)$/.exec(value) : null;
  return m ? { min: m[1] || undefined, max: m[2] || undefined } : {};
}

const EURO = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });

/** `€1,299.99`, VAT included. */
export const euros = (cents: number) => EURO.format(cents / 100);
