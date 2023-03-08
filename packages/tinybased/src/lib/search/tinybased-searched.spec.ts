import {
  notesTable,
  NOTE_1,
  NOTE_2,
  NOTE_3,
  usersTable,
  USER_1,
  USER_2,
} from '../../fixture/database';
import { SchemaBuilder } from '../SchemaBuilder';
import { generateSearched, Searched } from '.';

const schemaBuilderTypeReference = () =>
  new SchemaBuilder()
    .addTable(usersTable)
    .addTable(notesTable)
    .defineHydrators({
      users: () => Promise.resolve([USER_1, USER_2]),
      notes: () => Promise.resolve([NOTE_1, NOTE_2, NOTE_3]),
    });

const searchedTypeReference = () =>
  new Searched().addIndexedTable(usersTable).addIndexedTable(notesTable);

const SCOOB = {
  age: 99,
  id: 'abc123',
  isAdmin: false,
  name: 'Scoob',
};

describe('Linking Searched to a tinybased (hydration, row add/update/remove)', () => {
  let schemaBuilder!: ReturnType<typeof schemaBuilderTypeReference>;
  let searched!: ReturnType<typeof searchedTypeReference>;
  let tb!: Awaited<ReturnType<(typeof schemaBuilder)['build']>>;

  beforeEach(async () => {
    schemaBuilder = schemaBuilderTypeReference();
    tb = await schemaBuilder.build();

    const generated = await generateSearched(tb, ['users', 'notes']);
    searched = generated.searched;
  });

  it('immediately hydrates the search index for specified tables', async () => {
    // Index should be populated and return resultes from hydration
    const { hits: user1Hits } = await searched.search('users', {
      term: USER_1.name,
    });
    expect(user1Hits[0].document).toEqual(USER_1);
  });

  it('inserts/updates to the underlying data store will update the search index', async () => {
    // row insert
    tb.setRow('users', SCOOB.id, SCOOB);

    await new Promise((resolve) => setTimeout(resolve, 10));

    const { hits: scoobHit } = await searched.search('users', {
      term: 'Scoob',
    });

    expect(scoobHit[0].document).toEqual(SCOOB);

    const SCOOB_EDIT = {
      ...SCOOB,
      age: 102,
    };

    // row update
    tb.setCell('users', SCOOB.id, 'age', 102);

    await new Promise((resolve) => setTimeout(resolve, 10));

    const { count, hits: scoobEditHit } = await searched.search('users', {
      term: SCOOB.name,
    });

    expect(scoobEditHit[0].document.age).toEqual(102);
    expect(count).toEqual(1);

    expect(scoobEditHit[0].document).toEqual(SCOOB_EDIT);
  });

  it('deletions are automatically removedc from the search index', async () => {
    // Assert that record is available for search
    const { count: beforeCount } = await searched.search('users', {
      term: USER_1.name,
    });

    expect(beforeCount).toEqual(1);

    tb.deleteRow('users', USER_1.id);

    // Assert that record is removed
    const { count: afterCount } = await searched.search('users', {
      term: USER_1.name,
    });

    expect(afterCount).toEqual(0);
  });
});
