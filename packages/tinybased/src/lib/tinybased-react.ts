/* eslint-disable @typescript-eslint/ban-types */
import {
  useResultTable,
  useResultRowIds,
  useRow as tbUseRow,
  useCell as tbUseCell,
  useResultSortedRowIds,
} from 'tinybase/cjs/ui-react';
import { SimpleQuery } from './queries';
import { TinyBased } from './tinybased';
import { QueryOptions, Table, TinyBaseSchema } from './types';

export const useSimpleQueryResultTable = <
  TTable extends Table = {},
  TCells extends keyof TTable = never
>(
  query: SimpleQuery<TTable, TCells>
): Record<string, Pick<TTable, TCells>> => {
  return useResultTable(query.queryId, query.queries) as Record<
    string,
    Pick<TTable, TCells>
  >;
};

export function useSimpleQueryResultIds(query: SimpleQuery) {
  return useResultRowIds(query.queryId, query.queries);
}

export function useSimpleQuerySortedResultIds<
  TTable extends Table = {},
  TCells extends keyof TTable = never
>(query: SimpleQuery<TTable, TCells>, sortBy: TCells, options?: QueryOptions) {
  const { descending = false, offset, limit } = options || {};
  return useResultSortedRowIds(
    query.queryId,
    sortBy as string,
    descending,
    offset,
    limit,
    query.queries
  );
}

export type TinyBasedReactHooks<TBSchema extends TinyBaseSchema = {}> = {
  useCell: <
    TTable extends keyof TBSchema,
    TCell extends keyof TBSchema[TTable]
  >(
    table: TTable,
    rowId: string,
    cellId: TCell
  ) => TBSchema[TTable][TCell];

  useRow: <TTable extends keyof TBSchema>(
    table: TTable,
    rowId: string
  ) => TBSchema[TTable];
};

export function makeTinybasedHooks<
  TBSchema extends TinyBaseSchema = {},
  TRelationships extends string = never
>(
  tinyBased: TinyBased<TBSchema, TRelationships>
): TinyBasedReactHooks<TBSchema> {
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

  return {
    useCell,
    useRow,
  };
}
