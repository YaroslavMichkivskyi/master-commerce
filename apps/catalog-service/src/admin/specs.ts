import type { FieldErrorDto } from '@master-commerce/dto';
import type { AttributeType } from '../db/schema.js';

/** What `validateSpecs` needs of an attribute; numbers already parsed. */
export interface AttributeRule {
  code: string;
  type: AttributeType;
  required: boolean;
  sortOrder: number;
  allowedValues: readonly string[] | null;
  minValue: number | null;
  maxValue: number | null;
  wholeNumbers: boolean;
  maxLength: number | null;
}

/** One level of a category path: the category and its own attributes. */
export interface CategoryLevel<A extends AttributeRule = AttributeRule> {
  name: string;
  attributes: readonly A[];
}

const bySortOrder = (a: AttributeRule, b: AttributeRule) =>
  a.sortOrder - b.sortOrder || a.code.localeCompare(b.code);

/**
 * The attributes a product of the last category must satisfy: those of every ancestor,
 * root first, then its own; each level by sort order (FR-015).
 */
export function effectiveAttributes<A extends AttributeRule>(
  path: readonly CategoryLevel<A>[],
): A[] {
  return path.flatMap((level) => [...level.attributes].sort(bySortOrder));
}

/** Codes that occur more than once along a path; they must be unique (FR-015). */
export function repeatedCodes(path: readonly CategoryLevel[]): string[] {
  const seen = new Set<string>();
  const repeated = new Set<string>();
  for (const { code } of path.flatMap((level) => level.attributes)) {
    if (seen.has(code)) repeated.add(code);
    seen.add(code);
  }
  return [...repeated];
}

/**
 * Every problem of a product's specs against its effective attributes (FR-011, FR-023,
 * research R-8), as `errors[]` items: `{ field: 'specs.<code>', messages }`. Empty
 * when the specs are valid. Values are checked as JSON types: `"8"` is not a number.
 */
export function validateSpecs(
  attributes: readonly AttributeRule[],
  specs: Readonly<Record<string, unknown>>,
  categoryName: string,
): FieldErrorDto[] {
  const errors: FieldErrorDto[] = [];
  const known = new Set<string>();
  for (const attribute of attributes) {
    known.add(attribute.code);
    // Own keys only: a code like `constructor` must not find Object.prototype's.
    const value = Object.hasOwn(specs, attribute.code) ? specs[attribute.code] : undefined;
    const message = problemOf(attribute, value);
    if (message) errors.push({ field: `specs.${attribute.code}`, messages: [message] });
  }
  for (const code of Object.keys(specs)) {
    if (!known.has(code)) {
      errors.push({
        field: `specs.${code}`,
        messages: [`${code} is not an attribute of ${categoryName}`],
      });
    }
  }
  return errors;
}

function problemOf(attribute: AttributeRule, value: unknown): string | undefined {
  const { code } = attribute;
  if (value === undefined) return attribute.required ? `${code} is required` : undefined;
  switch (attribute.type) {
    case 'select':
      return typeof value === 'string' && allowed(attribute).includes(value)
        ? undefined
        : `${code} must be one of ${allowed(attribute).join(', ')}`;
    case 'multi_select':
      return validList(attribute, value)
        ? undefined
        : `${code} must be a list of different values from ${allowed(attribute).join(', ')}` +
            (attribute.required ? ', at least one' : '');
    case 'number':
      return validNumber(attribute, value) ? undefined : `${code} must be ${numberRule(attribute)}`;
    case 'boolean':
      return typeof value === 'boolean' ? undefined : `${code} must be true or false`;
    case 'text': {
      const max = attribute.maxLength ?? Infinity;
      return typeof value === 'string' && value.trim() !== '' && value.length <= max
        ? undefined
        : `${code} must be a text of 1 to ${String(max)} characters`;
    }
  }
}

const allowed = (attribute: AttributeRule): readonly string[] => attribute.allowedValues ?? [];

function validList(attribute: AttributeRule, value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  if (attribute.required && value.length === 0) return false;
  const values: unknown[] = value;
  return (
    values.every((v) => typeof v === 'string' && allowed(attribute).includes(v)) &&
    new Set(values).size === values.length
  );
}

function validNumber(attribute: AttributeRule, value: unknown): boolean {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    (!attribute.wholeNumbers || Number.isInteger(value)) &&
    (attribute.minValue === null || value >= attribute.minValue) &&
    (attribute.maxValue === null || value <= attribute.maxValue)
  );
}

/** "a whole number from 1 to 64", "a number of at least 0.5", "a number". */
function numberRule({ wholeNumbers, minValue: min, maxValue: max }: AttributeRule): string {
  const kind = wholeNumbers ? 'a whole number' : 'a number';
  if (min !== null && max !== null) return `${kind} from ${String(min)} to ${String(max)}`;
  if (min !== null) return `${kind} of at least ${String(min)}`;
  if (max !== null) return `${kind} of at most ${String(max)}`;
  return kind;
}
