import { describe, it, expect } from 'vitest';
import { toFilterExpression } from '../src/index.js';

describe('toFilterExpression', () => {
  it('empty group returns empty string', () => {
    expect(toFilterExpression({ combinator: 'and', rules: [] })).toBe('');
  });

  it('single rule with =', () => {
    expect(toFilterExpression({
      combinator: 'and',
      rules: [{ field: 'status', operator: '=', value: 'active' }],
    })).toBe("status : 'active'");
  });

  it('single rule with !=', () => {
    expect(toFilterExpression({
      combinator: 'and',
      rules: [{ field: 'status', operator: '!=', value: 'deleted' }],
    })).toBe("status ! 'deleted'");
  });

  it('single rule with >', () => {
    expect(toFilterExpression({
      combinator: 'and',
      rules: [{ field: 'age', operator: '>', value: 18 }],
    })).toBe("age > '18'");
  });

  it('single rule with <', () => {
    expect(toFilterExpression({
      combinator: 'and',
      rules: [{ field: 'age', operator: '<', value: 65 }],
    })).toBe("age < '65'");
  });

  it('single rule with >=', () => {
    expect(toFilterExpression({
      combinator: 'and',
      rules: [{ field: 'age', operator: '>=', value: 18 }],
    })).toBe("age >: '18'");
  });

  it('single rule with <=', () => {
    expect(toFilterExpression({
      combinator: 'and',
      rules: [{ field: 'age', operator: '<=', value: 65 }],
    })).toBe("age <: '65'");
  });

  it('single rule with contains', () => {
    expect(toFilterExpression({
      combinator: 'and',
      rules: [{ field: 'name', operator: 'contains', value: 'John' }],
    })).toBe("name ~ '%John%'");
  });

  it('single rule with beginsWith', () => {
    expect(toFilterExpression({
      combinator: 'and',
      rules: [{ field: 'email', operator: 'beginsWith', value: 'admin' }],
    })).toBe("email ~ 'admin%'");
  });

  it('single rule with endsWith', () => {
    expect(toFilterExpression({
      combinator: 'and',
      rules: [{ field: 'file', operator: 'endsWith', value: '.pdf' }],
    })).toBe("file ~ '%.pdf'");
  });

  it('single rule with doesNotContain', () => {
    expect(toFilterExpression({
      combinator: 'and',
      rules: [{ field: 'name', operator: 'doesNotContain', value: 'test' }],
    })).toBe("not name ~ '%test%'");
  });

  it('single rule with doesNotBeginWith', () => {
    expect(toFilterExpression({
      combinator: 'and',
      rules: [{ field: 'name', operator: 'doesNotBeginWith', value: 'test' }],
    })).toBe("not name ~ 'test%'");
  });

  it('single rule with doesNotEndWith', () => {
    expect(toFilterExpression({
      combinator: 'and',
      rules: [{ field: 'name', operator: 'doesNotEndWith', value: 'test' }],
    })).toBe("not name ~ '%test'");
  });

  it('single rule with null', () => {
    expect(toFilterExpression({
      combinator: 'and',
      rules: [{ field: 'deletedAt', operator: 'null', value: '' }],
    })).toBe('deletedAt is null');
  });

  it('single rule with notNull', () => {
    expect(toFilterExpression({
      combinator: 'and',
      rules: [{ field: 'email', operator: 'notNull', value: '' }],
    })).toBe('email is not null');
  });

  it('single rule with in (comma-separated)', () => {
    expect(toFilterExpression({
      combinator: 'and',
      rules: [{ field: 'status', operator: 'in', value: 'active,pending,review' }],
    })).toBe("status in ['active', 'pending', 'review']");
  });

  it('single rule with notIn', () => {
    expect(toFilterExpression({
      combinator: 'and',
      rules: [{ field: 'status', operator: 'notIn', value: 'deleted,archived' }],
    })).toBe("status not in ['deleted', 'archived']");
  });

  it('single rule with between (comma-separated)', () => {
    expect(toFilterExpression({
      combinator: 'and',
      rules: [{ field: 'age', operator: 'between', value: '18,65' }],
    })).toBe("age between '18' and '65'");
  });

  it('single rule with notBetween', () => {
    expect(toFilterExpression({
      combinator: 'and',
      rules: [{ field: 'age', operator: 'notBetween', value: '18,65' }],
    })).toBe("not age between '18' and '65'");
  });

  it('multiple rules combined with AND', () => {
    expect(toFilterExpression({
      combinator: 'and',
      rules: [
        { field: 'age', operator: '>=', value: 18 },
        { field: 'status', operator: '=', value: 'active' },
      ],
    })).toBe("age >: '18' and status : 'active'");
  });

  it('multiple rules combined with OR', () => {
    expect(toFilterExpression({
      combinator: 'or',
      rules: [
        { field: 'color', operator: '=', value: 'red' },
        { field: 'color', operator: '=', value: 'blue' },
      ],
    })).toBe("color : 'red' or color : 'blue'");
  });

  it('nested groups', () => {
    expect(toFilterExpression({
      combinator: 'and',
      rules: [
        { field: 'status', operator: '=', value: 'active' },
        {
          combinator: 'or',
          rules: [
            { field: 'color', operator: '=', value: 'red' },
            { field: 'color', operator: '=', value: 'blue' },
          ],
        },
      ],
    })).toBe("status : 'active' and (color : 'red' or color : 'blue')");
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

  it('not on group negates entire group', () => {
    expect(toFilterExpression({
      combinator: 'and',
      not: true,
      rules: [
        { field: 'status', operator: '=', value: 'deleted' },
      ],
    })).toBe("not status : 'deleted'");
  });

  it('skips rules with empty value', () => {
    expect(toFilterExpression({
      combinator: 'and',
      rules: [
        { field: 'name', operator: '=', value: '' },
        { field: 'age', operator: '=', value: 30 },
      ],
    })).toBe("age : '30'");
  });

  it('skips rules with null/undefined value', () => {
    expect(toFilterExpression({
      combinator: 'and',
      rules: [
        { field: 'a', operator: '=', value: null },
        { field: 'b', operator: '=', value: 'hello' },
        { field: 'c', operator: '=', value: undefined },
      ],
    })).toBe("b : 'hello'");
  });

  it('single item in group returns without combinator wrapping', () => {
    expect(toFilterExpression({
      combinator: 'and',
      rules: [
        { field: 'status', operator: '=', value: 'active' },
      ],
    })).toBe("status : 'active'");
  });

  it('handles nested field names', () => {
    expect(toFilterExpression({
      combinator: 'and',
      rules: [{ field: 'user.name', operator: '=', value: 'john' }],
    })).toBe("user.name : 'john'");
  });

  it('handles boolean values', () => {
    expect(toFilterExpression({
      combinator: 'and',
      rules: [{ field: 'active', operator: '=', value: true }],
    })).toBe("active : 'true'");
  });

  it('handles array value for in (multiselect)', () => {
    expect(toFilterExpression({
      combinator: 'and',
      rules: [{ field: 'status', operator: 'in', value: ['active', 'pending'] }],
    })).toBe("status in ['active', 'pending']");
  });

  it('handles array value for between', () => {
    expect(toFilterExpression({
      combinator: 'and',
      rules: [{ field: 'age', operator: 'between', value: [18, 65] }],
    })).toBe("age between '18' and '65'");
  });
});
