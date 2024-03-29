import { notesTable, usersTable } from '../fixture/database';
import {
  InferSchema,
  InferTinyBasedFromSchemaBuilder,
  Prettify,
  SchemaPersister,
  Table,
} from './types';
import { TableBuilder } from './TableBuilder';
import { SchemaBuilder } from './SchemaBuilder';
import { createQueries } from 'tinybase/queries';

const USER_ID_1 = 'user1';
const USER_ID_2 = 'user2';
const NOTE_ID = 'noteId1';

const exampleUser = {
  id: USER_ID_1,
  name: 'Jesse',
  age: 33,
  isAdmin: true,
  isAdult: true,
};

const exampleNote = {
  id: NOTE_ID,
  text: 'Hello world',
  userId: USER_ID_1,
};

const baseBuilder = new SchemaBuilder().addTable(usersTable);
const twoValueBuilder = new SchemaBuilder()
  .addValue('online', 'boolean')
  .addValue('userId', 'string');

describe('tinybased', () => {
  describe('Key-Value API', () => {
    let twoValueBased!: InferTinyBasedFromSchemaBuilder<typeof twoValueBuilder>;
    beforeEach(async () => {
      twoValueBased = await twoValueBuilder.build();
    });
    it('Can be defined', () => {
      twoValueBased.setValue('online', false);

      expect(twoValueBased.getValue('online')).toEqual(false);

      twoValueBased.setValue('online', true);

      expect(twoValueBased.getValue('online')).toEqual(true);

      expect(twoValueBased.getValue('userId')).toBeUndefined();
    });

    it('Can be deleted', () => {
      twoValueBased.setValue('online', false);
      expect(twoValueBased.getValue('online')).toEqual(false);
      twoValueBased.deleteValue('online');
      expect(twoValueBased.getValue('online')).toBeUndefined();
    });
  });

  describe('primary key', () => {
    let usersTable = new TableBuilder('users')
      .add('id', 'string')
      .add('name', 'string');

    beforeEach(async () => {
      usersTable = new TableBuilder('users')
        .add('id', 'string')
        .add('name', 'string');
    });

    it('compose key', () => {
      const userTableWithComposeKey = usersTable
        .add('parent_id', 'number')
        .keyBy(['id', 'parent_id']);

      expect(
        userTableWithComposeKey.composeKey({ id: '1', parent_id: 2 })
      ).toBe('1::2');
      expectTypeOf(userTableWithComposeKey.composeKey).toBeCallableWith({
        id: '1',
        parent_id: 2,
      });
    });

    it('id is required column if no compose key specified and has id colum', () => {
      expect(usersTable.composeKey({ id: '10' })).toBe('10');
      expectTypeOf(usersTable.composeKey).toBeCallableWith({
        id: '10',
      });
    });

    it('one compose key', () => {
      const userTableWithComposeKey = usersTable
        .add('parent_id', 'number')
        .keyBy(['parent_id']);

      expect(userTableWithComposeKey.composeKey({ parent_id: 1 })).toBe('1');
    });
  });

  describe('Basic CRUD', () => {
    it('should provide a typesafe wrapper for setTable', async () => {
      const based = await baseBuilder.build();

      based.setTable('users', [
        {
          age: 42,
          id: '1',
          isAdmin: true,
          name: 'Jesse',
          // Computed column cannot be set directly
          // isAdult: false
        },
      ]);

      expect(based.getTable('users')).toEqual({
        '1': {
          age: 42,
          id: '1',
          isAdmin: true,
          name: 'Jesse',
          isAdult: true,
        },
      });
    });

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
          {
            id: string;
            name: string;
            age: number;
            isAdmin: boolean;
            isAdult: boolean;
          }
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

    it('should handle multiple row insert', async () => {
      const based = await baseBuilder.build();
      based.setRow('users', USER_ID_1, {
        ...exampleUser,
        name: 'Not Jesse',
      });

      const newUsers = [
        {
          id: USER_ID_1,
          name: 'Jesse',
          age: 33,
          isAdmin: false,
          isAdult: true,
        },
        {
          id: USER_ID_2,
          name: 'Deep',
          age: 16,
          isAdmin: false,
          isAdult: false,
        },
      ];

      based.bulkUpsert('users', newUsers);

      expect(based.getRow('users', USER_ID_1)).toEqual(newUsers[0]);
      expect(based.getRow('users', USER_ID_2)).toEqual(newUsers[1]);
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
        isAdult: true,
      });

      based.mergeRow('users', USER_ID_1, {
        isAdmin: false,
        age: 16,
        name: undefined,
      });

      const afterMerge = based.getRow('users', USER_ID_1);

      expect(afterMerge).toMatchObject({
        id: USER_ID_1,
        age: 16,
        isAdmin: false,
        isAdult: false,
      });
    });

    it('should throw an error if mergeRow is attempted on a non-existent row', async () => {
      const based = await baseBuilder.build();
      expect(() =>
        based.mergeRow('users', USER_ID_1, exampleUser)
      ).toThrowError();
    });

    it('should return undefined for a getRow that has no corresponding row', async () => {
      const based = await baseBuilder.build();
      const nonExistentRow = based.getRow('users', 'thisRowDoesNotExist');
      expect(nonExistentRow).toBeUndefined();
    });

    it('should return undefined for a getCell that has no corresponding row', async () => {
      const based = await baseBuilder.build();
      const nonExistentCell = based.getCell(
        'users',
        'thisRowDoesNotExist',
        'name'
      );
      expect(nonExistentCell).toBeUndefined();
    });

    it('should handle nulls if they are provided through ejecting types with any', async () => {
      const based = await baseBuilder.build();
      based.setRow('users', USER_ID_1, exampleUser);

      const existing = based.getRow('users', USER_ID_1);
      expect(existing).toEqual({
        id: USER_ID_1,
        name: 'Jesse',
        age: 33,
        isAdmin: true,
        isAdult: true,
      });

      based.mergeRow('users', USER_ID_1, {
        isAdmin: false,
        age: 16,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        name: null as any,
      });

      const afterMerge = based.getRow('users', USER_ID_1);

      // If null is provided in a type unsafe way, it should have the same impact as explicit undefined
      // which should delete the cell from the underlying row
      expect(afterMerge).toMatchObject({
        id: USER_ID_1,
        age: 16,
        isAdmin: false,
        isAdult: false,
      });
    });
  });

  describe('Listeners', () => {
    let ROW_ID: string;

    beforeAll(() => {
      ROW_ID = '1';
    });

    it('correctly handles created events', async () => {
      const sb = new SchemaBuilder().addTable(
        new TableBuilder('row').add('id', 'string').add('name', 'string')
      );

      const tb = await sb.build();
      const fn = vi.fn();

      tb.onRowChange('row', (change) => {
        if (change.type === 'insert') {
          fn(change.type, change.row);
        }
      });

      const row = { name: 'Jesse', id: ROW_ID };
      tb.setRow('row', ROW_ID, row);

      expect(fn).toHaveBeenCalledOnce();
      expect(fn).toHaveBeenCalledWith('insert', row);
    });

    it('correctly handles updated events', async () => {
      const sb = new SchemaBuilder().addTable(
        new TableBuilder('row').add('id', 'string').add('name', 'string')
      );

      const tb = await sb.build();
      const fn = vi.fn();

      tb.onRowChange('row', (change) => {
        if (change.type === 'update') {
          fn(change.type, change.rowId, change.row, change.changes);
        }
      });

      const row = { name: 'Jesse', id: ROW_ID };
      tb.setRow('row', ROW_ID, row);

      tb.setCell('row', ROW_ID, 'name', 'Christyn');

      expect(fn).toHaveBeenCalledOnce();
      expect(fn).toHaveBeenCalledWith(
        'update',
        ROW_ID,
        { id: ROW_ID, name: 'Christyn' },
        {
          name: {
            oldValue: 'Jesse',
            newValue: 'Christyn',
          },
        }
      );
    });

    it('correctly handles deleted events', async () => {
      const sb = new SchemaBuilder().addTable(
        new TableBuilder('row').add('id', 'string').add('name', 'string')
      );

      const tb = await sb.build();
      const fn = vi.fn();

      tb.onRowChange('row', (change) => {
        if (change.type === 'delete') {
          fn(change.type, change.rowId, change.row);
        }
      });

      const row = { name: 'Jesse', id: ROW_ID };
      tb.setRow('row', ROW_ID, row);

      tb.deleteRow('row', ROW_ID);

      expect(fn).toHaveBeenCalledOnce();
      expect(fn).toHaveBeenCalledWith('delete', ROW_ID, row);
    });

    it('supports ability to mutate store in a handler', async () => {
      const sb = new SchemaBuilder().addTable(
        new TableBuilder('row')
          .add('id', 'string')
          .add('name', 'string')
          .addOptional('updateCount', 'number')
      );

      const tb = await sb.build();

      tb.onRowChange(
        'row',
        (change) => {
          // Any time there is a change, increment the `updateCount` cell
          if (change.type === 'update') {
            const oldCount =
              tb.getCell('row', change.rowId as string, 'updateCount') ?? 0;

            tb.setCell('row', change.rowId, 'updateCount', oldCount + 1);
          }
        },
        true
      );

      const row = { name: 'Jesse', id: ROW_ID };
      tb.setRow('row', ROW_ID, row);
      tb.setCell('row', ROW_ID, 'name', 'Christyn');
      tb.setCell('row', ROW_ID, 'name', 'Pixel');

      expect(tb.getCell('row', ROW_ID, 'updateCount')).toEqual(2);
    });

    it('makes query results invisible when processing using a mutating listener', async () => {
      // We noticed that when using mutating row listeners, queries that had previously been registered
      // would return stale query results

      const sb = new SchemaBuilder().addTable(
        new TableBuilder('row')
          .add('id', 'string')
          .add('name', 'string')
          .addOptional('updateCount', 'number')
      );

      const fn = vi.fn();

      const tb = await sb.build();

      const query = tb.query('row').select('name').build();

      tb.onRowChange(
        'row',
        (change) => {
          if (change.type === 'insert') {
            const queryIds = query.getResultRowIds();
            fn(queryIds);
          }
        },
        true
      );

      tb.bulkUpsert('row', [{ id: ROW_ID, name: 'Jesse' }]);

      expect(fn).toHaveBeenCalledWith([]);
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
      .toEqualTypeOf<'name' | 'id' | 'age' | 'isAdmin' | 'isAdult'>();
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

    it('should handle custom composite keys during hydration', async () => {
      const tableWithCompositeKey = new TableBuilder('composite')
        .add('comp1', 'string')
        .add('comp2', 'string')
        .keyBy(['comp1', 'comp2'])
        .defineKeyDelimiter('+');

      const KEY1 = 'key1';
      const KEY2 = 'key2';
      const expectedRowId = `${KEY1}+${KEY2}`;

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

    beforeEach(() => {
      mockStorage = {};
      onRowAddedOrUpdated.mockClear();
      basedSchema.addPersister(TestPersister('test_db'));
    });

    it('calls onInit on build and can access schema', async () => {
      await basedSchema.build();
      expect(mockStorage['__databaseName']).toEqual('test_db');
      expect(mockStorage['__schema']).toEqual(
        expect.objectContaining({
          users: {
            cells: [
              { name: 'id', type: 'string' },
              { name: 'name', type: 'string' },
              { name: 'age', type: 'number' },
              { name: 'isAdult', type: 'boolean', compute: expect.anything() },
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
        })
      );
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

  describe('computed columns', () => {
    describe('isolated table computed columns', () => {
      // for computed columns that only depend on their own table

      /**
       * DRY interface denoting what the 'hasComputedColumn' table excluding the computed columns should be
       */
      interface ExcludingComputedCells {
        id: string;
        answered: number;
        total: number;
      }

      const tableWithComputedColumn = new TableBuilder('hasComputedColumn')
        .add('id', 'string')
        .add('total', 'number')
        .add('answered', 'number')
        .addComputed('percentage', 'number', ({ answered, total }) => {
          return (answered / total) * 100;
        })
        .addComputed('status', 'string', ({ percentage }) => {
          if (percentage === 100) return 'Complete';
          if (percentage > 0) return 'Started';
          return 'NotStarted';
        });

      const schema = new SchemaBuilder().addTable(tableWithComputedColumn);
      let based!: Awaited<ReturnType<(typeof schema)['build']>>;

      beforeAll(async () => {
        based = await schema.build();
      });

      describe('Setter functions exclude computed columns', () => {
        it('setTable', () => {
          expectTypeOf(based.setTable)
            .parameter(1)
            .toEqualTypeOf<ExcludingComputedCells[]>();
        });

        it('bulkUpsert', () => {
          expectTypeOf(based.bulkUpsert)
            .parameter(1)
            .toEqualTypeOf<ExcludingComputedCells[]>();
        });
        it('setRow', () => {
          expectTypeOf(based.setRow).parameters.toEqualTypeOf<
            ['hasComputedColumn', string, ExcludingComputedCells]
          >();
        });

        // TODO: toEqualTypeOf doesn't work well with Partial of mergeRow
        // it('mergeRow', async () => {
        //   expectTypeOf(based.mergeRow).parameters.toEqualTypeOf<
        //     [
        //       'hasComputedColumn',
        //       string,
        //       // 'percentage' and 'status' are computed and therefore ignored for setCell
        //       // Issue with Partial in toEqualTypeOf
        //       Partial<ExcludingComputedCells & {stuff: string}>
        //     ]
        //   >();
        // });

        it('setCell', () => {
          expectTypeOf(based.setCell).parameters.toEqualTypeOf<
            [
              'hasComputedColumn',
              string,
              // 'percentage' and 'status' are computed and therefore ignored for setCell
              'id' | 'answered' | 'total', //| 'percentage' | 'status',
              any
            ]
          >();
        });
      });

      it('can define and compute columns based on one or more columns in this table', () => {
        // 0% / "NotStarted"
        based.setRow('hasComputedColumn', '1', {
          // percentage: 45, // this should not be allowed here as it is a computed column
          id: '1',
          answered: 0,
          total: 10,
        });

        expect(based.getCell('hasComputedColumn', '1', 'percentage')).toBe(0);
        expect(based.getCell('hasComputedColumn', '1', 'status')).toBe(
          'NotStarted'
        );

        // 50% / "Started"
        based.setCell('hasComputedColumn', '1', 'answered', 5);

        expect(based.getCell('hasComputedColumn', '1', 'percentage')).toBe(50);
        expect(based.getCell('hasComputedColumn', '1', 'status')).toBe(
          'Started'
        );

        // 100% / "Complete"
        based.setCell('hasComputedColumn', '1', 'answered', 10);

        expect(based.getCell('hasComputedColumn', '1', 'percentage')).toBe(100);
        expect(based.getCell('hasComputedColumn', '1', 'status')).toBe(
          'Complete'
        );

        // Demonstrating types of other methods
        // Type not allowed
        // based.setCell('hasComputedColumn', '1', 'percentage', 3);

        based.mergeRow('hasComputedColumn', '1', {
          answered: 5,
          id: '1',
          total: 20,
          // Below keys are not allowed for mergeRow as they are computed
          // percentage: 50,
          // status: 'NotStarted'
        });

        based.bulkUpsert('hasComputedColumn', [
          {
            id: '2',
            answered: 2,
            total: 10,
            // below keys are not allowed for bulkUpsert
            // percentage: 50,
            // status: 'NotStarted'
          },
        ]);

        based.setTable('hasComputedColumn', [
          {
            id: '3',
            answered: 0,
            total: 10,
            // below keys are not allowed for bulkUpsert
            // percentage: 50,
            // status: 'NotStarted'
          },
        ]);
      });

      it('can compute on data loading from hydration', async () => {
        const based = await new SchemaBuilder()
          .addTable(tableWithComputedColumn)
          .defineHydrators({
            hasComputedColumn: async () => {
              return [
                {
                  id: '1',
                  answered: 5,
                  total: 10,
                  status: 'Started',
                  percentage: 10,
                },
              ];
            },
          })
          .build();

        expect(based.getCell('hasComputedColumn', '1', 'percentage')).toBe(50);
      });

      it('can compute on data loading from persister', async () => {
        const based = await new SchemaBuilder()
          .addTable(tableWithComputedColumn)
          .addPersister({
            getTable: async () => {
              return [
                {
                  id: '1',
                  answered: 5,
                  total: 10,
                  status: 'Started',
                  percentage: 10,
                },
              ];
            },
          })
          .build();

        expect(based.getCell('hasComputedColumn', '1', 'percentage')).toBe(50);
      });
    });

    // TODO: CR-2993
    describe('inter-table computed columns', () => {
      // for computed columns that depend on another table
      it.todo('Supports inter-table computed columns');
    });
  });
});
