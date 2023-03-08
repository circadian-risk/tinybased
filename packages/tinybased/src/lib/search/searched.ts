/* eslint-disable @typescript-eslint/ban-types */
import {
  create,
  getByID,
  insert,
  insertBatch,
  Lyra,
  remove,
  search,
  SearchParams,
  SearchResult,
} from '@lyrasearch/lyra';

import { ObjectToCellStringType, TableBuilder } from '../TableBuilder';
import { OnlyStringKeys, TinyBaseSchema } from '../types';

type LyraInstances<TSchema extends TinyBaseSchema> = {
  [K in OnlyStringKeys<TSchema>]: Lyra<ObjectToCellStringType<TSchema[K]>>;
};
export class Searched<TSchema extends TinyBaseSchema = {}> {
  public static ERRORS = {
    NO_TABLES_DEFINED: 'No tables defined for search',
    TABLE_ALREADY_DEFINED: (table: string) => `Table ${table} already defined.`,
    INDEX_NOT_CONFIGURED: (index: string) =>
      `Index ${index} not configured for search`,
    TABLE_NOT_IN_SCHEMA_BUILDER: (tableKeyToIndex: string) =>
      `Table ${tableKeyToIndex} cannot be indexed. It is not defined for the SchemaBuilder.`,
  };

  public readonly tables: Map<OnlyStringKeys<TSchema>, TableBuilder<any, any>> =
    new Map();

  private indexes: LyraInstances<TSchema> = {} as LyraInstances<TSchema>;

  async initialize() {
    if (this.tables.size === 0) throw Error(Searched.ERRORS.NO_TABLES_DEFINED);
    for (const [key, table] of this.tables) {
      const instance = await create({
        schema: table.schema,
      });
      this.indexes = { ...this.indexes, [key]: instance };
    }
    return this;
  }

  public addIndexedTable<
    TName extends string,
    TCells extends Record<string, unknown>
  >(tableBuilder: TableBuilder<TName, TCells>) {
    if (this.tables.has(tableBuilder.tableName as any)) {
      throw Error(
        Searched.ERRORS.TABLE_ALREADY_DEFINED(tableBuilder.tableName)
      );
    }
    this.tables.set(tableBuilder.tableName as any, tableBuilder);

    return this as unknown as Searched<TSchema & Record<TName, TCells>>;
  }

  public setTables<
    TNewSchema extends TinyBaseSchema,
    K extends OnlyStringKeys<TNewSchema>
  >(tableBuilders: Map<K, TableBuilder<K, TNewSchema[K]>>) {
    for (const [key, tableBuilder] of tableBuilders) {
      this.tables.set(key as any, tableBuilder);
    }
    return this as unknown as Searched<TNewSchema>;
  }

  public insert<K extends OnlyStringKeys<TSchema>>(index: K, val: TSchema[K]) {
    if (!this.indexes[index as any]) {
      throw Error(Searched.ERRORS.INDEX_NOT_CONFIGURED(index as string));
    }
    return insert(this.indexes[index], val as any);
  }

  public insertBatch<K extends OnlyStringKeys<TSchema>>(
    index: K,
    values: Array<TSchema[K]>,
    batchSize = 100
  ) {
    return insertBatch(this.indexes[index], values as any, { batchSize });
  }

  public remove<K extends OnlyStringKeys<TSchema>>(index: K, id: string) {
    return remove(this.indexes[index], id);
  }

  public search<K extends OnlyStringKeys<TSchema>>(
    index: K,
    params: SearchParams<ObjectToCellStringType<TSchema[K]>>
  ): Promise<SearchResult<ObjectToCellStringType<TSchema[K]>>> {
    // Excessive stack depth comparing types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return search(this.indexes[index], params as any) as any;
  }

  public getByID<K extends OnlyStringKeys<TSchema>>(index: K, id: any) {
    return getByID(this.indexes[index], id);
  }
}
