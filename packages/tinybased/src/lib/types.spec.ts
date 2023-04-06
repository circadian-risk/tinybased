import { usersTable } from '../fixture/database';
import { SchemaBuilder } from './SchemaBuilder';

type ExpectedUserType = {
  id: string;
  name: string;
  age: number;
  isAdmin: boolean;
};

it('should parse table schema from builder', async () => {
  const baseBuilder = await new SchemaBuilder().addTable(usersTable).build();

  const record = baseBuilder.getRow('users', '1');

  expectTypeOf(record).toMatchTypeOf<ExpectedUserType | undefined>();
});
