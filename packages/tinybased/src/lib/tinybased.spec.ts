import { SchemaBuilder } from './SchemaBuilder';
import { Table } from './types';

const USER_ID_1 = 'user1';
const USER_ID_2 = 'user2';
const NOTE_ID = 'noteId1';

const userSchema = {
  id: String,
  name: String,
  age: Number,
  isAdmin: Boolean,
};

const noteSchema = {
  id: String,
  text: String,
  userId: String,
};

const exampleUser = {
  id: USER_ID_1,
  name: 'Jesse',
  age: 33,
  isAdmin: true,
};

const exampleNote = {
  id: NOTE_ID,
  text: 'Hello world',
  userId: USER_ID_1,
};

const baseBuilder = new SchemaBuilder().defineTable('users', userSchema);

describe('tinybased', () => {
  it('should handle type safe rows and cells', async () => {
    const based = await baseBuilder.build();
    based.setRow('users', '1', exampleUser);

    expect(based.getRow('users', '1')).toEqual(exampleUser);
    const age = based.getCell('users', '1', 'age');
    expect(age).toBe(33);

    based.deleteCell('users', '1', 'age');
    const age2 = based.getCell('users', '1', 'age');
    expect(age2).toBeUndefined();
  });

  it('should return sorted id by cell', async () => {
    const based = await baseBuilder.build();
    based.setRow('users', '2', {
      id: '2',
      name: 'Adam',
      age: 42,
      isAdmin: false,
    });

    based.setRow('users', '1', {
      id: '1',
      name: 'Bob',
      age: 33,
      isAdmin: true,
    });

    expect(based.getSortedRowIds('users', 'name')).toEqual(['2', '1']);
    expect(based.getSortedRowIds('users', 'age')).toEqual(['1', '2']);
    expect(
      based.getSortedRowIds('users', 'name', { descending: true })
    ).toEqual(['1', '2']);
    expect(based.getSortedRowIds('users', 'name', { limit: 1 })).toEqual(['2']);
    expect(based.getSortedRowIds('users', 'name', { offset: 1 })).toEqual([
      '1',
    ]);

    expectTypeOf(based.getSortedRowIds('users', 'name')).toEqualTypeOf<
      string[]
    >();
    expectTypeOf(based.getSortedRowIds).parameter(0).toEqualTypeOf<'users'>();
    expectTypeOf(based.getSortedRowIds)
      .parameter(1)
      .toEqualTypeOf<'name' | 'id' | 'age' | 'isAdmin'>();
  });

  // TODO: extract common setup boilerplate
  describe('queries', () => {
    it('handles simple queries', async () => {
      const based = await new SchemaBuilder()
        .defineTable('users', userSchema)
        .defineTable('notes', noteSchema)
        .build();

      const queryBuilder = based
        .simpleQuery('notes')
        .where('userId', USER_ID_1)
        .select('text')
        .select('userId');

      const query = queryBuilder.build();

      expect(query.queryId).toEqual(
        'notes-select-text_userId-where-userId,user1'
      );

      const NOTE_ID_2 = 'noteId2';

      based.setRow('users', USER_ID_1, exampleUser);
      based.setRow('notes', NOTE_ID, exampleNote);
      based.setRow('notes', NOTE_ID_2, {
        ...exampleNote,
        id: NOTE_ID_2,
        text: 'TinyBased',
      });

      based.setRow('users', USER_ID_2, {
        ...exampleUser,
        id: USER_ID_2,
        name: 'Bob',
      });

      based.setRow('notes', 'noteId3', {
        ...exampleNote,
        id: 'noteId3',
        userId: USER_ID_2,
        text: 'Hello Bob',
      });

      const queryRowIds = query.getResultRowIds();
      expect(queryRowIds).toEqual([NOTE_ID, NOTE_ID_2]);

      const queryTable = query.getResultTable();
      expect(queryTable).toEqual({
        [NOTE_ID]: { text: 'Hello world', userId: USER_ID_1 },
        [NOTE_ID_2]: { text: 'TinyBased', userId: USER_ID_1 },
      });
    });

    it('can sort query results', async () => {
      const based = await new SchemaBuilder()
        .defineTable('users', userSchema)
        .defineHydrators({
          users: () =>
            Promise.resolve([
              {
                id: '1',
                name: 'Adam',
                age: 42,
                isAdmin: false,
              },
              {
                id: '3',
                name: 'Matilda',
                age: 10,
                isAdmin: false,
              },
              {
                id: '2',
                name: 'Zeus',
                age: 1000,
                isAdmin: false,
              },
            ]),
        })
        .build();

      const query = based
        .simpleQuery('users')
        .select('name')
        .select('age')
        .build();

      const result1 = query.getSortedRowIds('age');
      expect(result1).toEqual(['3', '1', '2']);

      const result2 = query.getSortedRowIds('age', {
        descending: true,
        limit: 2,
      });
      expect(result2).toEqual(['2', '1']);

      const result3 = query.getSortedRowIds('name');
      expect(result3).toEqual(['1', '3', '2']);
    });

    it('handles simple aggregate queries', async () => {
      const based = await new SchemaBuilder()
        .defineTable('users', userSchema)
        .defineTable('notes', noteSchema)
        .build();

      const queryBuilder = based
        .simpleQuery('notes')
        .where('userId', USER_ID_1)
        .select('userId');

      const aggQuery = queryBuilder.aggregate('userId', 'count');

      const NOTE_ID_2 = 'noteId2';

      based.setRow('users', USER_ID_1, exampleUser);
      based.setRow('notes', NOTE_ID, exampleNote);
      based.setRow('notes', NOTE_ID_2, {
        ...exampleNote,
        id: NOTE_ID_2,
        text: 'TinyBased',
      });

      based.setRow('users', USER_ID_2, {
        ...exampleUser,
        id: USER_ID_2,
        name: 'Bob',
      });

      based.setRow('notes', 'noteId3', {
        ...exampleNote,
        id: 'noteId3',
        userId: USER_ID_2,
        text: 'Hello Bob',
      });

      const result = aggQuery.getAggregation();
      expect(result).toEqual({
        count: 2,
      });
    });
  });

  describe('metrics', () => {
    it('maintains a metric that exposes row count for a table', async () => {
      const based = await baseBuilder.build();
      based.setRow('users', '1', exampleUser);

      expect(based.getRowCount('users')).toBe(1);

      based.setRow('users', '2', exampleUser);
      expect(based.getRowCount('users')).toBe(2);

      based.deleteRow('users', '2');
      expect(based.getRowCount('users')).toBe(1);
    });
  });

  describe('relationships', () => {
    it('allows resolving ids from both sides of a defined relationship', async () => {
      const based = await new SchemaBuilder()
        .defineTable('users', userSchema)
        .defineTable('notes', noteSchema)
        .defineRelationship('userNotes', 'notes', 'users', 'userId')
        .build();

      const NOTE_ID_2 = 'noteId2';

      based.setRow('users', USER_ID_1, exampleUser);
      based.setRow('notes', NOTE_ID, exampleNote);
      based.setRow('notes', NOTE_ID_2, { ...exampleNote, id: NOTE_ID_2 });

      const userNoteIds = based.getLocalIds('userNotes', USER_ID_1);
      expect(userNoteIds).toEqual([NOTE_ID, NOTE_ID_2]);

      const noteUserId = based.getRemoteRowId('userNotes', NOTE_ID);
      expect(noteUserId).toBe(USER_ID_1);
    });
  });

  describe('hydration', () => {
    it('should hydrate upon creation using provided hydrators', async () => {
      const based = await baseBuilder
        .defineTable('notes', noteSchema)
        .defineHydrators({
          users: () => Promise.resolve([exampleUser]),
          notes: () => Promise.resolve([exampleNote]),
        })
        .build();

      expect(based.getRow('users', USER_ID_1)).toEqual(exampleUser);
      expect(based.getRow('notes', NOTE_ID)).toEqual(exampleNote);
    });
  });

  describe('persistence', () => {
    it('allows simple handling of row add/update for any table', async () => {
      const mockStorage = new Map<string, Table | undefined>();
      const based = await baseBuilder
        .onRowAddedOrUpdated(async (_tableName, rowId, entity) => {
          mockStorage.set(rowId, entity);
        })
        .onRowRemoved(async (_tableName, rowId) => {
          mockStorage.delete(rowId);
        })
        .build();

      const ID = '42';
      const wait = () => new Promise((resolve) => setTimeout(resolve, 10));

      based.setRow('users', ID, exampleUser);

      await wait();

      expect(mockStorage.get(ID)).toEqual(exampleUser);

      based.setCell('users', ID, 'age', 35);

      await wait();
      expect(mockStorage.get(ID)?.['age']).toEqual(35);

      based.deleteRow('users', ID);
      await wait();
      expect(mockStorage.get(ID)).toBeUndefined();
    });
  });
});
