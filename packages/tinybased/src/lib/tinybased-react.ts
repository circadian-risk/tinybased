/* eslint-disable @typescript-eslint/ban-types */
import {
  useResultTable,
  useResultRowIds,
  useRow as tbUseRow,
  useCell as tbUseCell,
  useRowIds as tbUseRowIds,
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
  QueryOptions,
  Table,
} from './types';

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

export function useSimpleQueryResultIds(query: SimpleQuery) {
  return useResultRowIds(query.queryId, query.queries);
}

export function useSimpleQuerySortedResultIds<
  TTable extends Table = {},
  TCells extends OnlyStringKeys<TTable> = never
>(query: SimpleQuery<TTable, TCells>, sortBy: TCells, options?: QueryOptions) {
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

  useRowIds: <TTable extends keyof TBSchema>(table: TTable) => string[];

  useRow: <TTable extends keyof TBSchema>(
    table: TTable,
    rowId: string
  ) => TBSchema[TTable];

  useLocalRowIds: (relationshipName: TRelationships, rowId: string) => string[];

  useRemoteRowId: (
    relationshipName: TRelationships,
    rowId: string
  ) => string | undefined;
};

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
    useRow,
    useLocalRowIds,
    useRemoteRowId,
  } as TinyBasedReactHooks<TB>;
}
