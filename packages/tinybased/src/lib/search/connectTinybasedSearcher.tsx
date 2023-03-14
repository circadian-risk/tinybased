/* eslint-disable @typescript-eslint/ban-types */
import { SearchParams, SearchResult } from '@lyrasearch/lyra';

import { useCallback, useEffect, useState } from 'react';
import { useValue } from 'tinybase/cjs/ui-react';
import { ObjectToCellStringType } from '../TableBuilder';
import { TinyBased } from '../tinybased';
import { OnlyStringKeys, TinyBaseSchema } from '../types';
import { SearcherBuilder } from './SearcherBuilder';
import { Searcher } from './Searcher';

const SEARCH_LAST_UPDATED_AT = (table: string | symbol | number) =>
  `__internal__tinybased__${String(table)}-last-updated-at`;

/**
 * Generates a type-safe Searcher instance and its corresponding `useSearch` hook for a fully
 * connected and reactive Full Text Search of an underlying `tinybased` dataset.
 */
export const connectTinybasedSearcher = async <
  TBSchema extends TinyBaseSchema,
  TIndexes extends OnlyStringKeys<TBSchema>
>(
  tinybased: TinyBased<TBSchema>,
  indexes: Array<TIndexes>
): Promise<{
  searcher: Searcher<Pick<TBSchema, TIndexes>>;
  useSearch: <K extends TIndexes>(
    index: K,
    params: SearchParams<ObjectToCellStringType<TBSchema[K]>>
  ) => SearchResult<ObjectToCellStringType<TBSchema[K]>> | undefined;
}> => {
  const searchBuilder = new SearcherBuilder();

  // for each table, addIndexedTable
  indexes.forEach((tableKeyToIndex) => {
    const tableBuilder = tinybased.tables.get(tableKeyToIndex);
    if (!tableBuilder)
      throw Error(
        SearcherBuilder.ERRORS.TABLE_NOT_IN_SCHEMA_BUILDER(tableKeyToIndex)
      );
    searchBuilder.addIndexedTable(tableBuilder);
  });

  const searcher = (await searchBuilder.build()) as Searcher<
    Pick<TBSchema, TIndexes>
  >;

  // upsert handler
  tinybased.onRowAddedOrUpdated(async (table, rowId, entity) => {
    if (entity) {
      const existing = await searcher.getByID(table as any, rowId);
      if (existing) {
        await searcher.remove(table as any, rowId);
      }
      // TODO: We want to get the entity type type-safe
      await searcher.insert(table as any, entity);

      tinybased.store.setValue(
        SEARCH_LAST_UPDATED_AT(table),
        new Date().toISOString()
      );
    }
  }, true);

  // removed handler
  tinybased.onRowRemoved(async (table, rowId, _entity) => {
    await searcher.remove(table as any, rowId);
    tinybased.store.setValue(
      SEARCH_LAST_UPDATED_AT(table),
      new Date().toISOString()
    );
  }, true);

  await Promise.all(
    indexes.map(async (index) => {
      const rows = Object.values(tinybased.getTable(index));

      await searcher.insertBatch(index as any, rows as any);
    })
  );

  /**
   * Type-safe, reactive hook to execute `search` on the Searcher instance of a Tinybased instance
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
      const res = await searcher.search(index as any, params);
      setResult(res);
    }, [searcher, JSON.stringify(params)]);

    useEffect(() => {
      search();
    }, [lastUpdatedAt]);

    return result;
  };

  return {
    searcher: searcher as Searcher<Pick<TBSchema, TIndexes>>,
    useSearch,
  };
};
