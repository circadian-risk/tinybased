import { InferTable, SchemaBuilder, TableBuilder } from '../';

export const usersTable = new TableBuilder('users')
  .add('id', 'string')
  .add('name', 'string')
  .add('age', 'number')
  .add('isAdmin', 'boolean');

export const notesTable = new TableBuilder('notes')
  .add('id', 'string')
  .add('userId', 'string')
  .addOptional('text', 'string');

type UserRow = InferTable<typeof usersTable>;
type NoteRow = InferTable<typeof notesTable>;

export const USER_ID_1 = 'user1';
export const USER_ID_2 = 'user2';
export const NOTE_ID = 'noteId1';
export const NOTE_ID_2 = 'noteId2';
export const NOTE_ID_3 = 'noteId3';

const user1: UserRow = {
  id: USER_ID_1,
  name: 'Jesse',
  age: 33,
  isAdmin: true,
};

const user2: UserRow = {
  ...user1,
  id: USER_ID_2,
  age: 44,
  name: 'Bob',
};

const note1: NoteRow = {
  id: NOTE_ID,
  text: 'Hello world',
  userId: USER_ID_1,
};

const note2: NoteRow = {
  ...note1,
  id: NOTE_ID_2,
  text: 'TinyBased',
};

const note3: NoteRow = {
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
    .defineHydrators({
      users: () => Promise.resolve([user1, user2]),
      notes: () => Promise.resolve([note1, note2, note3]),
    })
    .build();

  return tinyBasedSample;
}
