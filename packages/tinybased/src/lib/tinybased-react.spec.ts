import { tinyBasedSample } from '../fixture/database';
import { useSimpleQueryResultIds } from './tinybased-react';

import { renderHook, act } from '@testing-library/react-hooks';

describe('Tinybased React', () => {
  describe('queries', () => {
    it('handles simple queries', () => {
      const query = tinyBasedSample
        .simpleQuery('notes')
        .select('text')
        .where('userId', 'user1')
        .build();

      const { result } = renderHook(() => useSimpleQueryResultIds(query));

      expect(result.current).toEqual({
        noteId1: { text: 'Hello world' },
        noteId2: { text: 'TinyBased' },
      });

      tinyBasedSample.setCell('notes', 'noteId1', 'text', 'Hello TinyBased');

      expect(result.current).toEqual({
        noteId1: { text: 'Hello TinyBased' },
        noteId2: { text: 'TinyBased' },
      });
    });
  });
});
