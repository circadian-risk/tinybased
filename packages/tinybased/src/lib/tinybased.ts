/* eslint-disable @typescript-eslint/ban-types */
import {
  createStore,
  Store,
  createMetrics,
  createQueries,
  createRelationships,
  Metrics,
  Relationships,
  Queries,
} from 'tinybase';
import { Aggregations, Cell, TableSchema, TinyBaseSchema } from './types';

const makeTableRowCountMetricName = (tableName: string) =>
  `tinybased_internal_row_count_${tableName}`;

export class SimpleQuery<
  TTable extends TableSchema = {},
  TCells extends keyof TTable = never
> {
  constructor(
    public readonly queries: Queries,
    public readonly queryId: string
  ) {}

  public getResultRowIds() {
    return this.queries.getResultRowIds(this.queryId);
  }

  public getResultTable(): Record<string, Pick<TTable, TCells>> {
    return this.queries.getResultTable(this.queryId) as Record<
      string,
      Pick<TTable, TCells>
    >;
  }
}

export class SimpleAggregateQuery<TAggregation extends Aggregations> {
  constructor(
    public readonly queries: Queries,
    public readonly queryId: string,
    private readonly aggregation: TAggregation
  ) {}

  getAggregation(): {
    [key in TAggregation]?: number;
  } {
    return this.queries.getResultTable(this.queryId)['0'] as any;
  }
}

export class SimpleQueryBuilder<
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

// eslint-disable-next-line @typescript-eslint/ban-types
export class TinyBased<
  TSchema extends TinyBaseSchema = {},
  TRelationships extends string = never,
> {
  constructor(
    public readonly store: Store,
    public readonly metrics: Metrics,
    public readonly relationships: Relationships,
    public readonly queries: Queries
  ) {}

  simpleQuery<TTable extends keyof TSchema>(
    table: TTable
  ): SimpleQueryBuilder<TSchema[TTable]> {
    return new SimpleQueryBuilder(table as string, this.queries);
  }

  getRowCount<TTable extends keyof TSchema>(table: TTable) {
    return this.metrics.getMetric(makeTableRowCountMetricName(table as string));
  }

  setRow<TTable extends keyof TSchema>(
    table: TTable,
    rowId: string,
    row: TSchema[TTable]
  ) {
    this.store.setRow(table as string, rowId, row);
  }

  getRow<TTable extends keyof TSchema>(table: TTable, rowId: string) {
    return this.store.getRow(table as string, rowId);
  }

  deleteRow<TTable extends keyof TSchema>(table: TTable, rowId: string) {
    return this.store.delRow(table as string, rowId);
  }

  getCell<TTable extends keyof TSchema, TCell extends keyof TSchema[TTable]>(
    table: TTable,
    rowId: string,
    cellId: TCell
  ): TSchema[TTable][TCell] {
    return this.store.getCell(
      table as string,
      rowId,
      cellId as string
    ) as TSchema[TTable][TCell];
  }

  setCell<TTable extends keyof TSchema, TCell extends keyof TSchema[TTable]>(
    table: TTable,
    rowId: string,
    cellId: TCell,
    value: TSchema[TTable][TCell]
  ) {
    return this.store.setCell(table as string, rowId, cellId as string, value);
  }

  getLocalIds(relationshipName: TRelationships, rowId: string) {
    return this.relationships.getLocalRowIds(relationshipName, rowId);
  }

  getRemoteRowId(relationshipName: TRelationships, rowId: string) {
    return this.relationships.getRemoteRowId(relationshipName, rowId);
  }
}

export class Builder<
  TSchema extends TinyBaseSchema = {},
  TRelationships extends string = never,
  TQueries extends Record<string, any> = {}
> {
  private readonly store: Store;
  private readonly metrics: Metrics;
  private readonly relationships: Relationships;
  private readonly queries: Queries;

  constructor() {
    this.store = createStore();
    this.metrics = createMetrics(this.store);
    this.relationships = createRelationships(this.store);
    this.queries = createQueries(this.store);
  }

  public defineRelationship<
    TRelationshipName extends string,
    TTableFrom extends keyof TSchema,
    TTableTo extends keyof TSchema,
    TCellFrom extends keyof TSchema[TTableFrom]
  >(
    name: TRelationshipName,
    tableFrom: TTableFrom,
    tableTo: TTableTo,
    cellFrom: TCellFrom
  ): Builder<TSchema, TRelationships | TRelationshipName> {
    this.relationships.setRelationshipDefinition(
      name,
      tableFrom as string,
      tableTo as string,
      cellFrom as string
    );

    return this as unknown as Builder<
      TSchema,
      TRelationships | TRelationshipName
    >;
  }

  public defineTable<
    TTableName extends string,
    TTableSchema extends TableSchema
  >(
    tableName: TTableName,
    exampleRow: TTableSchema
  ): Builder<TSchema & Record<TTableName, TTableSchema>, TRelationships> {
    // Define a metric that will make it easy to maintain the count of rows in this table
    this.metrics.setMetricDefinition(
      makeTableRowCountMetricName(tableName),
      tableName,
      'sum',
      () => 1
    );

    // TODO: Do we want to actually define schema here on the tinybase instance?
    return this as unknown as Builder<
      TSchema & Record<TTableName, TTableSchema>
    >;
  }

  public build(): TinyBased<TSchema, TRelationships> {
    return new TinyBased(
      this.store,
      this.metrics,
      this.relationships,
      this.queries
    );
  }
}
