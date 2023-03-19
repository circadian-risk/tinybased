import {
  makeTinyBasedTestFixture,
  NOTE_2,
  NOTE_ID,
  NOTE_ID_2,
  NOTE_ID_3,
  USER_ID_1,
  USER_ID_2,
  USER_ID_3,
} from '../fixture/database';
import {
  makeTinybasedHooks,
  useSimpleQueryResultIds,
  useSimpleQueryResultTable,
  TinyBasedReactHooks,
  useSimpleQuerySortedResultIds,
  useSimpleAggregateResult,
} from './tinybased-react';

import { renderHook, act } from '@testing-library/react-hooks';

describe('Tinybased React', () => {
  let based: Awaited<ReturnType<typeof makeTinyBasedTestFixture>>;

  let hooks: TinyBasedReactHooks<typeof based>;
  beforeEach(async () => {
    based = await makeTinyBasedTestFixture();
    hooks = makeTinybasedHooks(based);
  });
  describe('makeHooks', () => {
    it('useCell', () => {
      const { result } = renderHook(() =>
        hooks.useCell('users', 'user2', 'name')
      );
      expect(result.current).toEqual('Bob');

      act(() => {
        based.setCell('users', 'user2', 'name', 'Bob Ross');
      });

      expect(result.current).toEqual('Bob Ross');
    });

    it('useRow', () => {
      const { result } = renderHook(() => hooks.useRow('users', 'user1'));
      expect(result.current).toEqual({
        id: 'user1',
        name: 'Jesse',
        age: 33,
        isAdmin: true,
      });

      based.setCell('users', 'user1', 'name', 'Jesse Carter');

      expect(result.current).toEqual({
        id: 'user1',
        name: 'Jesse Carter',
        age: 33,
        isAdmin: true,
      });
    });

    it('useRowIds', () => {
      const { result } = renderHook(() => hooks.useRowIds('users'));
      expect(result.current).toEqual([USER_ID_1, USER_ID_2]);

      const USER_ID_3 = 'user3';
      based.setRow('users', USER_ID_3, {
        age: 100,
        isAdmin: false,
        name: 'Zach',
        id: USER_ID_3,
      });

      expect(result.current).toEqual([USER_ID_1, USER_ID_2, USER_ID_3]);
    });

    it('useSortedRowIds', () => {
      const { result } = renderHook(() =>
        hooks.useSortedRowIds('users', 'age', { limit: 2 })
      );

      expect(result.current).toEqual([USER_ID_1, USER_ID_2]);

      const USER_ID_3 = 'user3';

      // Insert a new row that has a younger age than any of the previous rows
      based.setRow('users', USER_ID_3, {
        age: 2,
        isAdmin: false,
        name: 'Zach',
        id: USER_ID_3,
      });

      expect(result.current).toEqual([USER_ID_3, USER_ID_1]);
    });

    it('useLocalRowIds', () => {
      const { result } = renderHook(() =>
        hooks.useLocalRowIds('userNotes', USER_ID_1)
      );

      const expectedResults = based
        .simpleQuery('notes')
        .where('userId', USER_ID_1)
        .select('id')
        .build()
        .getResultRowIds();

      expect(result.current).toEqual(expectedResults);
    });

    it('useRemoteRowId', () => {
      const { result } = renderHook(() =>
        hooks.useRemoteRowId('userNotes', NOTE_ID)
      );

      expect(result.current).toEqual(based.getCell('notes', NOTE_ID, 'userId'));
    });

    describe('queries', () => {
      it('result table', () => {
        const { result } = renderHook(() =>
          hooks.useQueryResult(
            based.query('notes').select('text').where('userId', USER_ID_1)
          )
        );

        expect(result.current).toEqual({
          noteId1: { text: 'Hello world' },
          noteId2: { text: 'TinyBased' },
        });

        based.deleteRow('notes', NOTE_ID_2);

        expect(result.current).toEqual({
          noteId1: { text: 'Hello world' },
        });
      });

      it('result ids', () => {
        const { result } = renderHook(() =>
          hooks.useQueryResultIds(
            based.query('notes').where('userId', USER_ID_1).select('text')
          )
        );

        expect(result.current).toEqual([NOTE_ID, NOTE_ID_2]);

        based.deleteRow('notes', NOTE_ID_2);

        expect(result.current).toEqual([NOTE_ID]);
      });

      it('sorted result ids', () => {
        const { result } = renderHook(() =>
          hooks.useQuerySortedResultIds(
            based.query('users').select('name'),
            'name'
          )
        );

        expect(result.current).toEqual([USER_ID_2, USER_ID_1]);

        based.setRow('users', USER_ID_3, {
          name: 'Xavier',
          age: 100,
          id: USER_ID_3,
          isAdmin: true,
        });

        expect(result.current).toEqual([USER_ID_2, USER_ID_1, USER_ID_3]);
      });
    });
  });

  describe('queries', () => {
    describe('simple queries', () => {
      it('handles result row ids', () => {
        const query = based
          .simpleQuery('notes')
          .select('text')
          .where('userId', 'user1')
          .build();

        const { result } = renderHook(() => useSimpleQueryResultIds(query));
        expect(result.current).toEqual(['noteId1', 'noteId2']);
      });

      it('can sort query results', async () => {
        const sortedBased = await makeTinyBasedTestFixture();
        const query = sortedBased
          .simpleQuery('users')
          .select('name')
          .select('age')
          .build();

        const { result: result1 } = renderHook(() =>
          useSimpleQuerySortedResultIds(query, 'name')
        );

        expect(result1.current).toEqual([USER_ID_2, USER_ID_1]);

        const { result: result2 } = renderHook(() =>
          useSimpleQuerySortedResultIds(query, 'age')
        );

        expect(result2.current).toEqual([USER_ID_1, USER_ID_2]);

        const USER_ID_3 = 'user3';
        sortedBased.setRow('users', USER_ID_3, {
          age: 100,
          isAdmin: false,
          name: 'Zach',
          id: USER_ID_3,
        });

        expect(result2.current).toEqual([USER_ID_1, USER_ID_2, USER_ID_3]);
      });

      it('handles result table', () => {
        const query = based
          .simpleQuery('notes')
          .select('text')
          .where('userId', 'user1')
          .build();

        const { result } = renderHook(() => useSimpleQueryResultTable(query));

        expect(result.current).toEqual({
          noteId1: { text: 'Hello world' },
          noteId2: { text: 'TinyBased' },
        });

        based.setCell('notes', 'noteId1', 'text', 'Hello TinyBased');

        expect(result.current).toEqual({
          noteId1: { text: 'Hello TinyBased' },
          noteId2: { text: 'TinyBased' },
        });
      });
    });
    describe('simple aggregation queries', () => {
      it('handles the results of a simple aggregation query', () => {
        const query = based
          .simpleQuery('notes')
          .where('userId', 'user1')
          .select('userId')
          .aggregate('userId', 'count');

        const { result } = renderHook(() => useSimpleAggregateResult(query));

        expect(result.current).toEqual({
          count: 2,
        });

        expectTypeOf(result.current).toEqualTypeOf<{ count?: number }>();

        based.setRow('notes', 'testNote', {
          id: 'testNote',
          userId: 'user1',
          text: 'some text',
        });

        expect(result.current).toEqual({
          count: 3,
        });
      });
    });
  });
});
