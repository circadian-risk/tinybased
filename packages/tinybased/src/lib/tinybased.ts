import { createStore, Store } from 'tinybase';

type TableSchema = Record<string, string | number | boolean>;
type TinyBaseSchema = Record<string, TableSchema>;

export class TinyBased<TSchema extends TinyBaseSchema = {}> {
  constructor(private readonly store: Store) { }

  setRow<TTable extends keyof TSchema, TRow extends TSchema[TTable]>(
    table: TTable,
    rowId: string,
    row: TRow
  ) {
    this.store.setRow(table as string, rowId, row);
  }

  getRow<TTable extends keyof TSchema>(table: TTable, rowId: string) {
    return this.store.getRow(table as string, rowId);
  }

  getCell<TTable extends keyof TSchema, TCell extends keyof TSchema[TTable]>(
    table: TTable,
    rowId: string,
    cellId: TCell
  ): TSchema[TTable][TCell] {
    return this.store.getCell(table as string, rowId, cellId as string) as any;
  }
}

export class Builder<TSchema extends TinyBaseSchema = {}> {
  private readonly store: Store;
  constructor() {
    this.store = createStore();
  }

  public defineTable<
    TTableName extends string,
    TTableSchema extends TableSchema
  >(
    tableName: TTableName,
    exampleRow: TTableSchema
  ): Builder<TSchema & Record<TTableName, TTableSchema>> {
    return this as unknown as Builder<
      TSchema & Record<TTableName, TTableSchema>
    >;
  }

  public build(): TinyBased<TSchema> {
    return new TinyBased(this.store);
  }
}
