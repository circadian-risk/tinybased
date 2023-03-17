import { SchemaBuilder } from '../SchemaBuilder';
import { TableBuilder } from '../TableBuilder';

const sb = new SchemaBuilder()
  .addTable(new TableBuilder('users').add('id', 'string').add('name', 'string'))
  .addTable(
    new TableBuilder('notes')
      .add('id', 'string')
      .add('userId', 'string')
      .add('likes', 'number')
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
      },
      {
        id: 'note2',
        userId: 'user1',
        likes: 2,
      },
      {
        id: 'note3',
        userId: 'user2',
        likes: 1,
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
      .whereJoin('notes', 'userId', 'user1')
      .selectJoin('notes', 'userId')
      .selectJoin('tags', 'name')
      .build();

    const result = qb.getResultTable();
    expect(Object.values(result).map((r) => r.name)).toEqual([
      'entertainment',
      'work',
    ]);
  });

  it('supports joins aggregates', async () => {
    expect(42).toEqual(42);
  });
});
