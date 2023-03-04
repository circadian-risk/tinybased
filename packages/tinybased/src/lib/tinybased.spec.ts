import { Builder } from './tinybased';

type UserRow = {
  id: string;
  name: string;
  age: number;
  isAdmin: boolean;
};

const USER_ID = 'userId';
const NOTE_ID = 'noteId1';

const exampleUser: UserRow = {
  id: USER_ID,
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
  userId: USER_ID,
};

const baseBuilder = new Builder().defineTable('users', exampleUser);

describe('tinybased', () => {
  it('should work', () => {
    const based = baseBuilder.build();
    based.setRow('users', '1', exampleUser);

    expect(based.getRow('users', '1')).toEqual(exampleUser);
    const age = based.getCell('users', '1', 'age');
    expect(age).toBe(33);
  });

  describe('queries', () => {
    it('handles simple queries', () => {});
  });

  describe('metrics', () => {
    it('maintains a metric that exposes row count for a table', () => {
      const based = baseBuilder.build();
      based.setRow('users', '1', exampleUser);

      expect(based.getRowCount('users')).toBe(1);
      based.setRow('users', '2', exampleUser);
      expect(based.getRowCount('users')).toBe(2);
      based.deleteRow('users', '2');
      expect(based.getRowCount('users')).toBe(1);
    });
  });

  describe('relationships', () => {
    it('should work', () => {
      const based = new Builder()
        .defineTable('users', exampleUser)
        .defineTable('notes', exampleNote)
        .defineRelationship('userNotes', 'notes', 'users', 'userId')
        .build();

      const NOTE_ID_2 = 'noteId2';

      based.setRow('users', USER_ID, exampleUser);
      based.setRow('notes', NOTE_ID, exampleNote);
      based.setRow('notes', NOTE_ID_2, { ...exampleNote, id: NOTE_ID_2 });

      const userNoteIds = based.getLocalIds('userNotes', USER_ID);
      expect(userNoteIds).toEqual([NOTE_ID, NOTE_ID_2]);

      const noteUserId = based.getRemoteRowId('userNotes', NOTE_ID);
      expect(noteUserId).toBe(USER_ID);
    });
  });
});
