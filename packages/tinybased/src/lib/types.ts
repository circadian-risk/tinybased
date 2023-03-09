import { SchemaBuilder } from './SchemaBuilder';
import { CellSchema } from './TableBuilder';

export type Cell = string | number | boolean;
export type Table = Record<string, Cell>;
export type TinyBaseSchema = Record<string, Table>;
export type TableNames<TBSchema extends TinyBaseSchema> =
  OnlyStringKeys<TBSchema>;

export type InferSchema<SB> = SB extends SchemaBuilder<infer S, any>
  ? S
  : never;

export type SchemaHydrators<TBSchema extends TinyBaseSchema> = {
  [TTableName in keyof TBSchema]: () => Promise<TBSchema[TTableName][]>;
};

export type SchemaHydrator<TBSchema extends TinyBaseSchema> = {
  [TTableName in keyof TBSchema]: TTableName extends string
    ? [TTableName, () => Promise<TBSchema[TTableName][]>]
    : never;
}[keyof TBSchema];

export type PersisterSchema<TBSchema extends TinyBaseSchema> = {
  [TTableName in keyof TBSchema]: {
    cells: CellSchema[];
    keyBy: string[];
  };
};

export type SchemaPersister<TBSchema extends TinyBaseSchema> = {
  onInit: (
    schema: DeepPrettify<PersisterSchema<TBSchema>>
  ) => Promise<void> | void;
  getTable: <TTableName extends keyof TBSchema>(
    tableName: TTableName
  ) => Promise<TBSchema[TTableName][]> | TBSchema[TTableName][];
  onRowAddedOrUpdated: RowChangeHandler<TBSchema>;
  onRowRemoved: RowChangeHandler<TBSchema>;
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

export type DeepPrettify<T> = T extends object
  ? {
      [K in keyof T]: T[K] extends object
        ? DeepPrettify<T[K]>
        : T[K] extends Array<infer U>
        ? Array<DeepPrettify<U>>
        : T[K];
      // eslint-disable-next-line @typescript-eslint/ban-types
    } & {}
  : T extends Array<infer U>
  ? Array<DeepPrettify<U>>
  : T;
