import { Queries } from 'tinybase/queries';
import { TableSchema } from '../types';

export class SimpleQuery<
  // eslint-disable-next-line @typescript-eslint/ban-types
  TTable extends TableSchema = {},
  TCells extends keyof TTable = never
> {
  constructor(
    public readonly queries: Queries,
    public readonly queryId: string
  ) {}

  public getResultRowIds() {
    return this.queries.getResultRowIds(this.queryId);
  }

  public getResultTable(): Record<string, Pick<TTable, TCells>> {
    return this.queries.getResultTable(this.queryId) as Record<
      string,
      Pick<TTable, TCells>
    >;
  }
}
