# FilterKit QueryBuilder

[react-querybuilder](https://react-querybuilder.js.org/) integration for [FilterKit](https://github.com/turkraft/filterkit). Turn a react-querybuilder query into a filter expression you can send to your API.

```ts
import { toFilterExpression } from '@turkraft/filterkit-querybuilder';

const query = {
  combinator: 'and',
  rules: [
    { field: 'year', operator: 'between', value: '2020,2025' },
    { field: 'status', operator: 'in', value: 'active,pending' },
    { field: 'name', operator: 'contains', value: 'John' },
  ],
};

const expr = toFilterExpression(query);
// => year between '2020' and '2025' and status in ['active', 'pending'] and name ~ '%John%'
```

## Install

```bash
npm install @turkraft/filterkit-querybuilder @turkraft/filterkit
```

## Ecosystem

See the other FilterKit integrations:

- [TanStack](https://github.com/turkraft/filterkit-tanstack) — TanStack Table
- [Prisma](https://github.com/turkraft/filterkit-prisma) — Prisma where clauses
- [Drizzle](https://github.com/turkraft/filterkit-drizzle) — Drizzle where clauses

## Usage

```ts
import { QueryBuilder } from 'react-querybuilder';
import { toFilterExpression } from '@turkraft/filterkit-querybuilder';

function MyComponent() {
  const [query, setQuery] = useState(initialQuery);

  const filterString = toFilterExpression(query);

  const fetchData = () => {
    fetch(`/api/data?filter=${encodeURIComponent(filterString)}`);
  };

  return <QueryBuilder query={query} onQueryChange={setQuery} />;
}
```

`toFilterExpression` returns `''` for an empty query — that means "no filter", so
check for it before sending an empty `filter=` parameter.

## Operator mapping

| react-querybuilder operator | FilterKit expression |
|---|---|
| `=` | `field : 'value'` |
| `!=` | `field ! 'value'` |
| `<`, `>`, `<=`, `>=` | comparisons |
| `contains` | `field ~ '%value%'` |
| `beginsWith` | `field ~ 'value%'` |
| `endsWith` | `field ~ '%value'` |
| `doesNotContain` | `not field ~ '%value%'` |
| `doesNotBeginWith` | `not field ~ 'value%'` |
| `doesNotEndWith` | `not field ~ '%value'` |
| `null` | `field is null` |
| `notNull` | `field is not null` |
| `in` | `field in ['a', 'b']` |
| `notIn` | `field not in ['a', 'b']` |
| `between` | `field between 'a' and 'b'` |
| `notBetween` | `not field between 'a' and 'b'` |

`in`, `notIn`, `between` and `notBetween` accept either an array or
react-querybuilder's comma-separated string form.

An operator outside this table throws, so a typo or a custom operator you have not
mapped surfaces immediately instead of quietly becoming `=`. Pass
`{ onUnknownOperator: 'skip' }` to drop those rules instead:

```ts
toFilterExpression(query, { onUnknownOperator: 'skip' });
```

## Groups

Group combinators (`and`, `or`, `xor`) and negation (`not`) are preserved. A
combinator outside those three throws; defaulting it to `and` would silently
change the query, since `and` is not a subset of `xor`. A group with no
combinator at all still means `and`.
Sub-groups and negated groups are parenthesised, so the emitted expression means
what the builder showed:

```ts
toFilterExpression({
  combinator: 'and',
  not: true,
  rules: [
    { field: 'a', operator: '=', value: 1 },
    { field: 'b', operator: '=', value: 2 },
  ],
});
// => not (a : '1' and b : '2')
```

### Independent combinators

react-querybuilder's `RuleGroupTypeIC` puts a combinator string between each pair
of rules. That shape is supported; rules are combined left to right and
parenthesised where precedence requires it:

```ts
toFilterExpression({
  rules: [
    { field: 'a', operator: '=', value: 1 },
    'or',
    { field: 'b', operator: '=', value: 2 },
    'and',
    { field: 'c', operator: '=', value: 3 },
  ],
});
// => (a : '1' or b : '2') and c : '3'
```

## Comparing two fields

A rule with `valueSource: 'field'` compares against another column rather than a
literal:

```ts
toFilterExpression({
  combinator: 'and',
  rules: [{ field: 'startDate', operator: '<=', value: 'endDate', valueSource: 'field' }],
});
// => startDate <: endDate
```

## Caveats

- Values are quoted; the backend converts them to each field's type.
- `contains` / `beginsWith` / `endsWith` wrap the value in `%` without escaping, so
  a `%` or `_` the user types becomes a wildcard. Sanitise the value first if that
  matters for your endpoint.
- The `in` / `between` string form splits on commas, so a value containing a comma
  must be passed as an array.

## Sending it to a Spring Boot API

The expression syntax matches [Spring Filter](https://github.com/turkraft/springfilter),
so the string this package produces can go straight into a `filter=` parameter on a
Spring Boot endpoint. Nothing here depends on that — any API that understands the
syntax works the same way.

## [Sponsors](https://github.com/sponsors/torshid)

Sponsor our project and have your issues prioritized.

<table>
<tr>
<td align="center"><a href="https://github.com/ixorbv"><img width="64" src="https://avatars.githubusercontent.com/u/127401397?v=4"/><br/>ixorbv</a></td>
<td align="center"><a href="https://github.com/marcopag90"><img width="64" src="https://avatars.githubusercontent.com/marcopag90"/><br/>marcopag90</a></td>
</tr>
</table>

## License

MIT
