import { build, stringify, AndOperator, OrOperator, XorOperator, NotOperator } from '@turkraft/filterkit';
import type { FilterNode, StepWithResult } from '@turkraft/filterkit';

export interface QueryRule {
  field: string;
  operator: string;
  value: unknown;
  valueSource?: 'value' | 'field';
}

export interface QueryGroup {
  combinator?: string;
  rules: (QueryRule | QueryGroup | string)[];
  not?: boolean;
}

export interface ToFilterExpressionOptions {
  onUnknownOperator?: 'throw' | 'skip';
}

const andOp = new AndOperator();
const orOp = new OrOperator();
const xorOp = new XorOperator();
const notOp = new NotOperator();

const KNOWN_OPERATORS = new Set([
  '=', '!=', '<', '>', '<=', '>=',
  'contains', 'beginsWith', 'endsWith',
  'doesNotContain', 'doesNotBeginWith', 'doesNotEndWith',
  'null', 'notNull', 'in', 'notIn', 'between', 'notBetween',
]);

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || v === '';
}

function isGroup(r: QueryRule | QueryGroup): r is QueryGroup {
  return 'rules' in r;
}

function splitValue(v: unknown): string[] {
  if (v == null) return [];
  if (Array.isArray(v)) return v.map(String).map(p => p.trim()).filter(Boolean);
  return String(v).split(',').map(p => p.trim()).filter(Boolean);
}

function operand(rule: QueryRule, raw: unknown): StepWithResult {
  return rule.valueSource === 'field'
    ? build().field(String(raw))
    : build().input(raw);
}

function operands(rule: QueryRule, raws: string[]): StepWithResult[] {
  return raws.map(raw => operand(rule, raw));
}

function buildRule(rule: QueryRule, options: ToFilterExpressionOptions): FilterNode | null {
  const { field, operator: op, value } = rule;

  if (!KNOWN_OPERATORS.has(op)) {
    if (options.onUnknownOperator === 'skip') return null;
    throw new Error(
      `Unsupported react-querybuilder operator \`${op}\` on field \`${field}\`. ` +
      `Supported operators: ${[...KNOWN_OPERATORS].join(', ')}.`
    );
  }

  if (isEmpty(value) && op !== 'null' && op !== 'notNull') return null;

  const fb = build();
  const text = String(value);

  switch (op) {
    case '=':
      return fb.field(field).equal(operand(rule, value)).get();

    case '!=':
      return fb.field(field).notEqual(operand(rule, value)).get();

    case '<':
      return fb.field(field).lessThan(operand(rule, value)).get();

    case '>':
      return fb.field(field).greaterThan(operand(rule, value)).get();

    case '<=':
      return fb.field(field).lessThanOrEqual(operand(rule, value)).get();

    case '>=':
      return fb.field(field).greaterThanOrEqual(operand(rule, value)).get();

    case 'contains':
      return fb.field(field).like(`%${text}%`).get();

    case 'beginsWith':
      return fb.field(field).like(`${text}%`).get();

    case 'endsWith':
      return fb.field(field).like(`%${text}`).get();

    case 'doesNotContain':
      return fb.field(field).like(`%${text}%`).not().get();

    case 'doesNotBeginWith':
      return fb.field(field).like(`${text}%`).not().get();

    case 'doesNotEndWith':
      return fb.field(field).like(`%${text}`).not().get();

    case 'null':
      return fb.field(field).isNull().get();

    case 'notNull':
      return fb.field(field).isNotNull().get();

    case 'in': {
      const parts = splitValue(value);
      if (parts.length === 0) return null;
      return fb.field(field).in(operands(rule, parts)).get();
    }

    case 'notIn': {
      const parts = splitValue(value);
      if (parts.length === 0) return null;
      return fb.field(field).notIn(operands(rule, parts)).get();
    }

    case 'between': {
      const parts = splitValue(value);
      if (parts.length < 2) return null;
      const [lower, upper] = operands(rule, parts);
      return fb.field(field).between(lower, upper).get();
    }

    case 'notBetween': {
      const parts = splitValue(value);
      if (parts.length < 2) return null;
      const [lower, upper] = operands(rule, parts);
      return fb.field(field).between(lower, upper).not().get();
    }

    default:
      return null;
  }
}

const KNOWN_COMBINATORS = ['and', 'or', 'xor'];

function operatorFor(combinator: string | undefined | null) {
  if (combinator == null || combinator === '') return andOp;
  switch (combinator.toLowerCase()) {
    case 'and': return andOp;
    case 'or': return orOp;
    case 'xor': return xorOp;
    default:
      throw new Error(
        `Unsupported react-querybuilder combinator \`${combinator}\`. ` +
        `Supported combinators: ${KNOWN_COMBINATORS.join(', ')}.`
      );
  }
}

function partition(
  rules: (QueryRule | QueryGroup | string)[],
  options: ToFilterExpressionOptions
): { nodes: FilterNode[]; combinators: string[] } {
  const nodes: FilterNode[] = [];
  const combinators: string[] = [];
  let pendingCombinator: string | null = null;

  for (const entry of rules) {
    if (typeof entry === 'string') {
      pendingCombinator = entry;
      continue;
    }
    const node = isGroup(entry)
      ? wrapGroup(buildGroup(entry, options))
      : buildRule(entry, options);
    if (node === null) {
      pendingCombinator = null;
      continue;
    }
    if (nodes.length > 0) combinators.push(pendingCombinator ?? '');
    nodes.push(node);
    pendingCombinator = null;
  }

  return { nodes, combinators };
}

function buildGroup(group: QueryGroup, options: ToFilterExpressionOptions): FilterNode | null {
  const { nodes, combinators } = partition(group.rules ?? [], options);

  if (nodes.length === 0) return null;

  let result = nodes[0];
  for (let i = 1; i < nodes.length; i++) {
    const combinator = combinators[i - 1] || group.combinator;
    result = result.infix(operatorFor(combinator), nodes[i]);
  }

  if (group.not) {
    result = (nodes.length > 1 ? build().priority(build().from(result)).get() : result)
      .prefix(notOp);
  }

  return result;
}

function wrapGroup(node: FilterNode | null): FilterNode | null {
  if (!node) return null;
  return build().priority(build().from(node)).get();
}

export function toFilterExpression(
  group: QueryGroup,
  options: ToFilterExpressionOptions = {}
): string {
  const node = buildGroup(group, options);
  if (!node) return '';
  return stringify(node);
}
