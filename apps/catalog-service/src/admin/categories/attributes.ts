import type { AttributeDto, FieldErrorDto } from '@master-commerce/dto';
import type { categoryAttribute } from '../../db/schema.js';
import type { AttributeRule } from '../specs.js';

const LIST_TYPES = new Set(['select', 'multi_select']);
const NUMBER_LIMITS = ['unit', 'minValue', 'maxValue', 'wholeNumbers'] as const;

const given = (value: unknown) => value !== undefined && value !== null;

/**
 * What the DTO cannot say about a set of attributes (FR-011): which limits each type
 * takes, and codes unique in the set. `errors[]` items, fields like
 * `attributes.0.allowedValues`; empty when the set is well formed.
 */
export function attributeSetErrors(attributes: readonly AttributeDto[]): FieldErrorDto[] {
  const errors: FieldErrorDto[] = [];
  const add = (i: number, property: string, message: string) =>
    errors.push({ field: `attributes.${String(i)}.${property}`, messages: [message] });
  const seen = new Set<string>();

  attributes.forEach((a, i) => {
    if (seen.has(a.code)) add(i, 'code', `${a.code} repeats in the list`);
    seen.add(a.code);

    const isList = LIST_TYPES.has(a.type);
    if (isList && !(a.allowedValues && a.allowedValues.length > 0)) {
      add(i, 'allowedValues', `${a.type} needs a list of allowed values`);
    }
    if (!isList && given(a.allowedValues)) {
      add(i, 'allowedValues', 'allowedValues is only for select and multi_select');
    }
    if (a.type !== 'number') {
      for (const limit of NUMBER_LIMITS) {
        if (given(a[limit])) add(i, limit, `${limit} is only for number`);
      }
    } else if (
      typeof a.minValue === 'number' &&
      typeof a.maxValue === 'number' &&
      a.minValue > a.maxValue
    ) {
      add(i, 'minValue', 'minValue must not be greater than maxValue');
    }
    if (a.type === 'text' && !given(a.maxLength)) {
      add(i, 'maxLength', 'text needs maxLength');
    }
    if (a.type !== 'text' && given(a.maxLength)) {
      add(i, 'maxLength', 'maxLength is only for text');
    }
  });
  return errors;
}

/** The rule of a well-formed attribute of the request. */
export function ruleOf(a: AttributeDto): AttributeRule {
  return {
    code: a.code,
    type: a.type,
    required: a.required,
    sortOrder: a.sortOrder ?? 0,
    allowedValues: a.allowedValues ?? null,
    minValue: a.minValue ?? null,
    maxValue: a.maxValue ?? null,
    wholeNumbers: a.wholeNumbers ?? false,
    maxLength: a.maxLength ?? null,
  };
}

type AttributeColumns = Omit<
  typeof categoryAttribute.$inferInsert,
  'id' | 'categoryId' | 'createdAt' | 'updatedAt' | 'version'
>;

/** The stored columns of an attribute; `numeric` is written as a string. */
export function columnsOf(
  a: AttributeDto,
): Required<
  Pick<
    AttributeColumns,
    | 'code'
    | 'name'
    | 'type'
    | 'required'
    | 'sortOrder'
    | 'allowedValues'
    | 'unit'
    | 'minValue'
    | 'maxValue'
    | 'wholeNumbers'
    | 'maxLength'
  >
> {
  return {
    code: a.code,
    name: a.name,
    type: a.type,
    required: a.required,
    sortOrder: a.sortOrder ?? 0,
    allowedValues: a.allowedValues ?? null,
    unit: a.unit ?? null,
    minValue: given(a.minValue) ? String(a.minValue) : null,
    maxValue: given(a.maxValue) ? String(a.maxValue) : null,
    wholeNumbers: a.wholeNumbers ?? false,
    maxLength: a.maxLength ?? null,
  };
}
