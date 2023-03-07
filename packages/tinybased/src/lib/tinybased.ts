/* eslint-disable @typescript-eslint/ban-types */
import { Store, Metrics, Relationships, Queries } from 'tinybase';
import { SimpleQueryBuilder } from './queries';
import { TinyBaseSchema } from './types';

const makeTableRowCountMetricName = (tableName: string) =>
  `tinybased_internal_row_count_${tableName}`;

// eslint-disable-next-line @typescript-eslint/ban-types
export class TinyBased<
  TSchema extends TinyBaseSchema = {},
  TRelationships extends string = never
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
