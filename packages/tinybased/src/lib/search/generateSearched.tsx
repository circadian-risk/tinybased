/* eslint-disable @typescript-eslint/ban-types */
import { SearchParams, SearchResult } from '@lyrasearch/lyra';

import { useCallback, useEffect, useState } from 'react';
import { useValue } from 'tinybase/cjs/ui-react';
import { ObjectToCellStringType, TableBuilder } from '../TableBuilder';
import { TinyBased } from '../tinybased';
import { OnlyStringKeys, TinyBaseSchema } from '../types';
import { Searched } from './searched';

const SEARCH_LAST_UPDATED_AT = (table: string | symbol | number) =>
  `${String(table)}-last-updated-at`;

/**
 * Generates a type-safe Searched instance and its corresponding `useSearch` hook for a fully
 * connected and reactive Full Text Search of an underlying `tinybased` dataset.
 */
export const generateSearched = async <
  TBSchema extends TinyBaseSchema,
  TIndexes extends OnlyStringKeys<TBSchema>
>(
  tinybased: TinyBased<TBSchema>,
  indexes: Array<TIndexes>
): Promise<{
  searched: Searched<Pick<TBSchema, TIndexes>>;
  useSearch: <K extends TIndexes>(
    index: K,
    params: SearchParams<ObjectToCellStringType<TBSchema[K]>>
  ) => SearchResult<ObjectToCellStringType<TBSchema[K]>> | undefined;
}> => {
  // instantiate searched here
  const searched = new Searched();

  // for each table, addIndexedTable
  const tables = new Map<TIndexes, TableBuilder<any, any>>();
  indexes.forEach((tableKeyToIndex) => {
    const tableBuilder = tinybased.tables.get(tableKeyToIndex);
    if (!tableBuilder)
      throw Error(Searched.ERRORS.TABLE_NOT_IN_SCHEMA_BUILDER(tableKeyToIndex));
    tables.set(tableKeyToIndex, tableBuilder);
  });

  const searchedWithTables = searched.setTables(tables);

  // upsert handler
  tinybased.onRowAddedOrUpdated(async (table, rowId, entity) => {
    if (entity) {
      const existing = await searchedWithTables.getByID(table as any, rowId);
      if (existing) {
        searchedWithTables.remove(table as any, rowId);
      }
      // TODO: We want to get the entity type type-safe
      await searchedWithTables.insert(table as any, entity as any);

      tinybased.store.setValue(
        SEARCH_LAST_UPDATED_AT(table),
        new Date().toISOString()
      );
    }
  }, true);

  // removed handler
  tinybased.onRowRemoved(async (table, rowId, _entity) => {
    await searchedWithTables.remove(table as any, rowId);
    tinybased.store.setValue(
      SEARCH_LAST_UPDATED_AT(table),
      new Date().toISOString()
    );
  }, true);

  await searchedWithTables.initialize();

  await Promise.all(
    indexes.map(async (index) => {
      const rows = Object.values(tinybased.getTable(index));

      await searchedWithTables.insertBatch(index, rows);
    })
  );

  /**
   * Type-safe, reactive hook to execute `search` on the Searched instance of a Tinybased instance
   */
  const useSearch = <K extends TIndexes>(
    index: K,
    /**
     * Tables in the Tinybased instance to be indexed and searchable
     */
    params: SearchParams<ObjectToCellStringType<TBSchema[K]>>
  ): SearchResult<ObjectToCellStringType<TBSchema[K]>> | undefined => {
    const lastUpdatedAt = useValue(
      SEARCH_LAST_UPDATED_AT(index),
      tinybased.store
    );

    const [result, setResult] = useState<
      SearchResult<ObjectToCellStringType<TBSchema[K]>> | undefined
    >(undefined);

    const search = useCallback(async () => {
      const res = await searchedWithTables.search(index, params as any);
      setResult(res as any);
    }, [searchedWithTables, JSON.stringify(params)]);

    useEffect(() => {
      search();
    }, [lastUpdatedAt]);

    return result;
  };

  return {
    searched: searchedWithTables as Searched<Pick<TBSchema, TIndexes>>,
    useSearch,
  };
};
