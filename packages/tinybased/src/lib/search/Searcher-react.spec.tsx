import { renderHook } from '@testing-library/react-hooks';
import {
  notesTable,
  NOTE_1,
  NOTE_2,
  NOTE_3,
  usersTable,
  USER_1,
  USER_2,
  USER_3,
  USER_4,
  USER_5,
} from '../../fixture/database';
import { waitAMoment } from '../../testing/utils';
import { SchemaBuilder } from '../SchemaBuilder';
import { DeepPrettify, InferSchema } from '../types';
import { connectTinybasedSearcher } from './tinybasedSearcher';

const schemaBuilder = new SchemaBuilder()
  .addTable(usersTable)
  .addTable(notesTable)
  .defineHydrators({
    users: () => Promise.resolve([USER_1, USER_2, USER_3, USER_4, USER_5]),
    notes: () => Promise.resolve([NOTE_1, NOTE_2, NOTE_3]),
  });

type Schema = DeepPrettify<InferSchema<typeof schemaBuilder>>;

describe('Searcher in react', () => {
  let tb!: Awaited<ReturnType<(typeof schemaBuilder)['build']>>;
  let builtSearch!: Awaited<
    ReturnType<typeof connectTinybasedSearcher<Schema, 'users' | 'notes'>>
  >;
  let useSearch!: (typeof builtSearch)['useSearch'];

  beforeEach(async () => {
    tb = await schemaBuilder.build();
    builtSearch = await connectTinybasedSearcher(tb, ['users', 'notes']);
    useSearch = builtSearch.useSearch;
  });

  describe('useSearch', () => {
    it('is reactive to the underlying data store', async () => {
      const { result } = renderHook(() =>
        useSearch('users', {
          term: USER_1.name,
        })
      );

      expect(result.current).toBeUndefined();

      await waitAMoment();

      expect(result.current).toBeDefined();
      expect(result.current?.count).toEqual(4);

      tb.deleteRow('users', USER_1.id);

      await waitAMoment();

      expect(result.current).toBeDefined();
      expect(result.current?.count).toEqual(3);

      tb.setRow('users', USER_1.id, USER_1);

      await waitAMoment();

      expect(result.current).toBeDefined();
      expect(result.current?.count).toEqual(4);
    });

    it('can perform advanced filters', async () => {
      const { result: initialResult } = renderHook(() =>
        useSearch('users', {
          term: 'Jesse',
          where: {
            isAdmin: true,
            age: {
              between: [30, 40],
            },
          },
        })
      );

      expect(initialResult.current).toBeUndefined();

      await waitAMoment();

      expect(initialResult.current).toBeDefined();
      expect(initialResult.current?.count).toEqual(1);

      // correct age range and isAdmin
      tb.setRow('users', USER_5.id, {
        ...USER_5,
        age: 35,
        isAdmin: true,
      });

      await waitAMoment();

      expect(initialResult.current).toBeDefined();
      expect(initialResult.current?.count).toEqual(2);

      // outside of age range
      tb.setRow('users', 'user-6', {
        ...USER_1,
        id: 'user-6',
        isAdmin: true,
        age: 45,
      });
      await waitAMoment();

      expect(initialResult.current).toBeDefined();
      expect(initialResult.current?.count).toEqual(2);
    });
  });
});
