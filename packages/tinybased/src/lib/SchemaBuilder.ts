/* eslint-disable @typescript-eslint/ban-types */
import { TableBuilder } from './TableBuilder';
import { TinyBased } from './tinybased';
import {
  OnlyStringKeys,
  RelationshipDefinition,
  RowChangeHandler,
  SchemaHydrators,
  TinyBaseSchema,
} from './types';

export class SchemaBuilder<
  TBSchema extends TinyBaseSchema = {},
  TRelationships extends string = never
> {
  private readonly tables: Map<string, TableBuilder<any, any>> = new Map();

  private readonly relationshipDefinitions: RelationshipDefinition[] = [];
  private hydrators: SchemaHydrators<TBSchema> =
    {} as SchemaHydrators<TBSchema>;
  private rowRemovedHandler?: RowChangeHandler<TBSchema>;
  private rowAddedOrUpdatedHandler?: RowChangeHandler<TBSchema>;

  public defineRelationship<
    TRelationshipName extends string,
    TTableFrom extends OnlyStringKeys<TBSchema>,
    TTableTo extends OnlyStringKeys<TBSchema>,
    TCellFrom extends OnlyStringKeys<TBSchema[TTableFrom]>
  >(
    name: TRelationshipName,
    tableFrom: TTableFrom,
    tableTo: TTableTo,
    cellFrom: TCellFrom
  ): SchemaBuilder<TBSchema, TRelationships | TRelationshipName> {
    this.relationshipDefinitions.push({
      name,
      from: tableFrom,
      to: tableTo,
      cell: cellFrom,
    });

    return this as unknown as SchemaBuilder<
      TBSchema,
      TRelationships | TRelationshipName
    >;
  }

  public addTable<TName extends string, TCells extends Record<string, unknown>>(
    tableBuilder: TableBuilder<TName, TCells>
  ) {
    if (this.tables.has(tableBuilder.tableName)) {
      throw new Error(`Table ${tableBuilder.tableName} already defined`);
    }

    this.tables.set(tableBuilder.tableName, tableBuilder);

    return this as unknown as SchemaBuilder<TBSchema & Record<TName, TCells>>;
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
