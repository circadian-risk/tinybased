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
} from 'tinybase/cjs';
import { SimpleQueryBuilder } from './queries';
import {
  OnlyStringKeys,
  Prettify,
  RelationshipDefinition,
  RowChangeHandler,
  SchemaHydrators,
  TinyBaseSchema,
} from './types';
import keyBy from 'lodash/keyBy';
import { TableBuilder } from './TableBuilder';

const makeTableRowCountMetricName = (tableName: string) =>
  `tinybased_internal_row_count_${tableName}`;

export type TinyBasedOptions<TBSchema extends TinyBaseSchema = {}> = {
  rowAddedOrUpdatedHandler?: RowChangeHandler<TBSchema>;
  rowRemovedHandler?: RowChangeHandler<TBSchema>;
};

// eslint-disable-next-line @typescript-eslint/ban-types
export class TinyBased<
  TBSchema extends TinyBaseSchema = {},
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
    private readonly tables: Map<string, TableBuilder<any, any>>,
    relationshipDefs: RelationshipDefinition[] = [],
    private readonly hydrators: SchemaHydrators<TBSchema> = {} as SchemaHydrators<TBSchema>,
    private readonly options: TinyBasedOptions<TBSchema> = {}
  ) {
    this.store = createStore();
    this.metrics = createMetrics(this.store);
    this.relationships = createRelationships(this.store);
    this.queries = createQueries(this.store);

    for (const table of tables.keys()) {
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
        const tableKeys = this.tables.get(table)?.keys ?? [];
        this.store.setTable(
          table,
          keyBy(entries, (e) => `${tableKeys.map((k) => e[k]).join('::')}`)
        );
      })
    );
  }

  simpleQuery<TTable extends keyof TBSchema>(
    table: TTable
  ): SimpleQueryBuilder<TBSchema[TTable]> {
    return new SimpleQueryBuilder(table as string, this.queries);
  }

  getRowCount<TTable extends keyof TBSchema>(table: TTable) {
    return this.metrics.getMetric(makeTableRowCountMetricName(table as string));
  }

  setRow<TTable extends keyof TBSchema>(
    table: TTable,
    rowId: string,
    row: TBSchema[TTable]
  ) {
    this.store.setRow(table as string, rowId, row);
  }

  getRow<TTable extends keyof TBSchema>(table: TTable, rowId: string) {
    return this.store.getRow(table as string, rowId) as TBSchema[TTable];
  }

  hasRow<TTable extends keyof TBSchema>(table: TTable, rowId: string) {
    return this.store.hasRow(table as string, rowId);
  }

  getSortedRowIds<
    TTable extends keyof TBSchema,
    TCell extends keyof TBSchema[TTable]
  >(
    table: TTable,
    cellId: TCell,
    options?: {
      descending?: boolean;
      offset?: number;
      limit?: number;
    }
  ) {
    return this.store.getSortedRowIds(
      table as string,
      cellId as string,
      options?.descending,
      options?.offset,
      options?.limit
    );
  }

  deleteRow<TTable extends keyof TBSchema>(table: TTable, rowId: string) {
    return this.store.delRow(table as string, rowId);
  }

  getTable<TTable extends OnlyStringKeys<TBSchema>>(tableName: TTable) {
    return this.store.getTable(tableName) as Record<
      string,
      Prettify<TBSchema[TTable]>
    >;
  }

  getCell<TTable extends keyof TBSchema, TCell extends keyof TBSchema[TTable]>(
    table: TTable,
    rowId: string,
    cellId: TCell
  ): TBSchema[TTable][TCell] {
    return this.store.getCell(
      table as string,
      rowId,
      cellId as string
    ) as TBSchema[TTable][TCell];
  }

  setCell<TTable extends keyof TBSchema, TCell extends keyof TBSchema[TTable]>(
    table: TTable,
    rowId: string,
    cellId: TCell,
    value: TBSchema[TTable][TCell]
  ) {
    if (value == null) {
      return this.store.delCell(table as string, rowId, cellId as string);
    }
    return this.store.setCell(table as string, rowId, cellId as string, value);
  }

  deleteCell<
    TTable extends keyof TBSchema,
    TCell extends keyof TBSchema[TTable]
  >(table: TTable, rowId: string, cellId: TCell) {
    return this.store.delCell(table as string, rowId, cellId as string);
  }

  getLocalIds(relationshipName: TRelationships, rowId: string) {
    return this.relationships.getLocalRowIds(relationshipName, rowId);
  }

  getRemoteRowId(relationshipName: TRelationships, rowId: string) {
    return this.relationships.getRemoteRowId(relationshipName, rowId);
  }
}
