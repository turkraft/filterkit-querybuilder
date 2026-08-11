import { build, stringify, AndOperator, OrOperator, XorOperator, NotOperator } from '@turkraft/filterkit';
import type { FilterNode } from '@turkraft/filterkit';

export interface QueryRule {
  field: string;
  operator: string;
  value: unknown;
}

export interface QueryGroup {
  combinator: string;
  rules: (QueryRule | QueryGroup)[];
  not?: boolean;
}

const andOp = new AndOperator();
const orOp = new OrOperator();
const xorOp = new XorOperator();
const notOp = new NotOperator();

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || v === '';
}

function splitValue(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(String).map(p => p.trim()).filter(Boolean);
  return String(v).split(',').map(p => p.trim()).filter(Boolean);
}

function buildRule(rule: QueryRule): FilterNode | null {
  const { field, operator: op, value } = rule;

  if (isEmpty(value) && op !== 'null' && op !== 'notNull') return null;

  const fb = build();

  switch (op) {
    case '=':
      return fb.field(field).equal(value as any).get();

    case '!=':
      return fb.field(field).notEqual(value as any).get();

    case '<':
      return fb.field(field).lessThan(value as any).get();

    case '>':
      return fb.field(field).greaterThan(value as any).get();

    case '<=':
      return fb.field(field).lessThanOrEqual(value as any).get();

    case '>=':
      return fb.field(field).greaterThanOrEqual(value as any).get();

    case 'contains':
      return fb.field(field).like(`%${value}%` as any).get();

    case 'beginsWith':
      return fb.field(field).like(`${value}%` as any).get();

    case 'endsWith':
      return fb.field(field).like(`%${value}` as any).get();

    case 'doesNotContain':
      return fb.field(field).like(`%${value}%` as any).not().get();

    case 'doesNotBeginWith':
      return fb.field(field).like(`${value}%` as any).not().get();

    case 'doesNotEndWith':
      return fb.field(field).like(`%${value}` as any).not().get();

    case 'null':
      return fb.field(field).isNull().get();

    case 'notNull':
      return fb.field(field).isNotNull().get();

    case 'in': {
      const parts = splitValue(value);
      if (parts.length === 0) return null;
      return fb.field(field).in(parts as any).get();
    }

    case 'notIn': {
      const parts = splitValue(value);
      if (parts.length === 0) return null;
      return fb.field(field).notIn(parts as any).get();
    }

    case 'between': {
      const parts = splitValue(value);
      if (parts.length < 2) return null;
      return fb.field(field).between(parts[0] as any, parts[1] as any).get();
    }

    case 'notBetween': {
      const parts = splitValue(value);
      if (parts.length < 2) return null;
      return fb.field(field).between(parts[0] as any, parts[1] as any).not().get();
    }

    default:
      return fb.field(field).equal(value as any).get();
  }
}

function buildGroup(group: QueryGroup): FilterNode | null {
  const nodes = group.rules
    .map(r => 'field' in r ? buildRule(r) : wrapGroup(buildGroup(r)))
    .filter((n): n is FilterNode => n !== null);

  if (nodes.length === 0) return null;

  let result: FilterNode;

  if (nodes.length === 1) {
    result = nodes[0];
  } else {
    const combinator = group.combinator.toLowerCase();
    let op;
    switch (combinator) {
      case 'or': op = orOp; break;
      case 'xor': op = xorOp; break;
      default: op = andOp;
    }
    result = nodes.slice(1).reduce((acc, node) => acc.infix(op, node), nodes[0]);
  }

  if (group.not) {
    result = result.prefix(notOp);
  }

  return result;
}

function wrapGroup(node: FilterNode | null): FilterNode | null {
  if (!node) return null;
  return build().priority(build().from(node)).get();
}

export function toFilterExpression(group: QueryGroup): string {
  const node = buildGroup(group);
  if (!node) return '';
  return stringify(node);
}
