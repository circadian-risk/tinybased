import { ParseSchema, SchemaBuilder } from '../';

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

type UserRow = ParseSchema<typeof userSchema>;
type NoteRow = ParseSchema<typeof noteSchema>;

const USER_ID_1 = 'user1';
const USER_ID_2 = 'user2';
const NOTE_ID = 'noteId1';
const NOTE_ID_2 = 'noteId2';
const NOTE_ID_3 = 'noteId3';

const user1: UserRow = {
  id: USER_ID_1,
  name: 'Jesse',
  age: 33,
  isAdmin: true,
};

const user2: UserRow = {
  ...user1,
  id: USER_ID_2,
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
    .defineTable('users', userSchema)
    .defineTable('notes', noteSchema)
    .defineHydrators({
      users: () => Promise.resolve([user1, user2]),
      notes: () => Promise.resolve([note1, note2, note3]),
    })
    .build();

  return tinyBasedSample;
}
