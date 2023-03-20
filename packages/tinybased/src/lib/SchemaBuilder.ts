/* eslint-disable @typescript-eslint/ban-types */
import { TableBuilder } from './TableBuilder';
import { TinyBased } from './tinybased';
import {
  DeepPrettify,
  OnlyStringKeys,
  RelationshipDefinition,
  RowChangeHandler,
  SchemaHydrator,
  SchemaHydrators,
  SchemaPersister,
  TableDefs,
  TinyBaseSchema,
  Relationships,
} from './types';

export class SchemaBuilder<
  TBSchema extends TinyBaseSchema = {},
  TRelationshipNames extends string = never,
  TRelationships extends Relationships<TBSchema> = {}
> {
  public readonly tables: Map<
    string,
    TableBuilder<string, Record<string, unknown>>
  > = new Map();

  private readonly relationshipDefinitions: RelationshipDefinition[] = [];
  private hydrators: SchemaHydrators<TBSchema> =
    {} as SchemaHydrators<TBSchema>;
  private persisters = new Set<SchemaPersister<TBSchema>>();
  private rowRemovedHandlers = new Set<RowChangeHandler<TBSchema>>();
  private rowAddedOrUpdatedHandlers = new Set<RowChangeHandler<TBSchema>>();

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
  ): SchemaBuilder<
    TBSchema,
    TRelationshipNames | TRelationshipName,
    TRelationships &
      Record<TRelationshipName, { from: TTableFrom; to: TTableTo }>
  > {
    this.relationshipDefinitions.push({
      name,
      from: tableFrom,
      to: tableTo,
      cell: cellFrom,
    });

    return this as unknown as SchemaBuilder<
      TBSchema,
      TRelationshipNames | TRelationshipName
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

  public addPersister(persister: SchemaPersister<TBSchema>) {
    this.persisters.add(persister);
    return this;
  }

  public async build(): Promise<
    TinyBased<TBSchema, TRelationshipNames, TRelationships>
  > {
    const tb = new TinyBased<TBSchema, TRelationshipNames, TRelationships>(
      this.tables,
      this.relationshipDefinitions
    );

    // Init persisters

    if (this.persisters.size > 0) {
      const tableSchemas = Object.fromEntries(
        Array.from(this.tables.entries()).map(([tableName, tableBuilder]) => [
          tableName,
          {
            cells: tableBuilder.cells,
            keyBy: tableBuilder.keys,
          },
        ])
      ) as DeepPrettify<TableDefs<TBSchema>>;

      await Promise.all(
        Array.from(this.persisters).map((persister) =>
          persister.onInit?.(tableSchemas)
        )
      );
    }
    // Hydrate tables

    Object.entries(this.hydrators).forEach((hydrator) => {
      tb.hydrators.add(hydrator as SchemaHydrator<TBSchema>);
    });

    this.persisters.forEach((persister) => {
      Array.from(this.tables.keys()).forEach((tableName) => {
        tb.hydrators.add([
          tableName,
          () => persister.getTable(tableName),
        ] as SchemaHydrator<TBSchema>);
      });
    });

    await tb.hydrate();

    // Event handlers
    this.rowAddedOrUpdatedHandlers.forEach((handler) => {
      tb.events.onRowAddedOrUpdated.add(handler);
    });
    this.rowRemovedHandlers.forEach((handler) => {
      tb.events.onRowRemoved.add(handler);
    });

    this.persisters.forEach((persister) => {
      tb.events.onRowAddedOrUpdated.add(persister.onRowAddedOrUpdated);
      tb.events.onRowRemoved.add(persister.onRowRemoved);
    });

    tb.init();

    return tb as TinyBased<TBSchema, TRelationshipNames>;
  }

  public onRowAddedOrUpdated(handler: RowChangeHandler<TBSchema>) {
    this.rowAddedOrUpdatedHandlers.add(handler);
    return this;
  }

  public onRowRemoved(handler: RowChangeHandler<TBSchema>) {
    this.rowRemovedHandlers.add(handler);
    return this;
  }
}
