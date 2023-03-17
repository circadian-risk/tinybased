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

// db.queries.setQueryDefinition(
//   'manyToMany',
//   'noteTags',
//   ({ where, join, select }) => {
//     join('notes', 'noteId');
//     join('tags', 'tagId');
//     where('notes', 'userId', 'user1');
//     select('tags', 'name');
//   }
// );
//
// const answeredQuestionQuery = useMemo(() => {
//   return based.queries.setQueryDefinition(
//     `location_${locationId}_answered`,
//     'assessment_answers',
//     ({ select, where, join, group }) => {
//       select('assessment_item_id');
//       select('response');
//       join('assessment_items', 'assessment_item_id');
//       where('assessment_items', 'node_id', locationId);
//       group('assessment_item_id', 'count').as('total');
//       group('response', (cells) => cells.filter(Boolean).length).as('answered');
//     }
//   );
// }, [based.queries, locationId]);
describe('QueryBuilder', () => {
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

    const rawQuery = db.queries.setQueryDefinition(
      'aggs',
      'notes',
      ({ where, group, select }) => {
        select('userId');
        select('isDraft');
        // select('count');
        // select('draftCount');
        // where('userId', 'user1');
        group('userId', 'count').as('total');
        group('isDraft', (cells) => cells.filter(Boolean).length).as(
          'draftCount'
        );
        // group('response', cells => cells.filter(Boolean).length).as('answered');
      }
    );

    console.log(db.queries.getResultTable('aggs'));

    // const qb = db.query('notes').select('userId').group('userId').build();
    const qb = db
      .query('notes')
      .select('userId')
      .select('isDraft')
      .group('userId', 'count')
      .groupUsing(
        'isDraft',
        (cells) => cells.filter(Boolean).length,
        'draftCount'
      )
      .build();

    const result = qb.getResultTable();
    console.log(result);
  });
});
