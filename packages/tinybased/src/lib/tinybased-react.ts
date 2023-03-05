/* eslint-disable @typescript-eslint/ban-types */
import { useResultTable } from 'tinybase/ui-react';
import { SimpleQuery } from './tinybased';
import { TableSchema } from './types';

export const useSimpleQueryResultIds = <
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

// export const useSimpleQueryResultTable = () => {};
