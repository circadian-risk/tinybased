/* eslint-disable @typescript-eslint/ban-types */

import {
  Prettify,
  Relationships,
  Table,
  TinyBaseSchema,
  Cell,
  OnlyStringKeys,
  RelationshipDefinition,
} from './types';
import { z, ZodObject, ZodRawShape, ZodSchema } from 'zod';

// Question... How do we ensure that users can only provide
// schemas which are composed as primitives and not nested objects or
// other incompatible types?

const usersTableSchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number(),
  type: z.union([z.literal('admin'), z.literal('member')]),
  nested: z.object({
    id: z.number(),
  }),
});

const notesTableSchema = z.object({
  id: z.string(),
  userId: z.string(),
  text: z.string().optional(),
});

type RemoveNever<T> = Pick<
  T,
  Exclude<keyof T, { [K in keyof T]: T[K] extends never ? K : never }[keyof T]>
>;

type Primitives<T extends Record<string, unknown>> = RemoveNever<{
  [K in keyof T]: Required<T>[K] extends Cell ? T[K] : never;
}>;

type ValueSchema<T> = T extends ZodSchema<infer S>
  ? S extends Cell
    ? S
    : never
  : never;

export class ZodSchemaBuilder<
  TBSchema extends TinyBaseSchema = {},
  TRelationshipNames extends string = never,
  TRelationships extends Relationships<TBSchema> = {},
  TKeyValueSchema extends Table = {}
> {
  private readonly relationshipDefinitions: RelationshipDefinition[] = [];

  addTable<TName extends string, TSchema extends ZodObject<ZodRawShape>>(
    _tableName: TName,
    _schema: TSchema
  ): ZodSchemaBuilder<
    Prettify<TBSchema & Record<TName, Prettify<Primitives<z.infer<TSchema>>>>>,
    TRelationshipNames,
    TRelationships,
    TKeyValueSchema
  > {
    return this;
  }

  // This currently works for preventing non-cell values, but it doesn't give a type error.
  // It just silently removes the invalid key from the resulting types
  addValue<TName extends string, TValueSchema extends ZodSchema>(
    _name: TName,
    _schema: TValueSchema
  ): ZodSchemaBuilder<
    TBSchema,
    TRelationshipNames,
    TRelationships,
    Prettify<
      RemoveNever<TKeyValueSchema & Record<TName, ValueSchema<TValueSchema>>>
    >
  > {
    return this;
  }

  public defineRelationship<
    TRelationshipName extends string,
    TTableFrom extends OnlyStringKeys<TBSchema>,
    TTableTo extends OnlyStringKeys<TBSchema>,
    TCellFrom extends OnlyStringKeys<TBSchema[TTableFrom]>
  >(
    name: TRelationshipName,
    tableFrom: TTableFrom,
    tableTo: TTableTo,
    cellFrom: TCellFrom
  ): ZodSchemaBuilder<
    TBSchema,
    TRelationshipNames | TRelationshipName,
    Prettify<
      TRelationships &
        Record<TRelationshipName, { from: TTableFrom; to: TTableTo }>
    >,
    TKeyValueSchema
  > {
    this.relationshipDefinitions.push({
      name,
      from: tableFrom,
      to: tableTo,
      cell: cellFrom,
    });

    return this;
  }
}

const valueSchema = z.union([z.literal('one'), z.literal('two')]);

type Test1 = ValueSchema<typeof valueSchema>;

type TablesSchema<T> = T extends ZodSchemaBuilder<infer TS> ? TS : never;
type KeyValuesSchema<T> = T extends ZodSchemaBuilder<
  infer _T,
  infer _RN,
  infer _R,
  infer KV
>
  ? KV
  : never;

const b = new ZodSchemaBuilder()
  .addTable('users', usersTableSchema)
  .addTable('notes', notesTableSchema)
  .addValue('type', valueSchema)
  .addValue('nested', usersTableSchema)
  .addValue('bool', z.boolean())
  .defineRelationship('userNotes', 'notes', 'users', 'userId');
//

type TablesShape = TablesSchema<typeof b>;
type KeyValuesShape = KeyValuesSchema<typeof b>;
