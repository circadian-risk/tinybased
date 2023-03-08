export type Cell = string | number | boolean;
export type Table = Record<string, Cell>;
export type TinyBaseSchema = Record<string, Table>;

export type SchemaHydrators<TBSchema extends TinyBaseSchema> = {
  [TTableName in keyof TBSchema]: () => Promise<TBSchema[TTableName][]>;
};

export type Aggregations = 'avg' | 'count' | 'sum' | 'max' | 'min';
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
  | undefined
  | SchemaCellType[];

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
  : T extends SchemaCellType[]
  ? ParseSchemaCellType<T[number]>
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
