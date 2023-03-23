/* eslint-disable @typescript-eslint/ban-types */
import {
  Store,
  Metrics,
  Relationships as TBRelationships,
  Queries,
  createStore,
  createMetrics,
  createRelationships,
  createQueries,
} from 'tinybase/cjs';
import {
  OnlyStringKeys,
  Prettify,
  RelationshipDefinition,
  RowChangeHandler,
  SchemaHydrator,
  TinyBaseSchema,
  Relationships,
  Table,
} from './types';
import keyBy from 'lodash/keyBy';
import { TableBuilder } from './TableBuilder';
import { QueryBuilder } from './queries/QueryBuilder';

const makeTableRowCountMetricName = (tableName: string) =>
  `tinybased_internal_row_count_${tableName}`;

// eslint-disable-next-line @typescript-eslint/ban-types
export class TinyBased<
  TBSchema extends TinyBaseSchema = {},
  TRelationshipNames extends string = never,
  TRelationships extends Relationships<TBSchema> = {},
  TKeyValueSchema extends Table = {}
> {
  public readonly store: Store;
  public readonly metrics: Metrics;
  public readonly relationships: TBRelationships;
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
    private readonly relationshipDefs: RelationshipDefinition[] = []
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

  /**
   *  Do not call this method directly. Its probably a smell that this is on the public API for this class
   */
  public async hydrate() {
    if (this.hydrators.size > 0) {
      await Promise.all(
        Array.from(this.hydrators).map(async ([tableName, hydrator]) => {
          const tableId = tableName as OnlyStringKeys<TBSchema>;
          const rows = (await hydrator()) as TBSchema[typeof tableId][];
          const table = this.tables.get(tableName);
          if (!table) {
            return;
          }

          this.setTable(tableId, rows);
        })
      );
    }
  }

  query<TTable extends OnlyStringKeys<TBSchema>>(
    tableName: TTable
  ): QueryBuilder<TBSchema, TRelationships, TTable> {
    return new QueryBuilder(this.queries, tableName, this.relationshipDefs);
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
    if (!this.hasRow(table, rowId)) {
      throw new Error(
        `Attempted to merge row in ${table} with id ${rowId} but the targeted row does not exist`
      );
    }
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

  /**
   * Sets the rows for a table. This will overwrite any existing rows
   *
   * @param {TTable} tableName - The name of the table
   * @param {TBSchema[TTable][]} rows - An array of rows which match the type of the table
   */
  setTable<TTable extends OnlyStringKeys<TBSchema>>(
    tableName: TTable,
    rows: TBSchema[TTable][]
  ) {
    const table = this.tables.get(tableName);
    if (!table) {
      throw new Error(`Tried to set rows for non-existent table ${tableName}`);
    }

    return this.store.setTable(
      tableName,
      keyBy(rows, (e) => table.composeKey(e))
    );
  }

  /**
   * Used to set many rows in a table. Will overwrite any conflicting values.
   *
   * @param {TTable} tableName - The name of the table
   * @param {TBSchema[TTable][]} rows - An array of rows which match the type of the table
   */
  bulkUpsert<TTable extends OnlyStringKeys<TBSchema>>(
    tableName: TTable,
    rows: TBSchema[TTable][]
  ) {
    const table = this.tables.get(tableName);
    if (!table) {
      throw new Error(`Tried to set rows for non-existent table ${tableName}`);
    }

    this.store.transaction(() => {
      rows.forEach((row) => {
        this.store.setRow(tableName, table.composeKey(row), row);
      });
    });
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

  getLocalIds(relationshipName: TRelationshipNames, rowId: string) {
    return this.relationships.getLocalRowIds(relationshipName, rowId);
  }

  getRemoteRowId(relationshipName: TRelationshipNames, rowId: string) {
    return this.relationships.getRemoteRowId(relationshipName, rowId);
  }

  getValue<TKey extends OnlyStringKeys<TKeyValueSchema>>(
    key: TKey
  ): TKeyValueSchema[TKey] | undefined {
    return this.store.getValue(key) as TKeyValueSchema[TKey] | undefined;
  }

  deleteValue<TKey extends OnlyStringKeys<TKeyValueSchema>>(key: TKey) {
    return this.store.delValue(key);
  }

  setValue<
    TKey extends OnlyStringKeys<TKeyValueSchema>,
    TValue extends TKeyValueSchema[TKey]
  >(key: TKey, value: TValue) {
    return this.store.setValue(key, value);
  }
}
