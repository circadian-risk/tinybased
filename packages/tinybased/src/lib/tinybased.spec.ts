import { notesTable, usersTable } from '../fixture/database';
import { InferSchema, SchemaPersister, Table } from './types';
import { TableBuilder } from './TableBuilder';
import { SchemaBuilder } from './SchemaBuilder';

const USER_ID_1 = 'user1';
const USER_ID_2 = 'user2';
const NOTE_ID = 'noteId1';

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

const baseBuilder = new SchemaBuilder().addTable(usersTable);

describe('tinybased', () => {
  describe('Basic CRUD', () => {
    it('should provide a typesafe wrapper for getTable', async () => {
      const based = await baseBuilder.build();
      based.setRow('users', '1', exampleUser);

      const table = based.getTable('users');
      expect(table).toEqual({
        '1': exampleUser,
      });

      expectTypeOf(table).toEqualTypeOf<
        Record<
          string,
          { id: string; name: string; age: number; isAdmin: boolean }
        >
      >();
    });

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

    it('should be able to merge rows with partial data', async () => {
      const based = await baseBuilder.build();
      based.setRow('users', USER_ID_1, exampleUser);

      const existing = based.getRow('users', USER_ID_1);
      expect(existing).toEqual({
        id: USER_ID_1,
        name: 'Jesse',
        age: 33,
        isAdmin: true,
      });

      based.mergeRow('users', USER_ID_1, {
        isAdmin: false,
        age: 42,
      });

      const afterMerge = based.getRow('users', USER_ID_1);
      expect(afterMerge).toEqual({
        id: USER_ID_1,
        name: 'Jesse',
        age: 42,
        isAdmin: false,
      });
    });
  });

  it('getSortedRowIds: should return sorted id by cell', async () => {
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

  it('hasRow: should return boolean if row exists or not by id', async () => {
    const based = await baseBuilder.build();

    based.setRow('users', '1', {
      id: '1',
      name: 'Adam',
      age: 25,
      isAdmin: true,
    });

    expect(based.hasRow('users', '1')).toEqual(true);
    expect(based.hasRow('users', '2')).toEqual(false);

    expectTypeOf(based.hasRow('users', '1')).toEqualTypeOf<boolean>();
    expectTypeOf(based.hasRow).parameter(0).toEqualTypeOf<'users'>();
    expectTypeOf(based.hasRow).parameter(1).toEqualTypeOf<string>();
  });

  // TODO: extract common setup boilerplate
  describe('queries', () => {
    it('handles simple queries', async () => {
      const based = await new SchemaBuilder()
        .addTable(usersTable)
        .addTable(notesTable)
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
        .addTable(usersTable)
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
        .addTable(usersTable)
        .addTable(notesTable)
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
        .addTable(usersTable)
        .addTable(notesTable)
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
        .addTable(notesTable)
        .defineHydrators({
          users: () => Promise.resolve([exampleUser]),
          notes: () => Promise.resolve([exampleNote]),
        })
        .build();

      expect(based.getRow('users', USER_ID_1)).toEqual(exampleUser);
      expect(based.getRow('notes', NOTE_ID)).toEqual(exampleNote);
    });

    it('should handle composite keys during hydration', async () => {
      const tableWithCompositeKey = new TableBuilder('composite')
        .add('comp1', 'string')
        .add('comp2', 'string')
        .keyBy(['comp1', 'comp2']);

      const KEY1 = 'key1';
      const KEY2 = 'key2';
      const expectedRowId = `${KEY1}::${KEY2}`;

      const row = { comp1: KEY1, comp2: KEY2 };

      const based = await new SchemaBuilder()
        .addTable(tableWithCompositeKey)
        .defineHydrators({
          composite: () => Promise.resolve([row]),
        })
        .build();

      expect(based.getRow('composite', expectedRowId)).toEqual(row);
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

  describe('persister', () => {
    let mockStorage: Record<string, any> = {};
    const onRowAddedOrUpdated = vi.fn(async (tableName, rowId, entity) => {
      mockStorage[tableName] = mockStorage[tableName] || [];
      const existingIndex = mockStorage[tableName].findIndex(
        (entity: any) => entity.id === rowId
      );
      if (existingIndex !== -1) {
        mockStorage[tableName][existingIndex] = entity;
      } else {
        mockStorage[tableName].push(entity);
      }
    });

    const basedSchema = new SchemaBuilder()
      .addTable(usersTable)
      .addTable(
        new TableBuilder('notes')
          .add('id', 'string')
          .add('userId', 'string')
          .addOptional('text', 'string')
          .keyBy(['id', 'userId'])
      );

    const TestPersister = (
      databaseName: string
    ): SchemaPersister<InferSchema<typeof basedSchema>> => ({
      onInit: async (schema) => {
        mockStorage['__databaseName'] = databaseName;
        mockStorage['__schema'] = schema;
      },
      getTable: async (tableName) => {
        return mockStorage[tableName] || [];
      },
      onRowAddedOrUpdated,
      onRowRemoved: async (tableName, rowId) => {
        mockStorage[tableName] = mockStorage[tableName] || [];
        mockStorage[tableName] = mockStorage[tableName].filter(
          (entity: any) => entity.id !== rowId
        );
      },
    });

    basedSchema.addPersister(TestPersister('test_db'));

    beforeEach(() => {
      mockStorage = {};
      onRowAddedOrUpdated.mockClear();
    });

    it('calls onInit on build and can access schema', async () => {
      await basedSchema.build();
      expect(mockStorage['__databaseName']).toEqual('test_db');
      expect(mockStorage['__schema']).toEqual({
        users: {
          cells: [
            { name: 'id', type: 'string' },
            { name: 'name', type: 'string' },
            { name: 'age', type: 'number' },
            { name: 'isAdmin', type: 'boolean' },
          ],
          keyBy: ['id'],
        },
        notes: {
          cells: [
            { name: 'id', type: 'string' },
            { name: 'userId', type: 'string' },
            { name: 'text', type: 'string', optional: true }, // optional
          ],
          keyBy: ['id', 'userId'], // composite key
        },
      });
    });

    it('hydrates from persister', async () => {
      mockStorage = {
        users: [exampleUser],
      };

      const based = await basedSchema.build();

      expect(based.getRow('users', USER_ID_1)).toEqual(exampleUser);
    });

    it('persists row add/update', async () => {
      const based = await basedSchema.build();

      based.setRow('users', USER_ID_1, exampleUser);

      expect(mockStorage['users']).toEqual([exampleUser]);

      based.setCell('users', USER_ID_1, 'age', 85);

      expect(mockStorage['users']).toEqual([{ ...exampleUser, age: 85 }]);
    });

    it('persists row removal', async () => {
      mockStorage = {
        users: [exampleUser],
      };

      const based = await basedSchema.build();

      based.deleteRow('users', USER_ID_1);

      expect(mockStorage['users']).toEqual([]);
    });

    it('it should not invoke row change events on hydration', async () => {
      mockStorage = {
        users: [exampleUser],
      };

      const otherEventHandlers = vi.fn();

      const based = await basedSchema
        .onRowAddedOrUpdated(otherEventHandlers)
        .build();

      expect(onRowAddedOrUpdated).not.toBeCalled();
      expect(otherEventHandlers).not.toBeCalled();
      expect(based.getRow('users', USER_ID_1)).toEqual(exampleUser);
    });
  });
});
