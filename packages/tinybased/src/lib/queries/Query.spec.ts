import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SchemaBuilder } from '../SchemaBuilder';
import { TableBuilder } from '../TableBuilder';
import { makeTinybasedHooks } from '../tinybased-react';
import { renderHook } from '@testing-library/react-hooks';
import { waitAMoment } from '../../testing/utils';
import { createQueries } from 'tinybase/queries';
import { useResultTable } from 'tinybase/cjs/ui-react';

const sb = new SchemaBuilder()
  .addTable(
    new TableBuilder('users')
      .add('id', 'string')
      .add('name', 'string')
      .addOptional('permissionId', 'string')
  )
  .addTable(
    new TableBuilder('user_permission')
      .add('id', 'string')
      .add('type', 'string')
      .add('groupId', 'string')
  )
  .addTable(
    new TableBuilder('permission_groups')
      .add('id', 'string')
      .add('name', 'string')
  )
  .addTable(
    new TableBuilder('notes')
      .add('id', 'string')
      .add('userId', 'string')
      .add('likes', 'number')
      .addOptional('isDraft', 'boolean')
  )
  .addTable(new TableBuilder('tags').add('id', 'string').add('name', 'string'))
  .addTable(
    new TableBuilder('noteTags')
      .add('noteId', 'string')
      .add('tagId', 'string')
      .keyBy(['noteId', 'tagId'])
  )
  .defineRelationship('userNotes', 'notes', 'users', 'userId')
  .defineRelationship(
    'userPermission',
    'users',
    'user_permission',
    'permissionId'
  )
  .defineRelationship(
    'groupPermission',
    'user_permission',
    'permission_groups',
    'groupId'
  )
  .defineRelationship('noteTagNotes', 'noteTags', 'notes', 'noteId')
  .defineRelationship('noteTagTags', 'noteTags', 'tags', 'tagId')
  .defineHydrators({
    permission_groups: async () => [
      {
        id: 'group1',
        name: 'admin-group',
      },
      {
        id: 'group2',
        name: 'user-group',
      },
    ],
    user_permission: async () => [
      {
        id: 'permission1',
        type: 'admin',
        groupId: 'group1',
      },
      {
        id: 'permission2',
        type: 'user',
        groupId: 'group2',
      },
    ],
    users: async () => [
      {
        id: 'user1',
        name: 'Jesse',
        permissionId: 'permission1',
      },
      {
        id: 'user2',
        name: 'Christyn',
        permissionId: 'permission2',
      },
    ],
    notes: async () => [
      {
        id: 'note1',
        userId: 'user1',
        likes: 4,
        isDraft: true,
      },
      {
        id: 'note2',
        userId: 'user1',
        likes: 2,
        isDraft: false,
      },
      {
        id: 'note3',
        userId: 'user2',
        likes: 1,
        isDraft: false,
      },
    ],
    noteTags: async () => [
      {
        noteId: 'note1',
        tagId: 'tag1',
      },
      {
        noteId: 'note2',
        tagId: 'tag2',
      },
      {
        noteId: 'note3',
        tagId: 'tag3',
      },
    ],
    tags: async () => [
      {
        id: 'tag1',
        name: 'entertainment',
      },
      {
        id: 'tag2',
        name: 'work',
      },
      {
        id: 'tag3',
        name: 'sports',
      },
    ],
  });

describe('QueryBuilder', () => {
  it('works with raw queries', async () => {
    const db = await sb.build();

    db.queries.setQueryDefinition(
      'manyToMany',
      'noteTags',
      ({ where, join, select }) => {
        join('notes', 'noteId');
        join('tags', 'tagId');
        where('notes', 'userId', 'user1');
        select('tags', 'name');
      }
    );

    const result = db.queries.getResultTable('manyToMany');
    const tagNames = Object.values(result).map((v) => v['name']);
    expect(tagNames).toEqual(['entertainment', 'work']);
  });

  it('supports typesafe joins', async () => {
    const db = await sb.build();

    const qb = db
      .query('noteTags')
      .join('noteTagNotes')
      .join('noteTagTags')
      .whereFrom('notes', 'userId', 'user1')
      .selectFrom('notes', 'userId')
      .selectFrom('tags', 'name')
      .build();

    const result = qb.getResultTable();
    expect(Object.values(result).map((r) => r.name)).toEqual([
      'entertainment',
      'work',
    ]);
  });

  it('supports local and joined field selection', async () => {
    const db = await sb.build();

    const qb = db
      .query('noteTags')
      .select('tagId')
      .join('noteTagNotes')
      .join('noteTagTags')
      .whereFrom('notes', 'userId', 'user1')
      .selectFrom('notes', 'userId')
      .selectFrom('tags', 'name')
      .build();

    const result = qb.getResultTable();
    expect(result).toEqual({
      'note1::tag1': {
        tagId: 'tag1',
        userId: 'user1',
        name: 'entertainment',
      },
      'note2::tag2': {
        tagId: 'tag2',
        userId: 'user1',
        name: 'work',
      },
    });
  });

  it('supports local and joined field selection with aliases', async () => {
    const db = await sb.build();

    const qb = db
      .query('noteTags')
      .selectAs('tagId', 'theTagId')
      .join('noteTagNotes')
      .join('noteTagTags')
      .whereFrom('notes', 'userId', 'user1')
      .selectFrom('notes', 'userId')
      .selectFromAs('tags', 'name', 'tagName')
      .build();

    const result = qb.getResultTable();
    type ResultRow = (typeof result)[string];

    expectTypeOf<ResultRow>().toMatchTypeOf<{
      theTagId: string;
      userId: string;
      tagName: string;
    }>();

    expect(result).toEqual({
      'note1::tag1': {
        theTagId: 'tag1',
        userId: 'user1',
        tagName: 'entertainment',
      },
      'note2::tag2': {
        theTagId: 'tag2',
        userId: 'user1',
        tagName: 'work',
      },
    });
  });

  it('supports local and intermediate joined field selection', async () => {
    const db = await sb.build();

    const qb = db
      .query('notes')
      .select('id')
      .join('userNotes')
      .selectFrom('users', 'name')
      .joinFrom('userNotes', 'userPermission')
      .selectFrom('user_permission', 'type')
      .joinFrom('userPermission', 'groupPermission')
      .selectFromAs('permission_groups', 'name', 'groupName')
      .build();

    const result = qb.getResultTable();
    expect(result).toEqual({
      note1: {
        id: 'note1',
        name: 'Jesse',
        type: 'admin',
        groupName: 'admin-group',
      },
      note2: {
        id: 'note2',
        name: 'Jesse',
        type: 'admin',
        groupName: 'admin-group',
      },
      note3: {
        id: 'note3',
        name: 'Christyn',
        type: 'user',
        groupName: 'user-group',
      },
    });
  });

  it('supports aggregations', async () => {
    const db = await sb.build();

    const qb = db
      .query('notes')
      .select('userId')
      .select('isDraft')
      .group('userId', 'count', 'total')
      .groupUsing(
        'isDraft',
        (cells) => cells.filter(Boolean).length,
        'draftCount'
      )
      .build();

    const result = qb.getResultTable();

    expectTypeOf<(typeof result)[string]>().toMatchTypeOf<{
      total: number;
      draftCount: number;
    }>();

    expect(result['0']).toEqual({ total: 3, draftCount: 1 });
  });

  it('can query for undefined cells', async () => {
    const db = await sb.build();
    db.deleteCell('notes', 'note3', 'isDraft');

    const rowIds = db
      .query('notes')
      .where('isDraft', undefined)
      .select('id')
      .build()
      .getResultRowIds();

    expect(rowIds).toEqual(['note3']);
  });

  it('supports custom logic for where clause', async () => {
    const db = await sb.build();

    const qbForCustomWhereOnStartTable = db
      .query('notes')
      .select('id')
      .select('isDraft')
      .whereUsing((getCell) => getCell('isDraft') === true)
      .build();

    expect(qbForCustomWhereOnStartTable.getResultTable()).toEqual({
      note1: {
        id: 'note1',
        isDraft: true,
      },
    });

    const qbForCustomWhereOnJoinedTable = db
      .query('notes')
      .select('id')
      .select('isDraft')
      .join('userNotes')
      .whereUsing((getCellFrom) => getCellFrom('users', 'name') === 'Jesse')
      .build();

    expect(qbForCustomWhereOnJoinedTable.getResultTable()).toEqual({
      note1: {
        id: 'note1',
        isDraft: true,
      },
      note2: {
        id: 'note2',
        isDraft: false,
      },
    });
  });

  it('generates unique query ids when using whereUsing', async () => {
    const db = await sb.build();
    const qb1 = db
      .query('notes')
      .select('id')
      .whereUsing((getCell) => getCell('isDraft') === true)
      .build();

    const qb2 = db
      .query('notes')
      .select('id')
      .whereUsing((getCell) => getCell('isDraft') === false)
      .build();

    expect(qb1.queryId).not.toEqual(qb2.queryId);
    expect(qb1.queryId).toEqual(
      expect.stringContaining(
        '-whereUsing-[(getCell)=>getCell("isDraft")===true]-'
      )
    );
    expect(qb2.queryId).toEqual(
      expect.stringContaining(
        '-whereUsing-[(getCell)=>getCell("isDraft")===false]-'
      )
    );
  });

  it('custom ids can be specified', async () => {
    const db = await sb.build();
    const qb = db
      .query('notes')
      .select('id')
      .whereUsing((getCell) => getCell('isDraft') === true)
      .identifyBy('my-custom-id')
      .build();

    expect(qb.queryId).toEqual('my-custom-id');
  });

  it('supports outside variables in custom where clause', async () => {
    const db = await sb.build();
    const hooks = makeTinybasedHooks(db);

    const useTestHook = () => {
      // const [isDraft, setIsDraft] = useState<boolean>(false);
      // const [noteIds, setNoteIds] = useState<string[]>(['note2', 'note3']);

      const noteIds = hooks.useQueryResultIds(
        db
          .query('notes')
          .select('id')
          .select('isDraft')
          .whereUsing((getCell) => getCell('isDraft') === false)
      );

      // const noteIds = useMemo(() => {
      //   console.log('isDraft', isDraft);
      //   return db
      //     .query('notes')
      //     .select('id')
      //     .select('isDraft')
      //     .whereUsing((getCell) => getCell('isDraft') === isDraft)
      //     .identifyBy(`noteIds-results-${isDraft}`)
      //     .build()
      //     .getResultRowIds();
      // }, [isDraft]);

      const getCell = useCallback(
        (getCell) => noteIds.includes(getCell('id')),
        [noteIds]
      );
      console.log('noteIds', noteIds);

      const rows = useMemo(() => {
        const result = db
          .query('notes')
          .select('id')
          .select('isDraft')
          .whereUsing((getCell) => {
            console.log('checking for id', getCell('id'), 'in', noteIds);
            return noteIds.includes(getCell('id'));
          })
          .identifyBy(`notes-results-${noteIds.join('-')}`)
          .build()
          .getResultTable();
        console.log('rows', result);
        return result;
      }, [getCell]);

      // const rows = useResultTable(query.queryId, query.queries);

      // console.log('notes rows', rows);

      // const legacyQuery = useMemo(
      //   () =>
      //     createQueries(db.store).setQueryDefinition(
      //       `notes-results-legacy-${noteIds.join('-')}`,
      //       'notes',
      //       ({ where, select }) => {
      //         where((getCell) =>
      //           noteIds.includes(getCell('id')?.toString() ?? '')
      //         );
      //         select('id');
      //         select('isDraft');
      //       }
      //     ),
      //   [noteIds]
      // );

      // const legacyRows = useResultTable(
      //   `notes-results-legacy-${noteIds.join('-')}`,
      //   legacyQuery
      // );

      // console.log('legacy rows', legacyRows);

      // console.log('----------------------------');

      const updateRows = () => {
        db.mergeRow('notes', 'note3', {
          isDraft: true,
        });
        // setNoteIds(['note2']);
        // setIsDraft(true);
      };

      return { rows, updateRows };
    };

    const output = renderHook(() => useTestHook());

    expect(output.result.current.rows).toEqual({
      note2: {
        id: 'note2',
        isDraft: false,
      },
      note3: {
        id: 'note3',
        isDraft: false,
      },
    });

    output.result.current.updateRows();

    await waitAMoment();

    expect(output.result.current.rows).toEqual({
      note2: {
        id: 'note2',
        isDraft: false,
      },
    });
  });

  describe('supports outside variables in custom where clause', () => {
    it.only('with other query result', async () => {
      const db = await sb.build();
      const hooks = makeTinybasedHooks(db);

      const useTestHook = () => {
        useEffect(() => {
          console.log('db.queries');
        }, [db.queries]);

        const noteIds = hooks.useQueryResultIds(
          db
            .query('notes')
            .select('id')
            .select('isDraft')
            .whereUsing((getCell) => getCell('isDraft') === false)
        );

        // const [latestNoteIds, setLatestNoteIds] = useState<string[]>(noteIds);

        // useEffect(() => {
        //   setLatestNoteIds(noteIds);
        // }, [noteIds]);

        // const rows = useMemo(() => {
        //   const result = db
        //     .query('notes')
        //     .select('id')
        //     .select('isDraft')
        //     .identifyBy(`notes-results-${latestNoteIds.join('-')}`)
        //     .build()
        //     .getResultTable();

        //   console.log('rows', result);
        //   return result;
        // }, [latestNoteIds]);

        // const hookQuery = useMemo(
        //   () =>
        //     db
        //       .query('notes')
        //       .select('id')
        //       .select('isDraft')
        //       .identifyBy(`hooks-notes-results-${noteIds.join('-')}`),
        //   [noteIds]
        // );

        const hookRows = hooks.useQueryResult(
          db
            .query('notes')
            .select('id')
            .select('isDraft')
            .whereUsing((getCell) => {
              console.log('checking for id', getCell('id'), 'in', noteIds);
              return noteIds.includes(getCell('id'));
            })
            .identifyBy(`hooks-notes-results-${noteIds.join('-')}`)
        );

        console.log('hook rows', hookRows);
        // const legacy = useResultTable(
        //   `notes-results-legacy-${noteIds.join('-')}`,
        //   createQueries(db.store).setQueryDefinition(
        //     `notes-results-legacy-${noteIds.join('-')}`,
        //     'notes',
        //     ({ select }) => {
        //       select('id');
        //       select('isDraft');
        //     }
        //   )
        // );

        // console.log('legacy rows', legacy);

        const updateRows = () => {
          db.mergeRow('notes', 'note3', {
            isDraft: true,
          });
        };

        return { rows: {}, updateRows };
      };

      const output = renderHook(() => useTestHook());

      // expect(output.result.current.rows).toEqual({
      //   note1: {
      //     id: 'note1',
      //     isDraft: true,
      //   },
      //   note2: {
      //     id: 'note2',
      //     isDraft: false,
      //   },
      //   note3: {
      //     id: 'note3',
      //     isDraft: false,
      //   },
      // });

      output.result.current.updateRows();

      await waitAMoment();

      // expect(output.result.current.rows).toEqual({
      //   note1: {
      //     id: 'note1',
      //     isDraft: true,
      //   },
      //   note2: {
      //     id: 'note2',
      //     isDraft: false,
      //   },
      //   note3: {
      //     id: 'note3',
      //     isDraft: true,
      //   },
      // });
    });

    it('with state hook', async () => {
      const db = await sb.build();

      const useTestHook = () => {
        const [noteIds, setNoteIds] = useState<string[]>(['note2', 'note3']);

        const rows = useMemo(() => {
          const result = db
            .query('notes')
            .select('id')
            .select('isDraft')
            .whereUsing((getCell) => {
              return noteIds.includes(getCell('id'));
            })
            .identifyBy(`notes-results-${noteIds.join('-')}`)
            .build()
            .getResultTable();
          return result;
        }, [noteIds]);

        const updateRows = () => {
          setNoteIds(['note2']);
        };

        return { rows, updateRows };
      };

      const output = renderHook(() => useTestHook());

      expect(output.result.current.rows).toEqual({
        note2: {
          id: 'note2',
          isDraft: false,
        },
        note3: {
          id: 'note3',
          isDraft: false,
        },
      });

      output.result.current.updateRows();

      await waitAMoment();

      expect(output.result.current.rows).toEqual({
        note2: {
          id: 'note2',
          isDraft: false,
        },
      });
    });

    it('with legacy query hook', async () => {
      const db = await sb.build();
      const hooks = makeTinybasedHooks(db);

      const useTestHook = () => {
        const noteIds = hooks.useQueryResultIds(
          db
            .query('notes')
            .select('id')
            .select('isDraft')
            .whereUsing((getCell) => getCell('isDraft') === false)
        );

        const query = useMemo(
          () =>
            createQueries(db.store).setQueryDefinition(
              `notes-results-legacy-${noteIds.join('-')}`,
              'notes',
              ({ where, select }) => {
                where((getCell) =>
                  noteIds.includes(getCell('id')?.toString() ?? '')
                );
                select('id');
                select('isDraft');
              }
            ),
          [noteIds]
        );

        const rows = useResultTable(
          `notes-results-legacy-${noteIds.join('-')}`,
          query
        );

        const updateRows = () => {
          db.mergeRow('notes', 'note3', {
            isDraft: true,
          });
        };

        return { rows, updateRows };
      };

      const output = renderHook(() => useTestHook());

      expect(output.result.current.rows).toEqual({
        note2: {
          id: 'note2',
          isDraft: false,
        },
        note3: {
          id: 'note3',
          isDraft: false,
        },
      });

      output.result.current.updateRows();

      await waitAMoment();

      expect(output.result.current.rows).toEqual({
        note2: {
          id: 'note2',
          isDraft: false,
        },
      });
    });
  });
});
