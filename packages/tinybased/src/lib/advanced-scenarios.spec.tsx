import { SchemaBuilder } from './SchemaBuilder';
import { TableBuilder } from './TableBuilder';

const schemaBuilder = new SchemaBuilder()
  .addTable(new TableBuilder('users').add('id', 'string').add('name', 'string'))
  .addTable(
    new TableBuilder('notes').add('id', 'string').add('userId', 'string')
  )
  .addTable(new TableBuilder('tags').add('id', 'string').add('name', 'string'))
  .addTable(
    new TableBuilder('noteTags')
      .add('noteId', 'string')
      .add('tagId', 'string')
      .keyBy(['noteId', 'tagId'])
  )
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
      },
      {
        id: 'note2',
        userId: 'user1',
      },
      {
        id: 'note3',
        userId: 'user2',
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

describe('advanced scenarios', () => {
  describe('simulated many to many', () => {
    it('can be accomplish many to many joins starting from composite table', async () => {
      const db = await schemaBuilder.build();

      // Construct a query that will allow us to find all the tags that a users
      // has created notes for
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

    // it('does many to many with multiple typesafe steps using a react hooks', async () => {
    //   const db = await schemaBuilder.build();
    //   const hook = () => {
    //     const query = useMemo(() => db.simpleQuery('noteTags').where(''), [])
    //   }
    // });

    // TODO it does not seem possible to resolve this starting from any other
    // table other than the one that contains the composite key (join table)
    it('can accomplish many to many starting at leaf table', async () => {
      const db = await schemaBuilder.build();

      const queryId = 'manyToMany';
      db.queries.setQueryDefinition(queryId, 'notes', ({ join, select }) => {
        join('users', 'userId');
        select('users', 'name');
      });
      // const result = db.queries.getResultTable(queryId);
    });
  });
});
