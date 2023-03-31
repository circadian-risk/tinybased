/* eslint-disable @typescript-eslint/ban-types */

import {
  Prettify,
  Relationships,
  Table,
  TinyBaseSchema,
  OnlyStringKeys,
  RelationshipDefinition,
} from './types';
import {
  z,
  ZodBoolean,
  ZodEnum,
  ZodNumber,
  ZodObject,
  ZodOptional,
  ZodString,
} from 'zod';

const usersTableSchema = z.object({
  id: z.string(),
  name: z.string(),
  age: z.number(),
  enum: z.enum(['one', 'two', 'three']),

  // type: z.union([z.literal('admin'), z.literal('member')]),
  // nested: z.object({
  //   id: z.number(),
  // }),
});

const notesTableSchema = z.object({
  id: z.string(),
  userId: z.string(),
  count: z.number(),
  text: z.string().optional(),
});

type ZodCells =
  | ZodString
  | ZodBoolean
  | ZodNumber
  | ZodEnum<[string, ...string[]]>;

type OptionalZodCells = ZodCells | ZodOptional<ZodCells>;

type ZodTable = ZodObject<Record<string, OptionalZodCells>>;

type TableOptions<T extends Record<string, unknown>> = {
  keyBy: [keyof T, ...Array<keyof T>];
};

type Thing<
  T extends Record<string, unknown> = {},
  K extends keyof T = never
> = {
  table: T;
  options: {
    keyBy: K;
  };
};

type NewSchema = Record<string, Thing>;

class TestBuilderWithIds<TSchema extends NewSchema = {}> {
  addTable<
    TName extends string,
    TTable extends ZodTable,
    TOptions extends TableOptions<z.infer<TTable>>
  >(
    _name: TName,
    _table: TTable,
    _options: TOptions
  ): TestBuilderWithIds<
    TSchema &
      Record<
        TName,
        {
          table: z.infer<TTable>;
          options: { keyBy: TOptions['keyBy'][number] };
        }
      >
  > {
    return this;
  }

  identify<TTableName extends keyof TSchema>(
    _tableName: TTableName,
    _opts: Pick<
      TSchema[TTableName]['table'],
      TSchema[TTableName]['options']['keyBy']
    >
  ) {
    return 'asdf';
  }
}

type NotesRow = z.infer<typeof notesTableSchema>;
type Id = Pick<NotesRow, 'id' | 'count'>;

const test = new TestBuilderWithIds().addTable('notes', notesTableSchema, {
  keyBy: ['id', 'count'],
});

const testing = test.identify('notes', {
  count: 1,
  id: '123',
});

export class ZodSchemaBuilder<
  TBSchema extends TinyBaseSchema = {},
  TRelationshipNames extends string = never,
  TRelationships extends Relationships<TBSchema> = {},
  TKeyValueSchema extends Table = {}
> {
  private readonly relationshipDefinitions: RelationshipDefinition[] = [];

  addTable<TName extends string, TSchema extends ZodTable>(
    _name: TName,
    _schema: TSchema,
    _keys?: Array<keyof z.infer<TSchema>>
  ): ZodSchemaBuilder<
    Prettify<TBSchema & Record<TName, z.infer<TSchema>>>,
    TRelationshipNames,
    TRelationships,
    TKeyValueSchema
  > {
    return this;
  }

  addValue<TName extends string, TValueSchemaThing extends OptionalZodCells>(
    _name: TName,
    _valueSchema: TValueSchemaThing
  ): ZodSchemaBuilder<
    TBSchema,
    TRelationshipNames,
    TRelationships,
    Prettify<TKeyValueSchema & Record<TName, z.infer<TValueSchemaThing>>>
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
  .addTable('users', usersTableSchema, ['name'])
  .addTable('notes', notesTableSchema)
  .addValue('type', z.number().optional())
  .addValue(
    'multi',
    z.enum(['jesse', 'mike', 'deep', 'rodrigo', 'vanya']).optional()
  );

type TablesShape = TablesSchema<typeof b>;
type KeyValuesShape = KeyValuesSchema<typeof b>;
