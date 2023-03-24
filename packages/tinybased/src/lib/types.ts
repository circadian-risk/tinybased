/* eslint-disable @typescript-eslint/ban-types */
import { RowListener } from 'tinybase/store';
import { SchemaBuilder } from './SchemaBuilder';
import { CellSchema } from './TableBuilder';
import { TinyBased } from './tinybased';

export type Cell = string | number | boolean;
export type Table = Record<string, Cell>;
export type TinyBaseSchema = Record<string, Table>;
export type TableNames<TBSchema extends TinyBaseSchema> =
  OnlyStringKeys<TBSchema>;

export type InferKeyValueSchema<T> = T extends SchemaBuilder<
  infer _S,
  infer _Rn,
  infer _R,
  infer KV
>
  ? KV
  : T extends TinyBased<infer _S, infer _Rn, infer _R, infer KV>
  ? KV
  : never;

export type InferSchema<T> = T extends SchemaBuilder<infer S, infer _R>
  ? S
  : T extends TinyBased<infer S, infer _R>
  ? S
  : never;

export type InferTableNames<T> = T extends SchemaBuilder<infer _S, infer _R>
  ? TableNames<InferSchema<T>>
  : T extends TinyBased<infer _S, infer _R>
  ? TableNames<InferSchema<T>>
  : never;

export type InferRelationshipNames<T> = T extends SchemaBuilder<
  infer _T,
  infer RN
>
  ? RN
  : T extends TinyBased<infer _T, infer RN>
  ? RN
  : never;

export type Relationship<T extends TinyBaseSchema = {}> = {
  from: OnlyStringKeys<T>;
  to: OnlyStringKeys<T>;
};

export type Relationships<T extends TinyBaseSchema = {}> = Record<
  string,
  Relationship<T>
>;

export type InferRelationships<T> = T extends SchemaBuilder<
  infer _T,
  infer _RN,
  infer R
>
  ? R
  : T extends TinyBased<infer _T, infer _RN, infer R>
  ? R
  : never;

/**
 * Given a typeof SchemaBuilder instance, returns the TinyBased type that would be created from it
 */
export type InferTinyBasedFromSchemaBuilder<SB> = SB extends SchemaBuilder<
  infer S,
  infer RNs,
  infer R,
  infer KV
>
  ? TinyBased<S, RNs, R, KV>
  : never;

export type HydrateConfig<
  TBSchema extends TinyBaseSchema,
  K extends keyof TBSchema
> = () => Promise<TBSchema[K][]>;

export type SchemaHydrators<TBSchema extends TinyBaseSchema> = {
  [TTableName in keyof TBSchema]?: HydrateConfig<TBSchema, TTableName>;
};

export type SchemaHydrator<TBSchema extends TinyBaseSchema> = {
  [TTableName in keyof TBSchema]: TTableName extends string
    ? [TTableName, () => Promise<TBSchema[TTableName][]>]
    : never;
}[keyof TBSchema];

export type TableDefs<TBSchema extends TinyBaseSchema> = {
  [TTableName in keyof TBSchema]: {
    cells: CellSchema[];
    keyBy: string[];
  };
};

export type SchemaPersister<TBSchema extends TinyBaseSchema> = {
  onInit?: (schema: DeepPrettify<TableDefs<TBSchema>>) => Promise<void> | void;
  getTable: <TTableName extends keyof TBSchema>(
    tableName: TTableName
  ) => Promise<TBSchema[TTableName][]> | TBSchema[TTableName][];
  onRowAddedOrUpdated?: RowChangeHandler<TBSchema>;
  onRowRemoved?: RowChangeHandler<TBSchema>;
};

export type Aggregations = 'avg' | 'count' | 'sum' | 'max' | 'min';

export type SortOptions = {
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

export type CellChanges<T extends Record<string, unknown>> = {
  [K in keyof T]: {
    isChanged: boolean;
    oldValue: T[K] | undefined;
    newValue: T[K] | undefined;
  };
};

export type RowChange<TRow extends Record<string, unknown>> =
  | {
      type: 'delete';
      rowId: string | number;
    }
  | { type: 'insert'; row: TRow }
  | { type: 'update'; row: TRow; changes: CellChanges<TRow> };

export type RowChangeHandler<TBSchema extends TinyBaseSchema> = <
  TName extends keyof TBSchema
>(
  tableName: TName,
  rowId: string,
  entity?: TBSchema[TName]
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

/**
 * Supported Cell Types as string literals
 */
export type CellStringType = 'string' | 'boolean' | 'number';

/**
 * Maps Cell type to their corresponding CellStringType string literal.
 */
export type CellTypeToString<T> = T extends string
  ? 'string'
  : T extends boolean
  ? 'boolean'
  : T extends number
  ? 'number'
  : never;

export interface CellTypeMap {
  string: string;
  number: number;
  boolean: boolean;
}
