export type Cell = string | number | boolean;
export type Table = Record<string, Cell>;
export type TinyBaseSchema = Record<string, Table>;

export type SchemaHydrators<TBSchema extends TinyBaseSchema> = {
  [TTableName in keyof TBSchema]: () => Promise<TBSchema[TTableName][]>;
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

export type OnlyStringKeys<T extends Record<PropertyKey, unknown>> = Exclude<
  keyof T,
  number | symbol
>;

export type Prettify<T> = {
  [K in keyof T]: T[K];
  // eslint-disable-next-line @typescript-eslint/ban-types
} & {};
