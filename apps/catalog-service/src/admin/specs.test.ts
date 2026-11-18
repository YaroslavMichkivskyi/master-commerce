import { describe, expect, it } from 'vitest';
import { type AttributeRule, effectiveAttributes, repeatedCodes, validateSpecs } from './specs.js';

const rule = (code: string, over: Partial<AttributeRule> = {}): AttributeRule => ({
  code,
  type: 'text',
  required: false,
  sortOrder: 0,
  allowedValues: null,
  minValue: null,
  maxValue: null,
  wholeNumbers: false,
  maxLength: 50,
  ...over,
});

// The example of the contract (US-1, US-3).
const GPU: AttributeRule[] = [
  rule('chipset', { required: true, sortOrder: 10 }),
  rule('memory_size', {
    type: 'number',
    required: true,
    minValue: 1,
    maxValue: 64,
    wholeNumbers: true,
    maxLength: null,
    sortOrder: 20,
  }),
  rule('memory_type', {
    type: 'select',
    required: true,
    allowedValues: ['GDDR6', 'GDDR6X', 'GDDR7'],
    maxLength: null,
    sortOrder: 30,
  }),
  rule('ray_tracing', { type: 'boolean', maxLength: null, sortOrder: 40 }),
];

const check = (attributes: AttributeRule[], specs: Record<string, unknown>) =>
  validateSpecs(attributes, specs, 'Graphics cards');
const messageFor = (attribute: AttributeRule, value: unknown) =>
  check([attribute], { [attribute.code]: value })[0]?.messages[0];

describe('validateSpecs (FR-011, R-8)', () => {
  it('accepts valid specs, optional ones left out', () => {
    expect(check(GPU, { chipset: 'AD107', memory_size: 8, memory_type: 'GDDR6' })).toEqual([]);
  });

  it('names every offending attribute at once, as in the contract (US-3)', () => {
    expect(
      check(GPU, { chipset: 'AD107', memory_size: 8.5, memory_type: 'HBM', colour: 'black' }),
    ).toEqual([
      { field: 'specs.memory_size', messages: ['memory_size must be a whole number from 1 to 64'] },
      { field: 'specs.memory_type', messages: ['memory_type must be one of GDDR6, GDDR6X, GDDR7'] },
      { field: 'specs.colour', messages: ['colour is not an attribute of Graphics cards'] },
    ]);
  });

  it('wants every required attribute, null counting as a wrong value', () => {
    expect(check(GPU, { chipset: 'AD107', memory_type: null })).toEqual([
      { field: 'specs.memory_size', messages: ['memory_size is required'] },
      { field: 'specs.memory_type', messages: ['memory_type must be one of GDDR6, GDDR6X, GDDR7'] },
    ]);
  });

  it('does not take a code from the object prototype', () => {
    expect(check([rule('constructor', { required: true })], {})).toEqual([
      { field: 'specs.constructor', messages: ['constructor is required'] },
    ]);
  });

  describe('select', () => {
    const socket = rule('socket', { type: 'select', allowedValues: ['AM5', 'LGA1700'] });
    it.each([['AM4'], [['AM5']], [5], ['am5']])('refuses %j', (value) => {
      expect(messageFor(socket, value)).toBe('socket must be one of AM5, LGA1700');
    });
    it('takes an allowed value', () => expect(messageFor(socket, 'AM5')).toBeUndefined());
  });

  describe('multi_select', () => {
    const ports = rule('ports', { type: 'multi_select', allowedValues: ['HDMI', 'DP'] });
    it.each([[['HDMI', 'DP']], [['DP']], [[]]])('takes %j', (value) => {
      expect(messageFor(ports, value)).toBeUndefined();
    });
    it.each([['HDMI'], [['VGA']], [['HDMI', 'HDMI']], [[1]]])('refuses %j', (value) => {
      expect(messageFor(ports, value)).toBe(
        'ports must be a list of different values from HDMI, DP',
      );
    });
    it('wants at least one value when required', () => {
      expect(messageFor({ ...ports, required: true }, [])).toBe(
        'ports must be a list of different values from HDMI, DP, at least one',
      );
    });
  });

  describe('number', () => {
    const clock = rule('boost_clock', { type: 'number', maxLength: null });
    it.each([[2.46], [0], [-1]])('takes any finite number %j without limits', (value) => {
      expect(messageFor(clock, value)).toBeUndefined();
    });
    it.each([['8'], [true], [null], [[8]]])('refuses %j: not a JSON number', (value) => {
      expect(messageFor(clock, value)).toBe('boost_clock must be a number');
    });
    it('keeps to the range, ends included, and to whole numbers', () => {
      const memory = GPU[1]!;
      expect(messageFor(memory, 1)).toBeUndefined();
      expect(messageFor(memory, 64)).toBeUndefined();
      for (const value of [0, 65, 8.5]) {
        expect(messageFor(memory, value)).toBe('memory_size must be a whole number from 1 to 64');
      }
    });
    it('says which end of a half-open range is broken', () => {
      expect(messageFor({ ...clock, minValue: 0.5 }, 0.1)).toBe(
        'boost_clock must be a number of at least 0.5',
      );
      expect(messageFor({ ...clock, maxValue: 3 }, 4)).toBe(
        'boost_clock must be a number of at most 3',
      );
    });
  });

  describe('boolean', () => {
    const rt = GPU[3]!;
    it.each([[true], [false]])('takes %j', (value) =>
      expect(messageFor(rt, value)).toBeUndefined(),
    );
    it.each([['true'], [1], [null]])('refuses %j', (value) => {
      expect(messageFor(rt, value)).toBe('ray_tracing must be true or false');
    });
  });

  describe('text', () => {
    const chip = rule('chip', { maxLength: 5 });
    it('takes a text up to its length', () => expect(messageFor(chip, 'AD107')).toBeUndefined());
    it.each([['AD107X'], [''], ['   '], [107]])('refuses %j', (value) => {
      expect(messageFor(chip, value)).toBe('chip must be a text of 1 to 5 characters');
    });
  });
});

describe('effective attributes along a path (FR-015)', () => {
  const path = [
    { name: 'Components', attributes: [rule('warranty', { sortOrder: 5 })] },
    {
      name: 'Graphics cards',
      attributes: [rule('memory_type', { sortOrder: 30 }), rule('chipset', { sortOrder: 10 })],
    },
  ];

  it('lists the ancestors first, then its own, each by sort order', () => {
    expect(effectiveAttributes(path).map((a) => a.code)).toEqual([
      'warranty',
      'chipset',
      'memory_type',
    ]);
  });

  it('finds the codes that repeat along the path', () => {
    expect(repeatedCodes(path)).toEqual([]);
    const child = { name: 'Laptop GPUs', attributes: [rule('warranty'), rule('tdp')] };
    expect(repeatedCodes([...path, child])).toEqual(['warranty']);
  });
});
