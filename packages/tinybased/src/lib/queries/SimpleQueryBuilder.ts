import { Queries } from 'tinybase/queries';
import { Aggregations, Cell, TableSchema } from '../types';
import { SimpleAggregateQuery } from './SimpleAggregateQuery';
import { SimpleQuery } from './SimpleQuery';

export class SimpleQueryBuilder<
  // eslint-disable-next-line @typescript-eslint/ban-types
  TTable extends TableSchema = {},
  TCells extends keyof TTable = never
> {
  // TODO maybe we should model this as a Map/Record so that conditions for a given cell
  // can be overwritten. This would allow for easier composition of query builder instances
  private wheres: Array<[string, Cell]> = [];
  private selects: Array<TCells> = [];

  constructor(
    private readonly table: keyof TTable,
    private readonly queries: Queries
  ) {}

  select<TCell extends keyof TTable>(
    cell: TCell
  ): SimpleQueryBuilder<TTable, TCells | TCell> {
    this.selects.push(cell as any);
    return this as SimpleQueryBuilder<TTable, TCells | TCell>;
  }

  where<TCell extends keyof TTable, TValue extends TTable[TCell]>(
    cell: TCell,
    value: TValue
  ): SimpleQueryBuilder<TTable, TCells> {
    this.wheres.push([cell as string, value]);
    return this;
  }

  /**
   * Turns the query into an aggregation.
   * For simplicity, this will also terminate the query builder chain
   * and return an alternative query type which has simplified access to the
   * result of the aggregation operation.
   * @param cell
   * @param aggregateOperation
   */
  aggregate<TCell extends keyof TTable, TAggregation extends Aggregations>(
    cell: TCell,
    aggregateOperation: TAggregation
  ) {
    const queryId = this.internalBuild({
      aggregateOperation,
      cell: cell as string,
    });

    return new SimpleAggregateQuery(this.queries, queryId, aggregateOperation);
  }

  build(): SimpleQuery<TTable, TCells> {
    const queryId = this.internalBuild();

    return new SimpleQuery(this.queries, queryId);
  }

  private internalBuild(aggOptions?: {
    cell: string;
    aggregateOperation: Aggregations;
  }) {
    let queryId = `${this.table as string}-select-${this.selects.join(
      '_'
    )}-where-${this.wheres.join('_')}`;

    if (aggOptions) {
      queryId = `${queryId}-group_${aggOptions.cell}`;
    }

    this.queries.setQueryDefinition(
      queryId,
      this.table as string,
      ({ where, select, group }) => {
        this.selects.forEach((s) => select(s as string));
        this.wheres.forEach(([cell, value]) => {
          where(cell, value);
        });

        if (aggOptions) {
          group(aggOptions.cell, aggOptions.aggregateOperation).as(
            aggOptions.aggregateOperation
          );
        }
      }
    );

    return queryId;
  }
}
