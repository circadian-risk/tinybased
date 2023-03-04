import { Builder } from './tinybased';

type UserRow = {
  id: string;
  name: string;
  age: number;
  isAdmin: boolean;
};

const exampleUser: UserRow = {
  id: '1',
  name: 'Jesse',
  age: 33,
  isAdmin: true,
};

describe('tinybased', () => {
  it('should work', () => {
    const tinyBased = new Builder().defineTable('users', exampleUser).build();
    tinyBased.setRow('users', '1', exampleUser);

    expect(tinyBased.getRow('users', '1')).toEqual(exampleUser);
    const age = tinyBased.getCell('users', '1', 'age');
    expect(age).toBe(33);
  });
});
