# FilterKit QueryBuilder

[react-querybuilder](https://react-querybuilder.js.org/) integration for [FilterKit](https://github.com/turkraft/filterkit). Convert react-querybuilder queries to filter expressions for [Spring Filter](https://github.com/turkraft/springfilter) backends.

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

fetch(`/api/cars?filter=${encodeURIComponent(expr)}`);
```

## Install

```bash
npm install @turkraft/filterkit-querybuilder @turkraft/filterkit
```

## Usage

```ts
import { QueryBuilder, formatQuery } from 'react-querybuilder';
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

Group combinators (`and`, `or`, `xor`) and negation (`not`) are preserved. Sub-groups are wrapped in parentheses.

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
