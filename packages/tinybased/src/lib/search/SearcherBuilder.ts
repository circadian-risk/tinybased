/* eslint-disable @typescript-eslint/ban-types */
import { create } from '@lyrasearch/lyra';
import { TableBuilder } from '../TableBuilder';
import { TinyBaseSchema } from '../types';
import { LyraInstances, Searcher } from './Searcher';

/**
 * Builder class used to build a type-safe instance of Searcher for given tables
 */
export class SearcherBuilder<TSchema extends TinyBaseSchema = {}> {
  public static ERRORS = {
    TABLE_NOT_IN_SCHEMA_BUILDER: (tableKeyToIndex: string) =>
      `Table ${tableKeyToIndex} cannot be indexed. It is not defined for the SchemaBuilder.`,
    NO_TABLES_DEFINED: 'No tables defined for search',
    TABLE_ALREADY_DEFINED: (table: string) => `Table ${table} already defined.`,
  };

  public readonly tables: Map<
    string,
    TableBuilder<string, Record<string, unknown>>
  > = new Map();

  public addIndexedTable<
    TName extends string,
    TCells extends Record<string, unknown>
  >(tableBuilder: TableBuilder<TName, TCells>) {
    if (this.tables.has(tableBuilder.tableName as any)) {
      throw Error(
        SearcherBuilder.ERRORS.TABLE_ALREADY_DEFINED(tableBuilder.tableName)
      );
    }
    this.tables.set(tableBuilder.tableName as any, tableBuilder);

    return this as unknown as SearcherBuilder<TSchema & Record<TName, TCells>>;
  }

  async build(): Promise<Searcher<TSchema>> {
    let indexes: LyraInstances<TSchema> = {} as LyraInstances<TSchema>;

    if (this.tables.size === 0)
      throw Error(SearcherBuilder.ERRORS.NO_TABLES_DEFINED);

    for (const [key, table] of this.tables) {
      const instance = await create({
        schema: table.schema,
      });
      indexes = { ...indexes, [key]: instance };
    }
    const searcher = new Searcher<TSchema>(indexes);

    return searcher;
  }
}
