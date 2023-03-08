export type Cell = string | number | boolean;
export type TableSchema = Record<string, Cell>;
export type TinyBaseSchema = Record<string, TableSchema>;

export type SchemaHydrators<TSchema extends TinyBaseSchema> = {
  [TTableName in keyof TSchema]: () => Promise<TSchema[TTableName][]>;
};

export type Aggregations = 'avg' | 'count' | 'sum' | 'max' | 'min';
export type RelationshipDefinition = {
  name: string;
  from: string;
  to: string;
  cell: string;
};

export type RowChangeHandler<TSchema extends TinyBaseSchema> = (
  tableName: keyof TSchema,
  rowId: string,
  entity?: TableSchema
) => Promise<void>;

type SchemaCellType =
  | StringConstructor
  | NumberConstructor
  | BooleanConstructor
  | null
  | undefined
  | SchemaCellType[];

export type Schema = Record<string, SchemaCellType>;

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

export type ParseSchema<T extends Schema> = UndefinedToOptional<{
  [K in keyof T]: ParseSchemaCellType<T[K]>;
}>;

type UndefinedProperties<T> = {
  [P in keyof T]-?: undefined extends T[P] ? P : never;
}[keyof T];

type UndefinedToOptional<T> = Partial<Pick<T, UndefinedProperties<T>>> &
  Pick<T, Exclude<keyof T, UndefinedProperties<T>>>;
