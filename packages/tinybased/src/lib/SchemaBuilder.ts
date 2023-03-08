/* eslint-disable @typescript-eslint/ban-types */
import { TinyBased } from './tinybased';
import {
  ParseTableSchema,
  RelationshipDefinition,
  RowChangeHandler,
  TableSchema,
  SchemaHydrators,
  TinyBaseSchema,
} from './types';

export class SchemaBuilder<
  TBSchema extends TinyBaseSchema = {},
  TRelationships extends string = never
> {
  private readonly tables: Set<string> = new Set();
  private readonly relationshipDefinitions: RelationshipDefinition[] = [];
  private hydrators: SchemaHydrators<TBSchema> =
    {} as SchemaHydrators<TBSchema>;
  private rowRemovedHandler?: RowChangeHandler<TBSchema>;
  private rowAddedOrUpdatedHandler?: RowChangeHandler<TBSchema>;

  public defineRelationship<
    TRelationshipName extends string,
    TTableFrom extends keyof TBSchema,
    TTableTo extends keyof TBSchema,
    TCellFrom extends keyof TBSchema[TTableFrom]
  >(
    name: TRelationshipName,
    tableFrom: TTableFrom,
    tableTo: TTableTo,
    cellFrom: TCellFrom
  ): SchemaBuilder<TBSchema, TRelationships | TRelationshipName> {
    this.relationshipDefinitions.push({
      name,
      from: tableFrom as string,
      to: tableTo as string,
      cell: cellFrom as string,
    });

    return this as unknown as SchemaBuilder<
      TBSchema,
      TRelationships | TRelationshipName
    >;
  }

  public defineTable<
    TTableName extends string,
    TSchema extends TableSchema,
    TTable = ParseTableSchema<TSchema>
  >(
    tableName: TTableName,
    _tableSchema: TSchema
  ): SchemaBuilder<TBSchema & Record<TTableName, TTable>, TRelationships> {
    if (this.tables.has(tableName)) {
      throw new Error(`Table ${tableName} already defined`);
    }

    this.tables.add(tableName);

    return this as unknown as SchemaBuilder<
      TBSchema & Record<TTableName, TTable>
    >;
  }

  public defineHydrators(hydrators: SchemaHydrators<TBSchema>) {
    this.hydrators = hydrators;
    return this;
  }

  public async build(): Promise<TinyBased<TBSchema, TRelationships>> {
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

    return tb as TinyBased<TBSchema, TRelationships>;
  }

  public onRowAddedOrUpdated(handler: RowChangeHandler<TBSchema>) {
    this.rowAddedOrUpdatedHandler = handler;
    return this;
  }

  public onRowRemoved(handler: RowChangeHandler<TBSchema>) {
    this.rowRemovedHandler = handler;
    return this;
  }
}
