export type Cell = string | number | boolean;
export type Table = Record<string, Cell>;
export type TinyBaseSchema = Record<string, Table>;

export type SchemaHydrators<TBSchema extends TinyBaseSchema> = {
  [TTableName in keyof TBSchema]: () => Promise<TBSchema[TTableName][]>;
};

export type SchemaPersister<TBSchema extends TinyBaseSchema = TinyBaseSchema> =
  () => {
    getTableData: <TTableName extends keyof TBSchema>(
      tableName: TTableName
    ) => Promise<TBSchema[TTableName][]>;
    setTableData: <TTableName extends keyof TBSchema>(
      tableName: TTableName,
      data: TBSchema[TTableName][]
    ) => Promise<void>;
    addTableRow: <TTableName extends keyof TBSchema>(
      tableName: TTableName,
      row: TBSchema[TTableName]
    ) => Promise<void>;
    setTableRow: <TTableName extends keyof TBSchema>(
      tableName: TTableName,
      rowId: string,
      row: TBSchema[TTableName]
    ) => Promise<void>;
  };

export type Aggregations = 'avg' | 'count' | 'sum' | 'max' | 'min';

export type QueryOptions = {
  descending?: boolean;
  offset?: number;
  limit?: number;
};

export type RelationshipDefinition = {
  name: string;
  from: string;
  to: string;
  cell: string;
};

export type RowChangeHandler<TBSchema extends TinyBaseSchema> = (
  tableName: keyof TBSchema,
  rowId: string,
  entity?: Table
) => Promise<void>;

type SchemaCellType =
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | null
  | undefined;

export type TableSchema = Record<string, SchemaCellType>;

type ParseSchemaCellType<T extends SchemaCellType> = T extends StringConstructor
  ? string
  : T extends NumberConstructor
  ? number
  : T extends BooleanConstructor
  ? boolean
  : T extends null
  ? null
  : T extends undefined
  ? undefined
  : never;

export type ParseTableSchema<TSchema extends TableSchema> =
  UndefinedToOptional<{
    [K in keyof TSchema]: ParseSchemaCellType<TSchema[K]>;
  }>;

// Utils

type UndefinedProperties<T> = {
  [P in keyof T]-?: undefined extends T[P] ? P : never;
}[keyof T];

type UndefinedToOptional<T> = Partial<Pick<T, UndefinedProperties<T>>> &
  Pick<T, Exclude<keyof T, UndefinedProperties<T>>>;
