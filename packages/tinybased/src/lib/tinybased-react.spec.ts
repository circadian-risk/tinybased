import {
  makeTinyBasedTestFixture,
  NOTE_ID,
  NOTE_ID_2,
  USER_ID_1,
  USER_ID_2,
  USER_ID_3,
} from '../fixture/database';
import { makeTinybasedHooks, TinyBasedReactHooks } from './tinybased-react';

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
        .query('notes')
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

      it('aggregations', () => {
        const { result } = renderHook(() =>
          hooks.useQueryResult(
            based
              .query('notes')
              .select('userId')
              .group('userId', 'count', 'total')
          )
        );

        const agg = result.current['0'];

        expectTypeOf(agg).toMatchTypeOf<{
          total: number;
        }>();

        expect(agg.total).toEqual(3);
      });
    });
  });
});
