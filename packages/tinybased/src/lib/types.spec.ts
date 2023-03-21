import { usersTable } from '../fixture/database';
import { SchemaBuilder } from './SchemaBuilder';
import { TableBuilder } from './TableBuilder';

type ExpectedUserType = {
  id: string;
  name: string;
  age: number;
  isAdmin: boolean;
};

it('should parse table schema from builder', async () => {
  const baseBuilder = await new SchemaBuilder().addTable(usersTable).build();

  const record = baseBuilder.getRow('users', '1');

  expectTypeOf(record).toMatchTypeOf<ExpectedUserType>();
});

enum StringEnum {
  A = 'A',
  B = 'B',
}

it('should allow to specify custom type using generics', async () => {
  const table = new TableBuilder('testTable')
    .add('id', 'string')
    .add<'type', 'string', 'typeA' | 'typeB'>('type', 'string')
    .add<'enum', 'string', StringEnum>('enum', 'string')
    .addOptional<'typeOptional', 'string', 'typeA' | 'typeB'>(
      'typeOptional',
      'string'
    )
    .addOptional<'enumOptional', 'string', StringEnum>('enumOptional', 'string')
    // @ts-expect-error Type 'StringEnum' does not satisfy the constraint 'number'
    .add<'enum', 'number', StringEnum>('numberEnum', 'number')
    // @ts-expect-error Type 'StringEnum' does not satisfy the constraint 'number'
    .addOptional<'enum', 'number', StringEnum>('numberOptional', 'number');

  const baseBuilder = await new SchemaBuilder().addTable(table).build();

  const typeCell = baseBuilder.getCell('testTable', '1', 'type');
  const enumCell = baseBuilder.getCell('testTable', '1', 'enum');
  const typeOptionalCell = baseBuilder.getCell(
    'testTable',
    '1',
    'typeOptional'
  );
  const enumOptionalCell = baseBuilder.getCell(
    'testTable',
    '1',
    'enumOptional'
  );

  expectTypeOf(typeCell).toMatchTypeOf<'typeA' | 'typeB'>();
  expectTypeOf(enumCell).toMatchTypeOf<StringEnum>();
  expectTypeOf(typeOptionalCell).toMatchTypeOf<'typeA' | 'typeB' | undefined>();
  expectTypeOf(enumOptionalCell).toMatchTypeOf<StringEnum | undefined>();
});
