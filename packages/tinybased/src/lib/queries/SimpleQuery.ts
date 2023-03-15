import { Queries } from 'tinybase/cjs/queries';
import { DeepPrettify, OnlyStringKeys, SortOptions, Table } from '../types';

export class SimpleQuery<
  // eslint-disable-next-line @typescript-eslint/ban-types
  TTable extends Table = {},
  TCells extends OnlyStringKeys<TTable> = never
> {
  constructor(
    public readonly queries: Queries,
    public readonly queryId: string
  ) {}

  public getResultRowIds(): string[] {
    return this.queries.getResultRowIds(this.queryId);
  }

  public getSortedRowIds(sortBy: TCells, options?: SortOptions) {
    const { descending = false, offset, limit } = options || {};
    return this.queries.getResultSortedRowIds(
      this.queryId,
      sortBy,
      descending,
      offset,
      limit
    );
  }

  public getResultTable(): DeepPrettify<Record<string, Pick<TTable, TCells>>> {
    return this.queries.getResultTable(this.queryId) as DeepPrettify<
      Record<string, Pick<TTable, TCells>>
    >;
  }
}
