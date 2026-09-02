import { describe, it, expect } from 'vitest';
import { toFilterExpression } from '../src/index.js';
import { FilterParserImpl } from '@turkraft/filterkit';

const strict = new FilterParserImpl(undefined, { strict: true });

describe('emitted expressions are accepted by Spring Filter', () => {
  const cases: Array<[string, any]> = [
    ['flat and', { combinator: 'and', rules: [
      { field: 'a', operator: '=', value: 1 },
      { field: 'b', operator: 'contains', value: "o'brien" },
    ] }],
    ['negated group', { combinator: 'and', not: true, rules: [
      { field: 'a', operator: '=', value: 1 },
      { field: 'b', operator: '=', value: 2 },
    ] }],
    ['nested groups', { combinator: 'or', rules: [
      { combinator: 'and', rules: [
        { field: 'a', operator: '>', value: 1 },
        { field: 'b', operator: 'null', value: null },
      ] },
      { combinator: 'and', not: true, rules: [
        { field: 'c', operator: 'notBetween', value: '1,5' },
        { field: 'd', operator: 'notIn', value: 'x,y' },
      ] },
    ] }],
    ['independent combinators', { rules: [
      { field: 'a', operator: '=', value: 1 },
      'or',
      { field: 'b', operator: '=', value: 2 },
      'and',
      { field: 'c', operator: '=', value: 3 },
    ] }],
    ['field comparison', { combinator: 'and', rules: [
      { field: 'startDate', operator: '<=', value: 'endDate', valueSource: 'field' },
    ] }],
    ['every operator', { combinator: 'and', rules: [
      { field: 'a', operator: '=', value: 1 },
      { field: 'a', operator: '!=', value: 1 },
      { field: 'a', operator: '<', value: 1 },
      { field: 'a', operator: '>', value: 1 },
      { field: 'a', operator: '<=', value: 1 },
      { field: 'a', operator: '>=', value: 1 },
      { field: 'a', operator: 'contains', value: 'x' },
      { field: 'a', operator: 'beginsWith', value: 'x' },
      { field: 'a', operator: 'endsWith', value: 'x' },
      { field: 'a', operator: 'doesNotContain', value: 'x' },
      { field: 'a', operator: 'doesNotBeginWith', value: 'x' },
      { field: 'a', operator: 'doesNotEndWith', value: 'x' },
      { field: 'a', operator: 'null', value: null },
      { field: 'a', operator: 'notNull', value: null },
      { field: 'a', operator: 'in', value: 'x,y' },
      { field: 'a', operator: 'notIn', value: 'x,y' },
      { field: 'a', operator: 'between', value: '1,5' },
      { field: 'a', operator: 'notBetween', value: '1,5' },
    ] }],
  ];

  for (const [name, query] of cases) {
    it(name, () => {
      const expression = toFilterExpression(query);
      expect(expression).not.toBe('');
      expect(() => strict.parse(expression), expression).not.toThrow();
    });
  }
});
