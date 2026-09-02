import { describe, it, expect } from 'vitest';
import { toFilterExpression } from '../src/index.js';
import { FilterParserImpl, stringify } from '@turkraft/filterkit';

const strict = new FilterParserImpl(undefined, { strict: true });

function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 0x100000000; };
}

const FIELDS = ['a', 'b', 'brand.name', 'x_1', '$y'];
const OPERATORS = [
  '=', '!=', '<', '>', '<=', '>=', 'contains', 'beginsWith', 'endsWith',
  'doesNotContain', 'doesNotBeginWith', 'doesNotEndWith', 'null', 'notNull',
  'in', 'notIn', 'between', 'notBetween',
];
const VALUES: unknown[] = [
  'x', "o'brien", 'a,b', '1,5', 1, 0, -1, 1.5, true, false, '', null,
  'C:\\path', '50%', 'a_b', ['p', 'q'], ['1', '5'], '  spaced  ', 'ünïcödé',
];
const COMBINATORS = ['and', 'or', 'xor', 'AND', 'Or'];

function randomRule(rand: () => number): any {
  const pick = <T,>(xs: T[]): T => xs[Math.floor(rand() * xs.length)];
  const rule: any = {
    field: pick(FIELDS),
    operator: pick(OPERATORS),
    value: pick(VALUES),
  };
  if (rand() < 0.15) rule.valueSource = 'field', rule.value = pick(FIELDS);
  return rule;
}

function randomGroup(rand: () => number, depth: number): any {
  const pick = <T,>(xs: T[]): T => xs[Math.floor(rand() * xs.length)];
  const count = 1 + Math.floor(rand() * 3);
  const independent = rand() < 0.3;
  const rules: any[] = [];
  for (let i = 0; i < count; i++) {
    if (i > 0 && independent) rules.push(pick(COMBINATORS));
    rules.push(depth > 0 && rand() < 0.3 ? randomGroup(rand, depth - 1) : randomRule(rand));
  }
  const group: any = { rules };
  if (!independent) group.combinator = pick(COMBINATORS);
  if (rand() < 0.25) group.not = true;
  return group;
}

describe('querybuilder fuzzing', () => {
  it('every emitted expression is accepted by the strict parser', () => {
    const rand = rng(0x9B10);
    const bad: string[] = [];
    let emitted = 0, empty = 0;
    for (let i = 0; i < 20000; i++) {
      const query = randomGroup(rand, 2);
      let expression: string;
      try { expression = toFilterExpression(query); } catch (e: any) {
        if (e instanceof RangeError || e instanceof TypeError) {
          if (bad.length < 10) bad.push(`  ${e.constructor.name}: ${e.message.slice(0, 70)}\n      ${JSON.stringify(query).slice(0, 160)}`);
        }
        continue;
      }
      if (expression === '') { empty++; continue; }
      emitted++;
      try { strict.parse(expression); } catch (e: any) {
        if (bad.length < 10) {
          bad.push(`  NOT ACCEPTED BY SPRING FILTER\n      ${expression}\n      ${e.message.slice(0, 90)}`);
        }
      }
    }
    console.log(`  ${emitted} expressions emitted, ${empty} empty, ${bad.length} problem(s)`);
    bad.forEach(b => console.log(b));
    expect(bad).toEqual([]);
    expect(emitted).toBeGreaterThan(5000);
  }, 60000);

  it('emitted expressions are stable under a re-parse', () => {
    const rand = rng(0x51AB);
    const bad: string[] = [];
    let checked = 0;
    for (let i = 0; i < 10000; i++) {
      const query = randomGroup(rand, 2);
      let expression: string;
      try { expression = toFilterExpression(query); } catch { continue; }
      if (expression === '') continue;
      checked++;
      try {
        const again = new FilterParserImpl().parse(expression);
        if (stringify(again) !== expression && bad.length < 10) {
          bad.push(`  ${expression}\n      became ${stringify(again)}`);
        }
      } catch (e: any) {
        if (bad.length < 10) bad.push(`  ${expression}\n      ${e.message.slice(0, 80)}`);
      }
    }
    console.log(`  ${checked} expressions round-tripped, ${bad.length} problem(s)`);
    bad.forEach(b => console.log(b));
    expect(bad).toEqual([]);
  }, 60000);
});
