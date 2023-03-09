import { OnlyStringKeys, Prettify } from './types';

interface CellTypeMap {
  string: string;
  number: number;
  boolean: boolean;
}

type CellStringType = 'string' | 'boolean' | 'number';

export type CellSchema = {
  name: string;
  type: CellStringType;
  optional?: boolean;
};

export class TableBuilder<
  TName extends string = never,
  // eslint-disable-next-line @typescript-eslint/ban-types
  TCells extends Record<string, unknown> = {}
> {
  private readonly _cells: CellSchema[] = [];

  // TODO: It would be awesome if we could default to 'id' only if it exists as a non optional string on the
  // current table builder. If not present, it should not be possible to add the Table to the SchemaBuilder
  private _keys: string[] = ['id'];

  constructor(public readonly tableName: TName) {}

  public get keys() {
    return this._keys;
  }

  public get cells() {
    return this._cells;
  }

  add<TCellName extends string, TCellType extends CellStringType>(
    name: TCellName,
    type: TCellType
  ): TableBuilder<TName, TCells & Record<TCellName, CellTypeMap[TCellType]>> {
    this._cells.push({ name, type });
    return this;
  }

  addOptional<TCellName extends string, TCellType extends CellStringType>(
    name: TCellName,
    type: TCellType
  ): TableBuilder<
    TName,
    TCells & Partial<Record<TCellName, CellTypeMap[TCellType]>>
  > {
    this._cells.push({ name, type, optional: true });

    return this;
  }

  keyBy<TCellName extends OnlyStringKeys<TCells>>(
    cells: TCellName | TCellName[]
  ) {
    this._keys = Array.isArray(cells) ? cells : [cells];
    return this;
  }
}

export type InferTable<T> = T extends TableBuilder<infer _TName, infer TCells>
  ? Prettify<TCells>
  : never;
