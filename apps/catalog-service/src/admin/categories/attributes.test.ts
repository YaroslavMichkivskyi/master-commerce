import type { AttributeDto } from '@master-commerce/dto';
import { describe, expect, it } from 'vitest';
import { attributeSetErrors, columnsOf, ruleOf } from './attributes.js';

const attr = (over: Partial<AttributeDto>): AttributeDto => ({
  code: 'a',
  name: 'A',
  type: 'boolean',
  required: false,
  ...over,
});
const fields = (attributes: AttributeDto[]) =>
  attributeSetErrors(attributes).map((e) => `${e.field}: ${e.messages.join('; ')}`);

describe('attributeSetErrors (FR-011)', () => {
  it('accepts every type with its own limits', () => {
    expect(
      fields([
        attr({ code: 'socket', type: 'select', allowedValues: ['AM5'] }),
        attr({ code: 'ports', type: 'multi_select', allowedValues: ['HDMI', 'DP'] }),
        attr({
          code: 'memory',
          type: 'number',
          unit: 'GB',
          minValue: 1,
          maxValue: 64,
          wholeNumbers: true,
        }),
        attr({ code: 'rt', type: 'boolean' }),
        attr({ code: 'chip', type: 'text', maxLength: 50 }),
      ]),
    ).toEqual([]);
  });

  it('wants the list of a list type and the length of a text', () => {
    expect(
      fields([
        attr({ code: 's', type: 'select' }),
        attr({ code: 'm', type: 'multi_select', allowedValues: [] }),
        attr({ code: 't', type: 'text' }),
      ]),
    ).toEqual([
      'attributes.0.allowedValues: select needs a list of allowed values',
      'attributes.1.allowedValues: multi_select needs a list of allowed values',
      'attributes.2.maxLength: text needs maxLength',
    ]);
  });

  it('refuses the limits a type does not take', () => {
    expect(
      fields([
        attr({ type: 'boolean', allowedValues: ['x'], unit: 'GB', maxLength: 5 }),
        attr({ code: 'b', type: 'select', allowedValues: ['x'], minValue: 1, wholeNumbers: false }),
      ]),
    ).toEqual([
      'attributes.0.allowedValues: allowedValues is only for select and multi_select',
      'attributes.0.unit: unit is only for number',
      'attributes.0.maxLength: maxLength is only for text',
      'attributes.1.minValue: minValue is only for number',
      'attributes.1.wholeNumbers: wholeNumbers is only for number',
    ]);
  });

  it('refuses an empty range and a code twice in the set', () => {
    expect(
      fields([attr({ code: 'n', type: 'number', minValue: 5, maxValue: 1 }), attr({ code: 'n' })]),
    ).toEqual([
      'attributes.0.minValue: minValue must not be greater than maxValue',
      'attributes.1.code: n repeats in the list',
    ]);
  });
});

describe('an attribute of the request', () => {
  const memory = attr({ code: 'memory', type: 'number', minValue: 0.5, maxValue: 64 });

  it('becomes a rule with defaults', () => {
    expect(ruleOf(memory)).toMatchObject({
      sortOrder: 0,
      allowedValues: null,
      minValue: 0.5,
      maxValue: 64,
      wholeNumbers: false,
      maxLength: null,
    });
  });

  it('is stored with numeric limits as strings', () => {
    expect(columnsOf(memory)).toMatchObject({ minValue: '0.5', maxValue: '64', unit: null });
  });
});
