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
  SchemaHydrator,
  TinyBaseSchema,
} from './types';
import keyBy from 'lodash/keyBy';
import { TableBuilder } from './TableBuilder';

const makeTableRowCountMetricName = (tableName: string) =>
  `tinybased_internal_row_count_${tableName}`;

// eslint-disable-next-line @typescript-eslint/ban-types
export class TinyBased<
  TBSchema extends TinyBaseSchema = {},
  TRelationships extends string = never
> {
  public readonly store: Store;
  public readonly metrics: Metrics;
  public readonly relationships: Relationships;
  public readonly queries: Queries;
  public readonly events = {
    onRowAddedOrUpdated: new Set<RowChangeHandler<TBSchema>>(),
    onRowRemoved: new Set<RowChangeHandler<TBSchema>>(),
  } as const;
  public readonly hydrators = new Set<SchemaHydrator<TBSchema>>();

  /** It is highly recommended that you do not call this constructor directly unless you know exactly what you're doing.
   * Instead, use the SchemaBuilder class to build your schema and then call .build() to receive an instance of this class
   */
  constructor(
    public readonly tables: Map<
      string,
      TableBuilder<string, Record<string, unknown>>
    >,
    relationshipDefs: RelationshipDefinition[] = []
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
      this.events.onRowAddedOrUpdated.size > 0 ||
      this.events.onRowRemoved.size > 0
    ) {
      this.store.addRowListener(null, null, (store, table, rowId) => {
        if (store.hasRow(table, rowId)) {
          const row = store.getRow(table, rowId);
          this.events.onRowAddedOrUpdated?.forEach((handler) =>
            handler(table, rowId, row as any)
          );
        } else {
          this.events.onRowRemoved?.forEach((handler) => handler(table, rowId));
        }
      });
    }
  }

  public onRowAddedOrUpdated(
    handler: RowChangeHandler<TBSchema>,
    canMutate = false
  ) {
    this.store.addRowListener(
      null,
      null,
      (store, table, rowId) => {
        if (store.hasRow(table, rowId)) {
          const row = store.getRow(table, rowId);

          handler(table, rowId, row as any);
        }
      },
      canMutate
    );
  }

  public onRowRemoved(handler: RowChangeHandler<TBSchema>, canMutate = false) {
    this.store.addRowListener(
      null,
      null,
      (store, table, rowId) => {
        if (!store.hasRow(table, rowId)) {
          handler(table, rowId);
        }
      },
      canMutate
    );
  }

  public async hydrate() {
    if (this.hydrators.size > 0) {
      await Promise.all(
        Array.from(this.hydrators).map(async ([table, hydrator]) => {
          const entries = await hydrator();
          const tableKeys = this.tables.get(table)?.keys ?? [];
          this.store.setTable(
            table,
            keyBy(entries, (e) => `${tableKeys.map((k) => e[k]).join('::')}`)
          );
        })
      );
    }
  }

  simpleQuery<TTable extends OnlyStringKeys<TBSchema>>(
    table: TTable
  ): SimpleQueryBuilder<TBSchema[TTable]> {
    return new SimpleQueryBuilder(table, this.queries);
  }

  getRowCount<TTable extends OnlyStringKeys<TBSchema>>(table: TTable) {
    return this.metrics.getMetric(makeTableRowCountMetricName(table));
  }

  setRow<TTable extends OnlyStringKeys<TBSchema>>(
    table: TTable,
    rowId: string,
    row: TBSchema[TTable]
  ) {
    this.store.setRow(table, rowId, row);
  }

  /**
   * Merges an existing row with new data. This allows for updating
   * a subset of fields while perserving any existing data in the row
   */
  mergeRow<TTable extends OnlyStringKeys<TBSchema>>(
    table: TTable,
    rowId: string,
    toMerge: Partial<TBSchema[TTable]>
  ) {
    const current = this.getRow(table, rowId);
    this.setRow(table, rowId, { ...current, ...toMerge });
  }

  getRow<TTable extends OnlyStringKeys<TBSchema>>(
    table: TTable,
    rowId: string
  ) {
    return this.store.getRow(table, rowId) as TBSchema[TTable];
  }

  hasRow<TTable extends OnlyStringKeys<TBSchema>>(
    table: TTable,
    rowId: string
  ) {
    return this.store.hasRow(table, rowId);
  }

  getSortedRowIds<
    TTable extends OnlyStringKeys<TBSchema>,
    TCell extends OnlyStringKeys<TBSchema[TTable]>
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
      table,
      cellId,
      options?.descending,
      options?.offset,
      options?.limit
    );
  }

  deleteRow<TTable extends OnlyStringKeys<TBSchema>>(
    table: TTable,
    rowId: string
  ) {
    return this.store.delRow(table, rowId);
  }

  getTable<TTable extends OnlyStringKeys<TBSchema>>(tableName: TTable) {
    return this.store.getTable(tableName) as Record<
      string,
      Prettify<TBSchema[TTable]>
    >;
  }

  getCell<
    TTable extends OnlyStringKeys<TBSchema>,
    TCell extends OnlyStringKeys<TBSchema[TTable]>
  >(table: TTable, rowId: string, cellId: TCell): TBSchema[TTable][TCell] {
    return this.store.getCell(table, rowId, cellId) as TBSchema[TTable][TCell];
  }

  setCell<
    TTable extends OnlyStringKeys<TBSchema>,
    TCell extends OnlyStringKeys<TBSchema[TTable]>
  >(
    table: TTable,
    rowId: string,
    cellId: TCell,
    value: TBSchema[TTable][TCell]
  ) {
    if (value == null) {
      return this.store.delCell(table, rowId, cellId);
    }
    return this.store.setCell(table, rowId, cellId, value);
  }

  deleteCell<
    TTable extends OnlyStringKeys<TBSchema>,
    TCell extends OnlyStringKeys<TBSchema[TTable]>
  >(table: TTable, rowId: string, cellId: TCell) {
    return this.store.delCell(table, rowId, cellId);
  }

  getLocalIds(relationshipName: TRelationships, rowId: string) {
    return this.relationships.getLocalRowIds(relationshipName, rowId);
  }

  getRemoteRowId(relationshipName: TRelationships, rowId: string) {
    return this.relationships.getRemoteRowId(relationshipName, rowId);
  }
}
