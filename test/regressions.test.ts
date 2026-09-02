import { describe, it, expect } from 'vitest';
import { toFilterExpression } from '../src/index.js';
import { parse, stringify, matches } from '@turkraft/filterkit';

const backendReads = (s: string) => stringify(parse(s));

describe('group-level negation', () => {
  it('negates the whole group, not just its first term', () => {
    const expression = toFilterExpression({
      combinator: 'and',
      not: true,
      rules: [
        { field: 'a', operator: '=', value: 1 },
        { field: 'b', operator: '=', value: 2 },
      ],
    });
    expect(expression).toBe("not (a : '1' and b : '2')");
    expect(backendReads(expression)).toBe(expression);
    expect(matches({ a: 1, b: 9 }, expression)).toBe(true);
    expect(matches({ a: 1, b: 2 }, expression)).toBe(false);
  });

  it('negates a nested group', () => {
    const expression = toFilterExpression({
      combinator: 'and',
      rules: [
        { field: 'z', operator: '=', value: 0 },
        {
          combinator: 'or',
          not: true,
          rules: [
            { field: 'a', operator: '=', value: 1 },
            { field: 'b', operator: '=', value: 2 },
          ],
        },
      ],
    });
    expect(expression).toBe("z : '0' and (not (a : '1' or b : '2'))");
    expect(matches({ z: 0, a: 9, b: 9 }, expression)).toBe(true);
    expect(matches({ z: 0, a: 1, b: 9 }, expression)).toBe(false);
  });

  it('negates a single-rule group', () => {
    expect(toFilterExpression({
      combinator: 'and',
      not: true,
      rules: [{ field: 'a', operator: '=', value: 1 }],
    })).toBe("not a : '1'");
  });
});

describe('independent combinators (RuleGroupTypeIC)', () => {
  it('accepts combinator strings between rules', () => {
    expect(toFilterExpression({
      rules: [
        { field: 'a', operator: '=', value: 1 },
        'and',
        { field: 'b', operator: '=', value: 2 },
      ],
    })).toBe("a : '1' and b : '2'");
  });

  it('honours a different combinator per gap', () => {
    const expression = toFilterExpression({
      rules: [
        { field: 'a', operator: '=', value: 1 },
        'and',
        { field: 'b', operator: '=', value: 2 },
        'or',
        { field: 'c', operator: '=', value: 3 },
      ],
    });
    expect(expression).toBe("a : '1' and b : '2' or c : '3'");
    expect(backendReads(expression)).toBe(expression);
    expect(matches({ a: 9, b: 9, c: 3 }, expression)).toBe(true);
    expect(matches({ a: 1, b: 9, c: 9 }, expression)).toBe(false);
  });

  it('parenthesises when a lower-priority combinator comes first', () => {
    const expression = toFilterExpression({
      rules: [
        { field: 'a', operator: '=', value: 1 },
        'or',
        { field: 'b', operator: '=', value: 2 },
        'and',
        { field: 'c', operator: '=', value: 3 },
      ],
    });
    expect(expression).toBe("(a : '1' or b : '2') and c : '3'");
    expect(matches({ a: 1, b: 9, c: 9 }, expression)).toBe(false);
    expect(matches({ a: 1, b: 9, c: 3 }, expression)).toBe(true);
  });

  it('handles nested IC groups', () => {
    expect(toFilterExpression({
      rules: [
        { field: 'a', operator: '=', value: 1 },
        'or',
        { rules: [{ field: 'b', operator: '=', value: 2 }, 'and', { field: 'c', operator: '=', value: 3 }] },
      ],
    })).toBe("a : '1' or (b : '2' and c : '3')");
  });
});

describe('unknown operators', () => {
  it('throws by default instead of silently meaning equals', () => {
    expect(() => toFilterExpression({
      combinator: 'and',
      rules: [{ field: 'a', operator: 'contains2', value: 'x' }],
    })).toThrow(/Unsupported react-querybuilder operator `contains2`/);
  });

  it('can be told to skip instead', () => {
    expect(toFilterExpression({
      combinator: 'and',
      rules: [
        { field: 'a', operator: 'contains2', value: 'x' },
        { field: 'b', operator: '=', value: 2 },
      ],
    }, { onUnknownOperator: 'skip' })).toBe("b : '2'");
  });
});

describe("valueSource: 'field'", () => {
  it('compares two columns instead of quoting the name', () => {
    expect(toFilterExpression({
      combinator: 'and',
      rules: [{ field: 'startDate', operator: '<=', value: 'endDate', valueSource: 'field' }],
    })).toBe('startDate <: endDate');
  });

  it('still quotes plain values', () => {
    expect(toFilterExpression({
      combinator: 'and',
      rules: [{ field: 'startDate', operator: '<=', value: 'endDate' }],
    })).toBe("startDate <: 'endDate'");
  });

  it('applies to in and between too', () => {
    expect(toFilterExpression({
      combinator: 'and',
      rules: [{ field: 'a', operator: 'in', value: 'b,c', valueSource: 'field' }],
    })).toBe('a in [b, c]');
    expect(toFilterExpression({
      combinator: 'and',
      rules: [{ field: 'a', operator: 'between', value: 'lo,hi', valueSource: 'field' }],
    })).toBe('a between lo and hi');
  });
});

describe('emitted expressions survive a round trip', () => {
  const queries: Array<[string, any]> = [
    ['flat and', { combinator: 'and', rules: [
      { field: 'a', operator: '=', value: 1 },
      { field: 'b', operator: 'contains', value: 'x' },
    ] }],
    ['or of groups', { combinator: 'or', rules: [
      { combinator: 'and', rules: [
        { field: 'a', operator: '>', value: 1 },
        { field: 'b', operator: '<', value: 9 },
      ] },
      { combinator: 'and', not: true, rules: [
        { field: 'c', operator: 'null', value: null },
        { field: 'd', operator: 'notNull', value: null },
      ] },
    ] }],
    ['notBetween', { combinator: 'and', rules: [
      { field: 'year', operator: 'notBetween', value: '2020,2025' },
    ] }],
    ['doesNotContain plus and', { combinator: 'and', rules: [
      { field: 'a', operator: 'doesNotContain', value: 'x' },
      { field: 'b', operator: '=', value: 1 },
    ] }],
  ];

  for (const [name, query] of queries) {
    it(name, () => {
      const expression = toFilterExpression(query);
      expect(backendReads(expression)).toBe(expression);
    });
  }

  it('notBetween actually excludes the range', () => {
    const expression = toFilterExpression({
      combinator: 'and',
      rules: [{ field: 'year', operator: 'notBetween', value: '2020,2025' }],
    });
    expect(matches({ year: 2022 }, expression)).toBe(false);
    expect(matches({ year: 2019 }, expression)).toBe(true);
  });
});

describe('combinators are validated, not silently defaulted', () => {
  it('throws on an unrecognised combinator', () => {
    expect(() => toFilterExpression({
      combinator: 'nand',
      rules: [{ field: 'a', operator: '=', value: 1 }, { field: 'b', operator: '=', value: 2 }],
    } as any)).toThrow(/Unsupported react-querybuilder combinator `nand`/);
  });

  it('a silent fallback to `and` would have widened an intended xor', () => {
    const xor = toFilterExpression({
      combinator: 'xor',
      rules: [{ field: 'a', operator: '=', value: 1 }, { field: 'b', operator: '=', value: 2 }],
    });
    expect(matches({ a: 1, b: 2 }, xor)).toBe(false);
    expect(matches({ a: 1, b: 9 }, xor)).toBe(true);
  });

  it('accepts the three real combinators in any casing', () => {
    for (const combinator of ['and', 'AND', 'or', 'Or', 'xor', 'XOR']) {
      expect(() => toFilterExpression({
        combinator,
        rules: [{ field: 'a', operator: '=', value: 1 }, { field: 'b', operator: '=', value: 2 }],
      } as any), combinator).not.toThrow();
    }
  });

  it('still defaults a missing combinator to and', () => {
    expect(toFilterExpression({
      rules: [{ field: 'a', operator: '=', value: 1 }, { field: 'b', operator: '=', value: 2 }],
    } as any)).toBe("a : '1' and b : '2'");
  });
});
