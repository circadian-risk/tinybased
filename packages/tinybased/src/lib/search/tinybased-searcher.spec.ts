import { connectTinybasedSearcher } from '.';
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
import { SearcherBuilder } from './SearcherBuilder';

const schemaBuilder = new SchemaBuilder()
  .addTable(usersTable)
  .addTable(notesTable)
  .defineHydrators({
    users: () => Promise.resolve([USER_1, USER_2]),
    notes: () => Promise.resolve([NOTE_1, NOTE_2, NOTE_3]),
  });

const searchBuilder = new SearcherBuilder()
  .addIndexedTable(usersTable)
  .addIndexedTable(notesTable);

const SCOOB = {
  age: 99,
  id: 'abc123',
  isAdmin: false,
  name: 'Scoob',
};

describe('Linking Searcher to a tinybased (hydration, row add/update/remove)', () => {
  let searcher!: Awaited<ReturnType<(typeof searchBuilder)['build']>>;
  let tb!: Awaited<ReturnType<(typeof schemaBuilder)['build']>>;

  beforeEach(async () => {
    tb = await schemaBuilder.build();

    const generated = await connectTinybasedSearcher(tb, ['users', 'notes']);
    searcher = generated.searcher;
  });

  it('immediately hydrates the search index for specified tables', async () => {
    // Index should be populated and return resultes from hydration
    const { hits: user1Hits } = await searcher.search('users', {
      term: USER_1.name,
    });
    expect(user1Hits[0].document).toEqual(USER_1);
  });

  it('inserts/updates to the underlying data store will update the search index', async () => {
    // row insert
    tb.setRow('users', SCOOB.id, SCOOB);

    await new Promise((resolve) => setTimeout(resolve, 10));

    const { hits: scoobHit } = await searcher.search('users', {
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

    const { count, hits: scoobEditHit } = await searcher.search('users', {
      term: SCOOB.name,
    });

    expect(scoobEditHit[0].document.age).toEqual(102);
    expect(count).toEqual(1);

    expect(scoobEditHit[0].document).toEqual(SCOOB_EDIT);
  });

  it('deletions are automatically removedc from the search index', async () => {
    // Assert that record is available for search
    const { count: beforeCount } = await searcher.search('users', {
      term: USER_1.name,
    });

    expect(beforeCount).toEqual(1);

    tb.deleteRow('users', USER_1.id);

    // Assert that record is removed
    const { count: afterCount } = await searcher.search('users', {
      term: USER_1.name,
    });

    expect(afterCount).toEqual(0);
  });
});
