/* eslint-disable @typescript-eslint/ban-types */
import { TinyBased } from './tinybased';
import {
  ParseSchema,
  RelationshipDefinition,
  RowChangeHandler,
  Schema,
  SchemaHydrators,
  TinyBaseSchema,
} from './types';

export class SchemaBuilder<
  TSchema extends TinyBaseSchema = {},
  TRelationships extends string = never
> {
  private readonly tables: Set<string> = new Set();
  private readonly relationshipDefinitions: RelationshipDefinition[] = [];
  private hydrators: SchemaHydrators<TSchema> = {} as SchemaHydrators<TSchema>;
  private rowRemovedHandler?: RowChangeHandler<TSchema>;
  private rowAddedOrUpdatedHandler?: RowChangeHandler<TSchema>;

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
    TDSchema extends Schema,
    TTableSchema = ParseSchema<TDSchema>
  >(
    tableName: TTableName,
    _tableSchema: TDSchema
  ): SchemaBuilder<TSchema & Record<TTableName, TTableSchema>, TRelationships> {
    if (this.tables.has(tableName)) {
      throw new Error(`Table ${tableName} already defined`);
    }

    this.tables.add(tableName);

    return this as unknown as SchemaBuilder<
      TSchema & Record<TTableName, TTableSchema>
    >;
  }

  public defineHydrators(hydrators: SchemaHydrators<TSchema>) {
    this.hydrators = hydrators;
    return this;
  }

  public async build(): Promise<TinyBased<TSchema, TRelationships>> {
    const tb = new TinyBased(
      this.tables,
      this.relationshipDefinitions,
      this.hydrators,
      {
        rowAddedOrUpdatedHandler: this.rowAddedOrUpdatedHandler,
        rowRemovedHandler: this.rowRemovedHandler,
      }
    );

    if (Object.keys(this.hydrators).length) {
      await tb.hydrate();
    }

    tb.init();

    return tb as TinyBased<TSchema, TRelationships>;
  }

  public onRowAddedOrUpdated(handler: RowChangeHandler<TSchema>) {
    this.rowAddedOrUpdatedHandler = handler;
    return this;
  }

  public onRowRemoved(handler: RowChangeHandler<TSchema>) {
    this.rowRemovedHandler = handler;
    return this;
  }
}
