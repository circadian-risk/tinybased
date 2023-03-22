import {
  InferKeyValueSchema,
  InferTable,
  SchemaBuilder,
  TableBuilder,
  TinyBaseSchema,
} from '../';

export const usersTable = new TableBuilder('users')
  .add('id', 'string')
  .add('name', 'string')
  .add('age', 'number')
  .add('isAdmin', 'boolean');

export const notesTable = new TableBuilder('notes')
  .add('id', 'string')
  .add('userId', 'string')
  .addOptional('text', 'string');

export type UserRow = InferTable<typeof usersTable>;
export type NoteRow = InferTable<typeof notesTable>;

export const USER_ID_1 = 'user1';
export const USER_ID_2 = 'user2';
export const USER_ID_3 = 'user3';
export const USER_ID_4 = 'user4';
export const USER_ID_5 = 'user5';
export const NOTE_ID = 'noteId1';
export const NOTE_ID_2 = 'noteId2';
export const NOTE_ID_3 = 'noteId3';

export const USER_1: UserRow = {
  id: USER_ID_1,
  name: 'Jesse',
  age: 33,
  isAdmin: true,
};

export const USER_2: UserRow = {
  ...USER_1,
  id: USER_ID_2,
  age: 44,
  name: 'Bob',
};

export const USER_3: UserRow = {
  ...USER_1,
  id: USER_ID_3,
  age: 16,
  name: 'Jesse',
};

export const USER_4: UserRow = {
  ...USER_1,
  id: USER_ID_4,
  age: 100,
  name: 'Jesse',
  isAdmin: false,
};
export const USER_5: UserRow = {
  ...USER_1,
  id: USER_ID_5,
  age: 35,
  name: 'Jesse',
  isAdmin: false,
};

export const NOTE_1: NoteRow = {
  id: NOTE_ID,
  text: 'Hello world',
  userId: USER_ID_1,
};

export const NOTE_2: NoteRow = {
  ...NOTE_1,
  id: NOTE_ID_2,
  text: 'TinyBased',
};

export const NOTE_3: NoteRow = {
  id: NOTE_ID_3,
  userId: USER_ID_2,
  text: 'Hello Bob',
};

export type Schema = {
  users: UserRow;
  notes: NoteRow;
};

export async function makeTinyBasedTestFixture() {
  const tinyBasedSample = await new SchemaBuilder()
    .addTable(usersTable)
    .addTable(notesTable)
    .addValue('online', 'boolean')
    .defineHydrators({
      users: () => Promise.resolve([USER_1, USER_2]),
      notes: () => Promise.resolve([NOTE_1, NOTE_2, NOTE_3]),
    })
    .defineRelationship('userNotes', 'notes', 'users', 'userId')
    .build();

  return tinyBasedSample;
}
