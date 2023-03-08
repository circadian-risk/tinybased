/* eslint-disable @typescript-eslint/ban-types */
import {
  Store,
  Metrics,
  Relationships,
  Queries,
  createStore,
  createMetrics,
  createRelationships,
  createQueries,
} from 'tinybase';
import { SimpleQueryBuilder } from './queries';
import {
  RelationshipDefinition,
  RowChangeHandler,
  SchemaHydrators,
  TinyBaseSchema,
} from './types';
import keyBy from 'lodash/keyBy';

const makeTableRowCountMetricName = (tableName: string) =>
  `tinybased_internal_row_count_${tableName}`;

export type TinyBasedOptions<TSchema extends TinyBaseSchema = {}> = {
  rowAddedOrUpdatedHandler?: RowChangeHandler<TSchema>;
  rowRemovedHandler?: RowChangeHandler<TSchema>;
};

// eslint-disable-next-line @typescript-eslint/ban-types
export class TinyBased<
  TSchema extends TinyBaseSchema = {},
  TRelationships extends string = never
> {
  public readonly store: Store;
  public readonly metrics: Metrics;
  public readonly relationships: Relationships;
  public readonly queries: Queries;

  /** It is highly recommended that you do not call this constructor directly unless you know exactly what you're doing.
   * Instead, use the SchemaBuilder class to build your schema and then call .build() to receive an instance of this class
   */
  constructor(
    tableNames: Set<string>,
    relationshipDefs: RelationshipDefinition[] = [],
    private readonly hydrators: SchemaHydrators<TSchema> = {} as SchemaHydrators<TSchema>,
    private readonly options: TinyBasedOptions<TSchema> = {}
  ) {
    this.store = createStore();
    this.metrics = createMetrics(this.store);
    this.relationships = createRelationships(this.store);
    this.queries = createQueries(this.store);

    for (const table of tableNames) {
      // TODO: Do we want to actually define schema here on the tinybase instance

      // Define a metric that will make it easy to maintain the count of rows in this table
      this.metrics.setMetricDefinition(
        makeTableRowCountMetricName(table),
        table,
        'sum',
        () => 1
      );
    }

    relationshipDefs.forEach(({ cell, from, to, name }) => {
      this.relationships.setRelationshipDefinition(name, from, to, cell);
    });
  }

  /** You shouldn't be calling this directly. Use SchemaBuilder to obtain your TinyBased instance
   * This function exists in order to ensure that any relevant listeners are attached to the store
   * after any provided hydrators have been run
   */
  public init() {
    if (
      this.options.rowAddedOrUpdatedHandler ||
      this.options.rowAddedOrUpdatedHandler
    ) {
      this.store.addRowListener(null, null, (store, table, rowId) => {
        if (store.hasRow(table, rowId)) {
          const row = store.getRow(table, rowId);
          this.options.rowAddedOrUpdatedHandler?.(table, rowId, row);
        } else {
          this.options.rowRemovedHandler?.(table, rowId);
        }
      });
    }
  }

  public async hydrate() {
    await Promise.all(
      Object.entries(this.hydrators).map(async ([table, hydrator]) => {
        const entries = await hydrator();
        // TODO currently we assume the entity will have a property called id
        this.store.setTable(table, keyBy(entries, 'id'));
      })
    );
  }

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
