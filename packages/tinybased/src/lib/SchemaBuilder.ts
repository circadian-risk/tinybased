/* eslint-disable @typescript-eslint/ban-types */
import {
  createStore,
  Store,
  createMetrics,
  createQueries,
  createRelationships,
  Metrics,
  Relationships,
  Queries,
} from 'tinybase';
import { TinyBased } from './tinybased';
import { TableSchema, TinyBaseSchema } from './types';

const makeTableRowCountMetricName = (tableName: string) =>
  `tinybased_internal_row_count_${tableName}`;

export class SchemaBuilder<
  TSchema extends TinyBaseSchema = {},
  TRelationships extends string = never
> {
  private readonly store: Store;
  private readonly metrics: Metrics;
  private readonly relationships: Relationships;
  private readonly queries: Queries;

  constructor() {
    this.store = createStore();
    this.metrics = createMetrics(this.store);
    this.relationships = createRelationships(this.store);
    this.queries = createQueries(this.store);
  }

  public defineRelationship<
    TRelationshipName extends string,
    TTableFrom extends keyof TSchema,
    TTableTo extends keyof TSchema,
    TCellFrom extends keyof TSchema[TTableFrom]
  >(
    name: TRelationshipName,
    tableFrom: TTableFrom,
    tableTo: TTableTo,
    cellFrom: TCellFrom
  ): SchemaBuilder<TSchema, TRelationships | TRelationshipName> {
    this.relationships.setRelationshipDefinition(
      name,
      tableFrom as string,
      tableTo as string,
      cellFrom as string
    );

    return this as unknown as SchemaBuilder<
      TSchema,
      TRelationships | TRelationshipName
    >;
  }

  public defineTable<
    TTableName extends string,
    TTableSchema extends TableSchema
  >(
    tableName: TTableName,
    exampleRow: TTableSchema
  ): SchemaBuilder<TSchema & Record<TTableName, TTableSchema>, TRelationships> {
    // Define a metric that will make it easy to maintain the count of rows in this table
    this.metrics.setMetricDefinition(
      makeTableRowCountMetricName(tableName),
      tableName,
      'sum',
      () => 1
    );

    // TODO: Do we want to actually define schema here on the tinybase instance?
    return this as unknown as SchemaBuilder<
      TSchema & Record<TTableName, TTableSchema>
    >;
  }

  public build(): TinyBased<TSchema, TRelationships> {
    return new TinyBased(
      this.store,
      this.metrics,
      this.relationships,
      this.queries
    );
  }
}
