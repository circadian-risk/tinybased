import { makeTinyBasedTestFixture, Schema } from '../fixture/database';
import {
  makeTinybasedHooks,
  useSimpleQueryResultIds,
  useSimpleQueryResultTable,
  TinyBasedReactHooks,
} from './tinybased-react';

import { renderHook, act } from '@testing-library/react-hooks';

describe('Tinybased React', () => {
  let hooks: TinyBasedReactHooks<Schema>;
  let based: Awaited<ReturnType<typeof makeTinyBasedTestFixture>>;
  beforeAll(async () => {
    based = await makeTinyBasedTestFixture();
    hooks = makeTinybasedHooks(based);
  });
  describe('makeHooks', () => {
    test('useCell', () => {
      const { result } = renderHook(() =>
        hooks.useCell('users', 'user2', 'name')
      );
      expect(result.current).toEqual('Bob');

      act(() => {
        based.setCell('users', 'user2', 'name', 'Bob Ross');
      });

      expect(result.current).toEqual('Bob Ross');
    });

    test('useRow', () => {
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
  });
});
