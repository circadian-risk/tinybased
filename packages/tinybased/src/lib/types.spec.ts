import { SchemaBuilder } from './SchemaBuilder';
import { ParseTableSchema } from './types';

const ExampleSchema = {
  id: String,
  name: String,
  age: Number,
  isAdmin: Boolean,
};

type ExpectedSchemaType = {
  id: string;
  name: string;
  age: number;
  isAdmin: boolean;
};

it('should parse table schema from type utils', async () => {
  const record = {} as ParseTableSchema<typeof ExampleSchema>;

  expectTypeOf(record).toMatchTypeOf<ExpectedSchemaType>();
});

it('should parse table schema from builder', async () => {
  const baseBuilder = await new SchemaBuilder()
    .defineTable('example', ExampleSchema)
    .build();

  const record = baseBuilder.getRow('example', '1');

  expectTypeOf(record).toMatchTypeOf<ExpectedSchemaType>();
});
