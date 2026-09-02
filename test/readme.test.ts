import { describe, it, expect } from 'vitest';
import { toFilterExpression } from '../src/index.js';

describe('README examples', () => {
  it('opening example', () => {
    const query = {
      combinator: 'and',
      rules: [
        { field: 'year', operator: 'between', value: '2020,2025' },
        { field: 'status', operator: 'in', value: 'active,pending' },
        { field: 'name', operator: 'contains', value: 'John' },
      ],
    };
    expect(toFilterExpression(query))
      .toBe("year between '2020' and '2025' and status in ['active', 'pending'] and name ~ '%John%'");
  });

  it('an empty query yields an empty string', () => {
    expect(toFilterExpression({ combinator: 'and', rules: [] })).toBe('');
  });

  it('operator mapping table', () => {
    const one = (operator: string, value: unknown) =>
      toFilterExpression({ combinator: 'and', rules: [{ field: 'field', operator, value }] });

    expect(one('=', 'value')).toBe("field : 'value'");
    expect(one('!=', 'value')).toBe("field ! 'value'");
    expect(one('<', 1)).toBe("field < '1'");
    expect(one('>', 1)).toBe("field > '1'");
    expect(one('<=', 1)).toBe("field <: '1'");
    expect(one('>=', 1)).toBe("field >: '1'");
    expect(one('contains', 'value')).toBe("field ~ '%value%'");
    expect(one('beginsWith', 'value')).toBe("field ~ 'value%'");
    expect(one('endsWith', 'value')).toBe("field ~ '%value'");
    expect(one('doesNotContain', 'value')).toBe("not field ~ '%value%'");
    expect(one('doesNotBeginWith', 'value')).toBe("not field ~ 'value%'");
    expect(one('doesNotEndWith', 'value')).toBe("not field ~ '%value'");
    expect(one('null', null)).toBe('field is null');
    expect(one('notNull', null)).toBe('field is not null');
    expect(one('in', 'a,b')).toBe("field in ['a', 'b']");
    expect(one('notIn', 'a,b')).toBe("field not in ['a', 'b']");
    expect(one('between', 'a,b')).toBe("field between 'a' and 'b'");
    expect(one('notBetween', 'a,b')).toBe("not field between 'a' and 'b'");
  });

  it('arrays work wherever the comma-separated form does', () => {
    const one = (operator: string, value: unknown) =>
      toFilterExpression({ combinator: 'and', rules: [{ field: 'field', operator, value }] });
    expect(one('in', ['a', 'b'])).toBe("field in ['a', 'b']");
    expect(one('between', ['a', 'b'])).toBe("field between 'a' and 'b'");
  });

  it('an unknown operator throws, or can be skipped', () => {
    const query = { combinator: 'and', rules: [{ field: 'a', operator: 'nope', value: 'x' }] };
    expect(() => toFilterExpression(query)).toThrow(/Unsupported react-querybuilder operator/);
    expect(toFilterExpression(query, { onUnknownOperator: 'skip' })).toBe('');
  });

  it('negated group', () => {
    expect(toFilterExpression({
      combinator: 'and',
      not: true,
      rules: [
        { field: 'a', operator: '=', value: 1 },
        { field: 'b', operator: '=', value: 2 },
      ],
    })).toBe("not (a : '1' and b : '2')");
  });

  it('independent combinators', () => {
    expect(toFilterExpression({
      rules: [
        { field: 'a', operator: '=', value: 1 },
        'or',
        { field: 'b', operator: '=', value: 2 },
        'and',
        { field: 'c', operator: '=', value: 3 },
      ],
    })).toBe("(a : '1' or b : '2') and c : '3'");
  });

  it('comparing two fields', () => {
    expect(toFilterExpression({
      combinator: 'and',
      rules: [{ field: 'startDate', operator: '<=', value: 'endDate', valueSource: 'field' }],
    })).toBe('startDate <: endDate');
  });

  it('xor combinator', () => {
    expect(toFilterExpression({
      combinator: 'xor',
      rules: [
        { field: 'a', operator: '=', value: 1 },
        { field: 'b', operator: '=', value: 2 },
      ],
    })).toBe("a : '1' xor b : '2'");
  });
});
