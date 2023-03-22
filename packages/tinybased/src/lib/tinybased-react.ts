/* eslint-disable @typescript-eslint/ban-types */
import { useEffect, useMemo } from 'react';
import {
  useResultRowIds,
  useRow as tbUseRow,
  useCell as tbUseCell,
  useRowIds as tbUseRowIds,
  useSortedRowIds as tbUseSortedRowIds,
  useLocalRowIds as tbUseLocalRowIds,
  useRemoteRowId as tbUseRemoteRowId,
  useResultTable as tbUseResultTable,
  useResultSortedRowIds,
  useValue as tbUseValue,
} from 'tinybase/cjs/ui-react';
import { QueryBuilder } from './queries/QueryBuilder';
import { TinyBased } from './tinybased';
import {
  InferKeyValueSchema,
  InferRelationshipNames,
  InferRelationships,
  InferSchema,
  OnlyStringKeys,
  SortOptions,
  Table,
  TinyBaseSchema,
} from './types';

export type TinyBasedReactHooks<
  TB extends TinyBased<any, any, any, any>,
  TBSchema extends TinyBaseSchema = InferSchema<TB>,
  TKeyValueSchema extends Table = InferKeyValueSchema<TB>
> = {
  useValue: <TKey extends OnlyStringKeys<TKeyValueSchema>>(
    key: TKey
  ) => TKeyValueSchema[TKey] | undefined;

  useCell: <
    TTable extends keyof TBSchema,
    TCell extends keyof TBSchema[TTable]
  >(
    table: TTable,
    rowId: string,
    cellId: TCell
  ) => TBSchema[TTable][TCell];

  /**
   * Reactively returns the ids of all of the rows in the chosen table
   */
  useRowIds: <TTable extends keyof TBSchema>(table: TTable) => string[];

  /**
   * Reactively returns rows ids for the specified table which are sorted by the specified column. By default
   * they will be sorted in ascending order, but this and other options for pagination can be provided.
   * The hook will automatically re-render if the underlying data changes
   */
  useSortedRowIds: <
    TTable extends keyof TBSchema,
    TCell extends keyof TBSchema[TTable]
  >(
    table: TTable,
    sortBy: TCell,
    sortOptions?: SortOptions
  ) => string[];

  useRow: <TTable extends keyof TBSchema>(
    table: TTable,
    rowId: string
  ) => TBSchema[TTable];

  /**
   * Returns the ids of all of the matching objects from a named relationship
   *    Eg. for a database that had a relationship from 1 user -> many notes, would
   *    return the reactive set of all note ids that belonged to the user
   */
  useLocalRowIds: (
    relationshipName: InferRelationshipNames<TB>,
    rowId: string
  ) => string[];

  useRemoteRowId: (
    relationshipName: InferRelationshipNames<TB>,
    rowId: string
  ) => string | undefined;

  /**
   * Reactively returns the results of the provided query builder. The easiest way to obtain a typesafe
   * querybuilder is to use the `query(tableName)` method on a TinyBased instance
   */
  useQueryResult: <
    TTable extends OnlyStringKeys<TBSchema>,
    TSelection extends Record<string, unknown>,
    TResult extends Record<string, unknown>
  >(
    qb: QueryBuilder<
      TBSchema,
      InferRelationships<TB>,
      TTable,
      never,
      TSelection,
      TResult
    >
  ) => Record<string, TResult>;

  useQueryResultIds: (qb: QueryBuilder<TBSchema>) => string[];

  /**
   * Reactively returns the row ids from the provided QueryBuilder using the supplied sort criteria
   */
  useQuerySortedResultIds: <
    TStartTable extends OnlyStringKeys<TBSchema>,
    TJoinedTables extends OnlyStringKeys<TBSchema>,
    TResult extends Record<string, unknown>,
    TSortBy extends OnlyStringKeys<TResult>
  >(
    qb: QueryBuilder<
      TBSchema,
      InferRelationships<TB>,
      TStartTable,
      TJoinedTables,
      TResult,
      TResult
    >,
    sortBy: TSortBy,
    sortOptions?: SortOptions
  ) => string[];
};

/**
 * Generates a set of typesafe react hooks based on the provided TinyBased instance
 */
export function makeTinybasedHooks<
  TB extends TinyBased<any, any>,
  TBSchema extends TinyBaseSchema = InferSchema<TB>,
  TKeyValueSchema extends Table = InferKeyValueSchema<TB>
>(tinyBased: TB) {
  const store = tinyBased.store;

  const useCell = <
    TTable extends keyof TBSchema,
    TCell extends keyof TBSchema[TTable]
  >(
    table: TTable,
    rowId: string,
    cellId: TCell
  ) => {
    return tbUseCell(
      table as string,
      rowId,
      cellId as string,
      store
    ) as TBSchema[TTable][TCell];
  };

  const useRow = <TTable extends keyof TBSchema>(
    table: TTable,
    rowId: string
  ) => {
    return tbUseRow(table as string, rowId, store) as TBSchema[TTable];
  };

  const useRowIds = <TTable extends keyof TBSchema>(table: TTable) => {
    return tbUseRowIds(table as string, store) as string[];
  };

  const useSortedRowIds = <
    TTable extends keyof TBSchema,
    TCell extends keyof TBSchema[TTable]
  >(
    table: TTable,
    sortBy: TCell,
    sortOptions?: SortOptions
  ) => {
    const { descending = false, offset, limit } = sortOptions || {};
    return tbUseSortedRowIds(
      table as string,
      sortBy as string,
      descending,
      offset,
      limit,
      store
    );
  };

  const useLocalRowIds = (
    relationshipName: InferRelationshipNames<TB>,
    rowId: string
  ) => {
    return tbUseLocalRowIds(
      relationshipName as string,
      rowId,
      tinyBased.relationships
    ) as string[];
  };

  const useRemoteRowId = (
    relationshipName: InferRelationshipNames<TB>,
    rowId: string
  ) => {
    return tbUseRemoteRowId(
      relationshipName as string,
      rowId,
      tinyBased.relationships
    ) as string;
  };

  const useQueryResult = <
    TTable extends OnlyStringKeys<TBSchema>,
    TResult extends Record<string, unknown>
  >(
    qb: QueryBuilder<
      TBSchema,
      InferRelationships<TB>,
      TTable,
      never,
      never,
      TResult
    >
  ): Record<string, TResult> => {
    const query = useMemo(() => qb.build(), [qb.queryId]);

    useEffect(() => {
      return () => {
        tinyBased.queries.delQueryDefinition(query.queryId);
      };
    }, [tinyBased, query.queryId]);

    return tbUseResultTable(query.queryId, tinyBased.queries) as Record<
      string,
      TResult
    >;
  };

  const useQueryResultIds = (qb: QueryBuilder<TBSchema>) => {
    const query = useMemo(() => qb.build(), [qb.queryId]);

    useEffect(() => {
      return () => {
        tinyBased.queries.delQueryDefinition(query.queryId);
      };
    }, [tinyBased, query.queryId]);

    return useResultRowIds(query.queryId, tinyBased.queries);
  };

  const useQuerySortedResultIds = <
    TStartTable extends OnlyStringKeys<TBSchema>,
    TJoinedTables extends OnlyStringKeys<TBSchema>,
    TResult extends Record<string, unknown>,
    TSortBy extends OnlyStringKeys<TResult>
  >(
    qb: QueryBuilder<
      TBSchema,
      InferRelationships<TB>,
      TStartTable,
      TJoinedTables,
      TResult,
      TResult
    >,
    sortBy: TSortBy,
    sortOptions?: SortOptions
  ) => {
    const { descending = false, offset, limit } = sortOptions || {};
    const query = useMemo(() => qb.build(), [qb.queryId]);

    useEffect(() => {
      return () => {
        tinyBased.queries.delQueryDefinition(query.queryId);
      };
    }, [tinyBased, query.queryId]);

    return useResultSortedRowIds(
      query.queryId,
      sortBy,
      descending,
      offset,
      limit,
      query.queries
    );
  };

  const useValue = <TKey extends OnlyStringKeys<TKeyValueSchema>>(
    key: TKey
  ): TKeyValueSchema[TKey] | undefined => {
    return tbUseValue(key, tinyBased.store) as
      | TKeyValueSchema[TKey]
      | undefined;
  };

  return {
    useCell,
    useRowIds,
    useSortedRowIds,
    useRow,
    useLocalRowIds,
    useRemoteRowId,
    useQueryResult,
    useQueryResultIds,
    useQuerySortedResultIds,
    useValue,
  } as TinyBasedReactHooks<TB, TBSchema, TKeyValueSchema>;
}
