/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-types */
import { Queries } from 'tinybase/cjs/queries';
import {
  OnlyStringKeys,
  RelationshipDefinition,
  TinyBaseSchema,
} from '../types';
import { Query } from './Query';

type Relationship<T extends TinyBaseSchema = {}> = {
  from: OnlyStringKeys<T>;
  to: OnlyStringKeys<T>;
};

type Relationships<T extends TinyBaseSchema> = Record<string, Relationship<T>>;

// given some some Relationships and the name of a table, which Relationships
// match based on their "from" property being equal to the supplied table
type MatchingRelationships<TTable, R> = R extends Relationships<infer _S>
  ? {
      -readonly [K in keyof R]: TTable extends R[K]['from'] ? K : never;
    }[keyof R]
  : never;

export type QuerySelection<T> = T extends QueryBuilder<
  infer _S,
  infer _R,
  infer _ST,
  infer _JT,
  infer Selection
>
  ? Selection
  : never;

export class QueryBuilder<
  TSchema extends TinyBaseSchema = {},
  TRelationships extends Relationships<TSchema> = {},
  TStartTable extends OnlyStringKeys<TSchema> = never,
  TJoinedTables extends keyof TSchema = never,
  TSelection extends Record<string, unknown> = {}
> {
  private readonly joins: Array<[string, string]> = [];
  private readonly selects: string[] = [];
  private readonly selectsWithAlias: Array<[string, string]> = [];
  private readonly selectFroms: Array<[string, string]> = [];
  private readonly selectFromsWithAlias: Array<[string, string, string]> = [];
  private readonly whereFroms: Array<
    [string, string, string | number | boolean]
  > = [];

  constructor(
    private readonly queries: Queries,
    private readonly startTable: OnlyStringKeys<TSchema>,
    private readonly relationshipDefs: RelationshipDefinition[]
  ) {}

  join<
    TRelationshipName extends MatchingRelationships<TStartTable, TRelationships>
  >(
    _relationshipName: TRelationshipName
  ): QueryBuilder<
    TSchema,
    TRelationships,
    TStartTable,
    TJoinedTables | TRelationships[TRelationshipName]['to'],
    TSelection
  > {
    const { to, cell } = this.relationshipDefs.find(
      (r) => r.name === _relationshipName
    )!;
    this.joins.push([to, cell]);
    return this;
  }

  /**
   * Selects a cell from the starting table of the query
   */
  select<TCellName extends OnlyStringKeys<TSchema[TStartTable]>>(
    cellName: TCellName
  ): QueryBuilder<
    TSchema,
    TRelationships,
    TStartTable,
    TJoinedTables,
    TSelection & Record<TCellName, boolean>
  > {
    this.selects.push(cellName);
    return this as any;
  }

  /**
   * Selects a cell from the starting table and provides an alias for it
   */
  selectAs<
    TCellName extends OnlyStringKeys<TSchema[TStartTable]>,
    TAlias extends string
  >(
    cellName: TCellName,
    alias: TAlias
  ): QueryBuilder<
    TSchema,
    TRelationships,
    TStartTable,
    TJoinedTables,
    TSelection & Record<TAlias, TSchema[TStartTable][TCellName]>
  > {
    this.selectsWithAlias.push([cellName, alias]);
    return this as any;
  }

  /**
   * Defines a where condition for equality on one of the joined table's cells
   */
  whereFrom<
    TTable extends TJoinedTables,
    TCellName extends OnlyStringKeys<TSchema[TTable]>,
    TValue extends TSchema[TTable][TCellName]
  >(tableName: TTable, cell: TCellName, value: TValue) {
    this.whereFroms.push([tableName as string, cell, value]);
    return this;
  }

  /**
   * Selects a cell from one of the joined tables
   */
  selectFrom<
    TTable extends TJoinedTables,
    TCellName extends OnlyStringKeys<TSchema[TTable]>
  >(
    tableName: TTable,
    cell: TCellName
  ): QueryBuilder<
    TSchema,
    TRelationships,
    TStartTable,
    TJoinedTables,
    TSelection & Record<TCellName, number>
  > {
    this.selectFroms.push([tableName as string, cell]);
    // TODO this was working but the type broke as soon as I added the `build` method to the class
    return this as any;
  }

  /**
   * Selects a cell from one of the joined tables and provides an alias for it
   */
  selectFromAs<
    TTable extends TJoinedTables,
    TCellName extends OnlyStringKeys<TSchema[TTable]>,
    TAlias extends string
  >(
    tableName: TTable,
    cell: TCellName,
    alias: TAlias
  ): QueryBuilder<
    TSchema,
    TRelationships,
    TStartTable,
    TJoinedTables,
    TSelection & Record<TAlias, TSchema[TTable][TCellName]>
  > {
    this.selectFromsWithAlias.push([tableName as string, cell, alias]);
    // TODO this was working but the type broke as soon as I added the `build` method to the class
    return this as any;
  }

  build(): Query<TSelection> {
    const queryId = this.internalBuild();
    return new Query(this.queries, queryId);
  }

  private internalBuild() {
    const queryId = `${this.startTable}-select-${this.selectFroms.join(
      '_'
    )}-where-${this.whereFroms.join('_')}`;

    this.queries.setQueryDefinition(
      queryId,
      this.startTable,
      ({ where, join, select }) => {
        this.joins.forEach(([to, cell]) => {
          join(to, cell);
        });
        this.whereFroms.forEach(([table, cell, value]) => {
          return where(table, cell, value);
        });
        this.selects.forEach((c) => select(c));
        this.selectsWithAlias.forEach(([cell, alias]) =>
          select(cell).as(alias)
        );
        this.selectFroms.forEach(([table, cell]) => select(table, cell));
        this.selectFromsWithAlias.forEach(([table, cell, alias]) =>
          select(table, cell).as(alias)
        );
      }
    );

    return queryId;
  }
}
