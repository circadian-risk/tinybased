import { Queries } from 'tinybase/cjs/queries';
import { QueryOptions, Table } from '../types';

export class SimpleQuery<
  // eslint-disable-next-line @typescript-eslint/ban-types
  TTable extends Table = {},
  TCells extends keyof TTable = never
> {
  constructor(
    public readonly queries: Queries,
    public readonly queryId: string
  ) {}

  public getResultRowIds() {
    return this.queries.getResultRowIds(this.queryId);
  }

  public getSortedRowIds(sortBy: TCells, options?: QueryOptions) {
    const { descending = false, offset, limit } = options || {};
    return this.queries.getResultSortedRowIds(
      this.queryId,
      sortBy as string,
      descending,
      offset,
      limit
    );
  }

  public getResultTable(): Record<string, Pick<TTable, TCells>> {
    return this.queries.getResultTable(this.queryId) as Record<
      string,
      Pick<TTable, TCells>
    >;
  }
}
