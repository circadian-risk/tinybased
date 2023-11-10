import { useState } from 'react';
import {
  makeTinyBasedTestFixture,
  NOTE_ID,
  NOTE_1,
  NOTE_2,
  NOTE_ID_2,
  USER_ID_1,
  USER_ID_2,
  USER_ID_3,
} from '../fixture/database';
import { makeTinybasedHooks, TinyBasedReactHooks } from './tinybased-react';

import { renderHook } from '@testing-library/react-hooks';
import { useResultRowIds, useResultTable } from 'tinybase/cjs/ui-react';
import { waitAMoment } from '../testing/utils';

describe('Tinybased React', () => {
  let based: Awaited<ReturnType<typeof makeTinyBasedTestFixture>>;
  let hooks: TinyBasedReactHooks<typeof based>;
  beforeEach(async () => {
    based = await makeTinyBasedTestFixture();
    hooks = makeTinybasedHooks(based);
  });
  describe('makeHooks', () => {
    it('useValue', () => {
      const { result } = renderHook(() => hooks.useValue('online'));
      expect(result.current).toEqual(undefined);

      based.setValue('online', true);

      expect(result.current).toEqual(true);

      based.setValue('online', false);

      expect(result.current).toEqual(false);

      based.deleteValue('online');
      expect(result.current).toBeUndefined();
    });

    describe('useCell', () => {
      it('name (static cell)', () => {
        const { result } = renderHook(() =>
          hooks.useCell('users', 'user2', 'name')
        );
        expect(result.current).toEqual('Bob');

        based.setCell('users', 'user2', 'name', 'Bob Ross');

        expect(result.current).toEqual('Bob Ross');
      });
      it('isAdult (computed)', () => {
        const { result } = renderHook(() =>
          hooks.useCell('users', 'user2', 'isAdult')
        );

        based.getRow('users', 'user2');
        expect(result.current).toEqual(true);

        based.setCell('users', 'user2', 'age', 16);

        expect(result.current).toEqual(false);
      });
    });

    it('useRow', () => {
      const { result } = renderHook(() => hooks.useRow('users', 'user1'));
      expect(result.current).toEqual({
        id: 'user1',
        name: 'Jesse',
        age: 33,
        isAdmin: true,
        isAdult: true,
      });

      based.setCell('users', 'user1', 'name', 'Jesse Carter');

      expect(result.current).toEqual({
        id: 'user1',
        name: 'Jesse Carter',
        age: 33,
        isAdmin: true,
        isAdult: true,
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
      it('mimics our problem using raw TB', async () => {
        const { result } = renderHook(() => {
          based.queries.setQueryDefinition(
            'ids',
            'notes',
            ({ select, where }) => {
              select('text');
              where('userId', USER_ID_1);
            }
          );

          const idsResult = useResultRowIds('ids', based.queries);

          const anotherQueryId = idsResult.join('-');
          based.queries.setQueryDefinition(
            anotherQueryId,
            'notes',
            ({ select, where }) => {
              select('text');
              where((getCell) =>
                idsResult.includes(getCell('id')?.toString() ?? '')
              );
            }
          );

          const anotherResult = useResultTable(anotherQueryId, based.queries);

          return { idsResult, anotherResult };
        });

        console.log(result.current);
        based.setRow('notes', 'new note', {
          id: 'new note',
          text: 'testing',
          userId: USER_ID_1,
        });

        console.log(result.current);

        await waitAMoment();

        console.log(result.current);
      });

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
        const qb = based
          .query('notes')
          .where('userId', USER_ID_1)
          .select('text');
        const { result } = renderHook(() => hooks.useQueryResultIds(qb));

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

      it('dynamic condition, recomputing result by specified unique id', () => {
        const useTest = () => {
          const [noteTexts, setNoteText] = useState([NOTE_1.text]);
          const resultIds = hooks.useQueryResultIds(
            based
              .query('notes')
              .select('id')
              .whereUsing((getCell) => noteTexts.includes(getCell('text')))
              .identifyBy(noteTexts.join('-'))
          );

          return {
            setNoteText,
            resultIds,
          };
        };

        const { result } = renderHook(useTest);

        expect(result.current.resultIds).toEqual([NOTE_ID]);

        result.current.setNoteText([NOTE_2.text, NOTE_1.text]);

        expect(result.current.resultIds).toEqual([NOTE_ID, NOTE_ID_2]);
      });
    });
  });
});
