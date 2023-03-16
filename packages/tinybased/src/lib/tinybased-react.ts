/* eslint-disable @typescript-eslint/ban-types */
import {
  useResultTable,
  useResultRowIds,
  useRow as tbUseRow,
  useCell as tbUseCell,
  useRowIds as tbUseRowIds,
  useSortedRowIds as tbUseSortedRowIds,
  useLocalRowIds as tbUseLocalRowIds,
  useRemoteRowId as tbUseRemoteRowId,
  useResultSortedRowIds,
  useResultRow,
} from 'tinybase/cjs/ui-react';
import { SimpleAggregateQuery, SimpleQuery } from './queries';
import { TinyBased } from './tinybased';
import {
  Aggregations,
  InferRelationShip,
  InferSchema,
  OnlyStringKeys,
  SortOptions,
  Table,
} from './types';

/**
 * Given a simple query object, will subscribe to reactively update
 * results and return them as Record keyed by the matching row Id
 * with a value matching the queried cells
 */
export const useSimpleQueryResultTable = <
  TTable extends Table = {},
  TCells extends OnlyStringKeys<TTable> = never
>(
  query: SimpleQuery<TTable, TCells>
): Record<string, Pick<TTable, TCells>> => {
  return useResultTable(query.queryId, query.queries) as Record<
    string,
    Pick<TTable, TCells>
  >;
};

export function useSimpleAggregateResult<TAggregation extends Aggregations>(
  query: SimpleAggregateQuery<TAggregation>
): { [key in TAggregation]?: number } {
  return useResultRow(query.queryId, '0', query.queries) as any;
}

/**
 * Given a simple query object, will subscribe to reactively update
 * results of query and return the corresponding ids of the matching records
 */
export function useSimpleQueryResultIds(query: SimpleQuery) {
  return useResultRowIds(query.queryId, query.queries);
}

/**
 * Given a simple query object, will subscribe to reactively update
 * results of the query based on the provided sorting criteria and return
 * the corresponding Ids of the matching records
 */
export function useSimpleQuerySortedResultIds<
  TTable extends Table = {},
  TCells extends OnlyStringKeys<TTable> = never
>(query: SimpleQuery<TTable, TCells>, sortBy: TCells, options?: SortOptions) {
  const { descending = false, offset, limit } = options || {};
  return useResultSortedRowIds(
    query.queryId,
    sortBy,
    descending,
    offset,
    limit,
    query.queries
  );
}

export type TinyBasedReactHooks<
  TB extends TinyBased<any, any>,
  TBSchema = InferSchema<TB>,
  TRelationships = InferRelationShip<TB>
> = {
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
  useLocalRowIds: (relationshipName: TRelationships, rowId: string) => string[];

  useRemoteRowId: (
    relationshipName: TRelationships,
    rowId: string
  ) => string | undefined;
};

/**
 * Generates a set of typesafe react hooks based on the provided TinyBased instance
 */
export function makeTinybasedHooks<
  TB extends TinyBased<any, any>,
  TBSchema = InferSchema<TB>,
  TRelationships = InferRelationShip<TB>
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

  const useLocalRowIds = (relationshipName: TRelationships, rowId: string) => {
    return tbUseLocalRowIds(
      relationshipName as string,
      rowId,
      tinyBased.relationships
    ) as string[];
  };

  const useRemoteRowId = (relationshipName: TRelationships, rowId: string) => {
    return tbUseRemoteRowId(
      relationshipName as string,
      rowId,
      tinyBased.relationships
    ) as string;
  };

  return {
    useCell,
    useRowIds,
    useSortedRowIds,
    useRow,
    useLocalRowIds,
    useRemoteRowId,
  } as TinyBasedReactHooks<TB>;
}
