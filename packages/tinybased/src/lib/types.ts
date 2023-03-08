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
