import { Queries } from 'tinybase/queries';
import { Aggregations } from '../types';

export class SimpleAggregateQuery<TAggregation extends Aggregations> {
  constructor(
    public readonly queries: Queries,
    public readonly queryId: string,
    private readonly aggregation: TAggregation
  ) {}

  getAggregation(): {
    [key in TAggregation]?: number;
  } {
    return this.queries.getResultTable(this.queryId)['0'] as any;
  }
}
