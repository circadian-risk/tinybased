import { Queries } from 'tinybase/cjs/queries';
import { DeepPrettify, OnlyStringKeys, SortOptions, Table } from '../types';

export class Query<TSelection extends Record<string, unknown>> {
  constructor(
    public readonly queries: Queries,
    public readonly queryId: string
  ) {}

  /**
   * Returns immediately with the current matching row ids for this query.
   * Will not update reactively if the query changes
   */
  public getResultRowIds(): string[] {
    return this.queries.getResultRowIds(this.queryId);
  }

  /**
   * Returns immediately with the current matching row ids for this query and the supplied
   * sorting options.
   * Will not udpate reactively if the query changes
   */
  public getSortedRowIds(
    sortBy: OnlyStringKeys<TSelection>,
    options?: SortOptions
  ) {
    const { descending = false, offset, limit } = options || {};
    return this.queries.getResultSortedRowIds(
      this.queryId,
      sortBy,
      descending,
      offset,
      limit
    );
  }

  /**
   * Returns immediately with the current matching row selections for this query.
   *    Represented as a Record of row id and the value as an object matching the query selection
   * Will not update reactively if the query changes
   */
  public getResultTable(): DeepPrettify<Record<string, TSelection>> {
    return this.queries.getResultTable(this.queryId) as DeepPrettify<
      Record<string, TSelection>
    >;
  }
}
