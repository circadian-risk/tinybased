import {
  CellStringType,
  CellTypeMap,
  CellTypeToString,
  OnlyStringKeys,
  Prettify,
} from './types';

/**
 * Given an Object, convert it to its CellStringType representation.
 *
 * Types `number`, `boolean` and `string` will get converted to string literals `"number"`, `"boolean"`, `"string"`
 */
export type ObjectToCellStringType<O extends Record<string, unknown>> = {
  [K in OnlyStringKeys<O>]: CellTypeToString<O[K]>;
};

/**
 * Given keys of an object, T, returns a Record keyed by T with CellStringType values (`'string' | 'boolean' | 'number'`)
 */
export type TableSchema<T> = T extends string
  ? Record<T, CellStringType>
  : never;

export type CellSchema = {
  name: string;
  type: CellStringType;
  optional?: boolean;
};

export type InferTable<T> = T extends TableBuilder<infer _TName, infer TCells>
  ? Prettify<TCells>
  : never;

export class TableBuilder<
  TName extends string = never,
  // eslint-disable-next-line @typescript-eslint/ban-types
  TCells extends Record<string, unknown> = {}
> {
  private readonly _cells: CellSchema[] = [];

  // TODO: It would be awesome if we could default to 'id' only if it exists as a non optional string on the
  // current table builder. If not present, it should not be possible to add the Table to the SchemaBuilder
  private _keys: string[] = ['id'];
  private _keyDelimiter = '::';

  constructor(public readonly tableName: TName) {}

  public get keys() {
    return this._keys;
  }

  public get cells() {
    return this._cells;
  }

  /**
   * Returns the names of all of the cells that are attached to this Table
   */
  public get cellNames() {
    return this._cells.map((c) => c.name);
  }

  /**
   * Returns a schema object
   */
  public get schema(): TableSchema<keyof TCells> {
    return this._cells.reduce(
      (acc, cell) => ({ ...acc, [cell.name]: cell.type }),
      {}
    ) as TableSchema<keyof TCells>;
  }

  add<TCellName extends string, TCellType extends CellStringType>(
    name: TCellName,
    type: TCellType
  ): TableBuilder<
    TName,
    Prettify<TCells & Record<TCellName, CellTypeMap[TCellType]>>
  > {
    this._cells.push({ name, type });
    return this;
  }

  addOptional<TCellName extends string, TCellType extends CellStringType>(
    name: TCellName,
    type: TCellType
  ): TableBuilder<
    TName,
    Prettify<TCells & Partial<Record<TCellName, CellTypeMap[TCellType]>>>
  > {
    this._cells.push({ name, type, optional: true });

    return this;
  }

  defineKeyDelimiter(delimiter: string) {
    this._keyDelimiter = delimiter;
    return this;
  }

  keyBy<TCellName extends OnlyStringKeys<TCells>>(
    cells: TCellName | TCellName[]
  ) {
    this._keys = Array.isArray(cells) ? cells : [cells];
    return this;
  }

  composeKey(rowOrKeyValues: TCells | string[]) {
    const keyValues = Array.isArray(rowOrKeyValues)
      ? rowOrKeyValues
      : this._keys.map((key) => rowOrKeyValues[key]);
    return keyValues.join(this._keyDelimiter);
  }
}
