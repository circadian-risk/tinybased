/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/ban-types */
import { Queries } from 'tinybase/cjs/queries';
import { Aggregate } from 'tinybase/queries';
import {
  Aggregations,
  Cell,
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
  TJoinedTables extends OnlyStringKeys<TSchema> = never,
  TSelection extends Record<string, unknown> = {},
  TResult extends Record<string, unknown> = {}
> {
  private readonly joins: Array<[string, string]> = [];
  private readonly selects: string[] = [];
  private readonly wheres: Array<[string, Cell]> = [];
  private readonly selectsWithAlias: Array<[string, string]> = [];
  private readonly selectFroms: Array<[string, string]> = [];
  private readonly selectFromsWithAlias: Array<[string, string, string]> = [];
  private readonly whereFroms: Array<
    [string, string, string | number | boolean]
  > = [];
  private readonly whereUsings: Array<
    (
      CellGetter: (joinedTableNameOrCell: string, joinTableCell?: string) => any
    ) => boolean
  > = [];
  private readonly groups: Array<[string, Aggregations, string]> = [];
  private readonly groupUsings: Array<[string, (any: []) => number, string]> =
    [];

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
    TSelection,
    TResult
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
    TSelection & Record<TCellName, TSchema[TStartTable][TCellName]>,
    TResult & Record<TCellName, TSchema[TStartTable][TCellName]>
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
    TSelection & Record<TAlias, TSchema[TStartTable][TCellName]>,
    TResult & Record<TAlias, TSchema[TStartTable][TCellName]>
  > {
    this.selectsWithAlias.push([cellName, alias]);
    return this as any;
  }

  /**
   * Creates an aggreation on one of the selected fields
   */
  group<TGroupCell extends OnlyStringKeys<TSelection>, TAlias extends string>(
    groupBy: TGroupCell,
    agg: Aggregations,
    alias: TAlias
  ): QueryBuilder<
    TSchema,
    TRelationships,
    TStartTable,
    TJoinedTables,
    TSelection,
    Record<TAlias, number>
  > {
    this.groups.push([groupBy, agg, alias]);
    return this as any;
  }

  /**
   * Creates an aggregation on one of the seleted fields using a custom function to calculate
   * the aggregate result
   */
  groupUsing<
    TGroupCell extends OnlyStringKeys<TSelection>,
    Alias extends string
  >(
    groupBy: TGroupCell,
    using: (cells: TSelection[TGroupCell][]) => number,
    as: Alias
  ): QueryBuilder<
    TSchema,
    TRelationships,
    TStartTable,
    TJoinedTables,
    TSelection,
    TResult & Record<Alias, number>
  > {
    this.groupUsings.push([groupBy, using, as]);
    return this as any;
  }

  /**
   * Defines a where condition for equality on one of the starting table's cells
   */
  where<TCellName extends OnlyStringKeys<TSchema[TStartTable]>>(
    cellName: TCellName,
    value: TSchema[TStartTable][TCellName]
  ): QueryBuilder<
    TSchema,
    TRelationships,
    TStartTable,
    TJoinedTables,
    TSelection & Record<TCellName, TSchema[TStartTable][TCellName]>,
    TResult & Record<TCellName, TSchema[TStartTable][TCellName]>
  > {
    this.wheres.push([cellName, value]);
    return this as any;
  }

  /**
   * Defines a where condition that accepts a lambda to dynamically compare cells using custom logic to determine a match
   * Calling this with a single argument will match on the query's source table. If other tables have been joined,
   * this can be called with two arguments to choose the joined table to apply the where condition on
   */
  whereUsing(
    checker: (CellGetter: {
      <TCellName extends OnlyStringKeys<TSchema[TStartTable]>>(
        cell: TCellName
      ): TSchema[TStartTable][TCellName];
      <
        TTable extends TJoinedTables,
        TCellName extends OnlyStringKeys<TSchema[TTable]>
      >(
        joinedTableName: TTable,
        cell: TCellName
      ): TSchema[TTable][TCellName];
    }) => boolean
  ) {
    this.whereUsings.push(checker);
    return this;
  }

  /**
   * Defines a where condition for equality on one of the joined table's cells
   */
  whereFrom<
    TTable extends TJoinedTables,
    TCellName extends OnlyStringKeys<TSchema[TTable]>,
    TValue extends NonNullable<TSchema[TTable][TCellName]>
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
    TSelection & Record<TCellName, TSchema[TTable][TCellName]>,
    TResult & Record<TCellName, TSchema[TTable][TCellName]>
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
    TSelection & Record<TAlias, TSchema[TTable][TCellName]>,
    TResult & Record<TAlias, TSchema[TTable][TCellName]>
  > {
    this.selectFromsWithAlias.push([tableName as string, cell, alias]);

    // TODO this was working but the type broke as soon as I added the `build` method to the class
    return this as any;
  }

  /**
   * Returns a unique ID for this query based on all of the fluent methods
   * that have been chained on to it. This is the ID that will be registered
   * with the TinyBase query module when the `build` method is called
   */
  get queryId() {
    const select = `select-${this.selects.join('_')}`;
    const selectAs = `selectAs-${this.selectsWithAlias.join('_')}`;
    const selectFrom = `selectFrom-${this.selectFroms.join('_')}`;
    const selectFromAs = `selectFromAs-${this.selectFromsWithAlias.join('_')}`;
    const where = `where-${this.wheres.join('_')}`;
    const whereFrom = `where-${this.whereFroms.join('_')}`;
    const whereUsing = `whereUsing-[${this.whereUsings
      .map((x) => x.toString().replace(/\s+/g, ''))
      .join('_')}]`;
    const group = `group-${this.groups.join('_')}`;
    const groupUsing = `groupUsing-${this.groupUsings
      .map((x) => x[0])
      .join('_')}`;

    return [
      this.startTable,
      select,
      selectAs,
      selectFrom,
      selectFromAs,
      where,
      whereFrom,
      whereUsing,
      group,
      groupUsing,
    ].join('-');
  }

  /**
   * Calling this method will actually attach it to the underlying Queries instance, effectively registering
   * it with TinyBase
   */
  build(): Query<TResult> {
    this.internalBuild();
    return new Query(this.queries, this.queryId);
  }

  private internalBuild() {
    if (this.queries.hasQuery(this.queryId)) {
      // If the query has already been registered, we don't want to call
      // setQueryDefinition again since it replaces the original and causes
      // weird issues in React
      return;
    }
    this.queries.setQueryDefinition(
      this.queryId,
      this.startTable,
      ({ where, join, select, group }) => {
        this.joins.forEach(([to, cell]) => {
          join(to, cell);
        });

        this.wheres.forEach(([cell, value]) => where(cell, value));

        this.whereUsings.forEach((checker) => {
          where(checker);
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

        this.groups.forEach(([cell, agg, alias]) => group(cell, agg).as(alias));

        // TODO fix types for Aggregate to avoid casting to unknown
        this.groupUsings.forEach(([cell, using, alias]) =>
          group(cell, using as unknown as Aggregate).as(alias)
        );
      }
    );
  }
}
