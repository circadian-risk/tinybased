/* eslint-disable @typescript-eslint/ban-types */
import { TinyBased } from './tinybased';
import { RelationshipDefinition, TableSchema, TinyBaseSchema } from './types';

export class SchemaBuilder<
  TSchema extends TinyBaseSchema = {},
  TRelationships extends string = never
> {
  private readonly tables: Set<string> = new Set();
  private readonly relationshipDefinitions: RelationshipDefinition[] = [];

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
    this.relationshipDefinitions.push({
      name,
      from: tableFrom as string,
      to: tableTo as string,
      cell: cellFrom as string,
    });

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
    if (this.tables.has(tableName)) {
      throw new Error(`Table ${tableName} already defined`);
    }

    this.tables.add(tableName);

    return this as unknown as SchemaBuilder<
      TSchema & Record<TTableName, TTableSchema>
    >;
  }

  public build(): TinyBased<TSchema, TRelationships> {
    return new TinyBased(this.tables, this.relationshipDefinitions);
  }
}
