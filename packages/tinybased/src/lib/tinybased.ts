import {
  createStore,
  Store,
  createMetrics,
  createQueries,
  createRelationships,
  Metrics,
  Relationships,
} from 'tinybase';

type TableSchema = Record<string, string | number | boolean>;
type TinyBaseSchema = Record<string, TableSchema>;

const makeTableRowCountMetricName = (tableName: string) =>
  `tinybased_internal_row_count_${tableName}`;

// eslint-disable-next-line @typescript-eslint/ban-types
export class TinyBased<
  TSchema extends TinyBaseSchema = {},
  TRelationships extends string = never
> {
  constructor(
    private readonly store: Store,
    private readonly metrics: Metrics,
    private readonly relationships: Relationships
  ) {}

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

  getLocalIds(relationshipName: TRelationships, rowId: string) {
    return this.relationships.getLocalRowIds(relationshipName, rowId);
  }

  getRemoteRowId(relationshipName: TRelationships, rowId: string) {
    return this.relationships.getRemoteRowId(relationshipName, rowId);
  }
}

export class Builder<
  TSchema extends TinyBaseSchema = {},
  TRelationships extends string = never
> {
  private readonly store: Store;
  private readonly metrics: Metrics;
  private readonly relationships: Relationships;

  constructor() {
    this.store = createStore();
    this.metrics = createMetrics(this.store);
    this.relationships = createRelationships(this.store);
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

    return this as any;
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
    return new TinyBased(this.store, this.metrics, this.relationships);
  }
}
