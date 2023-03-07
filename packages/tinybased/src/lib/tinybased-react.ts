/* eslint-disable @typescript-eslint/ban-types */
import {
  useResultTable,
  useResultRowIds,
  useRow as tbUseRow,
  useCell as tbUseCell,
} from 'tinybase/ui-react';
import { SimpleQuery } from './queries';
import { TinyBased } from './tinybased';
import { TableSchema, TinyBaseSchema } from './types';

export const useSimpleQueryResultTable = <
  TTable extends TableSchema = {},
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

export type TinyBasedReactHooks<TSchema extends TinyBaseSchema = {}> = {
  useCell: <TTable extends keyof TSchema, TCell extends keyof TSchema[TTable]>(
    table: TTable,
    rowId: string,
    cellId: TCell
  ) => TSchema[TTable][TCell];

  useRow: <TTable extends keyof TSchema>(
    table: TTable,
    rowId: string
  ) => TSchema[TTable];
};

export function makeTinybasedHooks<
  TSchema extends TinyBaseSchema = {},
  TRelationships extends string = never
>(tinyBased: TinyBased<TSchema, TRelationships>): TinyBasedReactHooks<TSchema> {
  const store = tinyBased.store;

  const useCell = <
    TTable extends keyof TSchema,
    TCell extends keyof TSchema[TTable]
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
    ) as TSchema[TTable][TCell];
  };

  const useRow = <TTable extends keyof TSchema>(
    table: TTable,
    rowId: string
  ) => {
    return tbUseRow(table as string, rowId, store) as TSchema[TTable];
  };

  return {
    useCell,
    useRow,
  };
}
