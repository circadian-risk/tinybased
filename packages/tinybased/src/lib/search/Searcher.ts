/* eslint-disable @typescript-eslint/ban-types */
import {
  getByID,
  insert,
  insertBatch,
  Lyra,
  remove,
  search,
  SearchParams,
  SearchResult,
} from '@lyrasearch/lyra';

import { ObjectToCellStringType } from '../TableBuilder';
import { OnlyStringKeys, TinyBaseSchema } from '../types';

export type LyraInstances<TSchema extends TinyBaseSchema> = {
  [K in OnlyStringKeys<TSchema>]: Lyra<ObjectToCellStringType<TSchema[K]>>;
};

export class Searcher<TSchema extends TinyBaseSchema = {}> {
  constructor(private readonly indexes: LyraInstances<TSchema>) {}

  public insert<K extends OnlyStringKeys<TSchema>>(index: K, val: TSchema[K]) {
    return insert(this.indexes[index], val as any);
  }

  public insertBatch<K extends OnlyStringKeys<TSchema>>(
    index: K,
    values: Array<TSchema[K]>,
    batchSize = 100
  ) {
    return insertBatch(this.indexes[index], values as any, { batchSize });
  }

  public remove<K extends OnlyStringKeys<TSchema>>(index: K, id: string) {
    return remove(this.indexes[index], id);
  }

  public search<K extends OnlyStringKeys<TSchema>>(
    index: K,
    params: SearchParams<ObjectToCellStringType<TSchema[K]>>
  ): Promise<SearchResult<ObjectToCellStringType<TSchema[K]>>> {
    // Excessive stack depth comparing types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return search(this.indexes[index], params as any) as any;
  }

  public getByID<K extends OnlyStringKeys<TSchema>>(
    index: K,
    id: string | number
  ) {
    return getByID(this.indexes[index], String(id));
  }
}
