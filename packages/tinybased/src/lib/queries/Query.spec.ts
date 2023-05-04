import { SchemaBuilder } from '../SchemaBuilder';
import { TableBuilder } from '../TableBuilder';

const sb = new SchemaBuilder()
  .addTable(new TableBuilder('users').add('id', 'string').add('name', 'string'))
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
  .defineRelationship('noteTagNotes', 'noteTags', 'notes', 'noteId')
  .defineRelationship('noteTagTags', 'noteTags', 'tags', 'tagId')
  .defineHydrators({
    users: async () => [
      {
        id: 'user1',
        name: 'Jesse',
      },
      {
        id: 'user2',
        name: 'Christyn',
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
});
