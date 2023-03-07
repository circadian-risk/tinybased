import { SchemaBuilder } from '../';

type UserRow = {
  id: string;
  name: string;
  age: number;
  isAdmin: boolean;
};
const USER_ID_1 = 'user1';
const USER_ID_2 = 'user2';
const NOTE_ID = 'noteId1';

const exampleUser: UserRow = {
  id: USER_ID_1,
  name: 'Jesse',
  age: 33,
  isAdmin: true,
};

type NoteRow = {
  id: string;
  text: string;
  userId: string;
};

const exampleNote: NoteRow = {
  id: NOTE_ID,
  text: 'Hello world',
  userId: USER_ID_1,
};

const tinyBasedSample = new SchemaBuilder()
  .defineTable('users', exampleUser)
  .defineTable('notes', exampleNote)
  .build();

const NOTE_ID_2 = 'noteId2';

tinyBasedSample.setRow('users', USER_ID_1, exampleUser);
tinyBasedSample.setRow('notes', NOTE_ID, exampleNote);
tinyBasedSample.setRow('notes', NOTE_ID_2, {
  ...exampleNote,
  id: NOTE_ID_2,
  text: 'TinyBased',
});

tinyBasedSample.setRow('users', USER_ID_2, {
  ...exampleUser,
  id: USER_ID_2,
  name: 'Bob',
});

tinyBasedSample.setRow('notes', 'noteId3', {
  ...exampleNote,
  id: 'noteId3',
  userId: USER_ID_2,
  text: 'Hello Bob',
});

export { tinyBasedSample };
