import { notesTable, UserRow, usersTable } from '../../fixture/database';
import { Searcher } from './Searcher';
import { SearcherBuilder } from './SearcherBuilder';

const USER_1: UserRow = {
  id: 'abc123',
  age: 19,
  name: 'Mikey',
  isAdmin: true,
};
const USER_2: UserRow = {
  id: 'jadf123',
  age: 35,
  name: 'Jesse',
  isAdmin: false,
};
const USER_3: UserRow = {
  id: 'zzzz9999',
  age: 77,
  name: 'Jessa',
  isAdmin: false,
};
const USER_4: UserRow = {
  id: 'abbbccc1233123',
  age: 21,
  name: 'Deep',
  isAdmin: true,
};

const searchBuilder = new SearcherBuilder()
  .addIndexedTable(usersTable)
  .addIndexedTable(notesTable);

type SearcherInstance = Awaited<ReturnType<(typeof searchBuilder)['build']>>;

describe('Searcher', () => {
  describe('initialization', () => {
    it(`Throws if no tables are defined`, async () => {
      const searcher = new SearcherBuilder();
      await expect(searcher.build()).rejects.toThrow(
        SearcherBuilder.ERRORS.NO_TABLES_DEFINED
      );
    });

    it('Returns an initialized Searcher instance', async () => {
      const searcher = await searchBuilder.build();

      expect(searcher).toBeInstanceOf(Searcher);
    });
  });

  describe('operations', () => {
    let searcher!: SearcherInstance;

    beforeEach(async () => {
      searcher = await searchBuilder.build();
    });

    describe('insertion', () => {
      it('Can insert a single record', async () => {
        const res = await searcher.insert('users', USER_1);
        expect(res.id).toEqual(USER_1.id);

        const { hits } = await searcher.search('users', {
          term: 'Mikey',
        });
        expect(hits[0].document).toBe(USER_1);

        const { count } = await searcher.search('users', {
          term: 'Shaggy',
        });

        expect(count).toBe(0);
      });

      it('Can insert a batch of records', async () => {
        const batched = [USER_1, USER_2, USER_3];
        await searcher.insertBatch('users', batched);

        for (const u of batched) {
          const { hits } = await searcher.search('users', {
            term: u.name,
          });
          expect(hits[0].document).toBe(u);
        }
      });
    });
    describe('search', () => {
      beforeEach(async () => {
        const batched = [USER_1, USER_2, USER_3, USER_4];
        await searcher.insertBatch('users', batched);
      });
      it('Can fuzzy match by specifying "exact" as false', async () => {
        // Both 'Jesse' and 'Jessa' are present and should be inexact matches for 'Jess'
        const { count, hits } = await searcher.search('users', {
          term: 'Jess',
          exact: false,
        });
        expect(count).toBe(2);

        expect(hits).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ document: USER_2 }),
            expect.objectContaining({ document: USER_3 }),
          ])
        );
      });
      it('can use "where" to filter results with type-safety', async () => {
        const { hits, count } = await searcher.search('users', {
          term: 'Jess',
          where: {
            age: {
              lt: 77,
            },
            isAdmin: false,
          },
        });
        expect(count).toEqual(1);
        expect(hits[0].document).toEqual(USER_2);
      });
      it('can use "limit" to limit the number of results', async () => {
        const { count, hits } = await searcher.search('users', {
          term: 'Jess',
          limit: 1,
        });

        // count should list total number of matches, not the limit
        expect(count).toBe(2);
        // hits should reflect requested limit
        expect(hits.length).toEqual(1);
        expect(hits[0].document).toEqual(USER_2);
      });
    });
    describe('removal', () => {
      beforeEach(async () => {
        const batched = [USER_1, USER_2, USER_3, USER_4];
        await searcher.insertBatch('users', batched);
      });

      it('can remove items from the index', async () => {
        const { hits } = await searcher.search('users', { term: USER_4.name });
        expect(hits).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ document: USER_4 }),
          ])
        );

        expect(searcher.remove('users', USER_4.id)).resolves.toEqual(true);

        const { count } = await searcher.search('users', { term: USER_4.name });
        expect(count).toBe(0);
      });
    });
  });
});
