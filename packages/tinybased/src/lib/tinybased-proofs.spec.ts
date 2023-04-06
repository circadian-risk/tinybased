import { SchemaBuilder, TableBuilder } from '..';

describe('Simple proofs that demonstrate how TinyBase works under the hood', () => {
  describe('listeners', () => {
    it('should fire event listeners if a cell is changed to be undefined', async () => {
      const listener = vi.fn();

      const based = await new SchemaBuilder()
        .addTable(
          new TableBuilder('someTable')
            .add('id', 'string')
            .addOptional('message', 'string')
        )
        .build();

      based.setRow('someTable', '1', {
        id: '1',
        message: 'this is my message',
      });

      based.store.addRowListener(null, null, listener);
      based.store.addCellListener(null, null, null, listener);

      based.setCell('someTable', '1', 'message', undefined);

      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('does not fire listeners for cell changes if the value is equal', async () => {
      const listener = vi.fn();

      const based = await new SchemaBuilder()
        .addTable(
          new TableBuilder('someTable')
            .add('id', 'string')
            .add('num', 'number')
            .add('str', 'string')
            .add('bool', 'boolean')
        )
        .build();

      based.setRow('someTable', '1', {
        num: 42,
        str: 'message',
        bool: false,
        id: '1',
      });

      based.store.addRowListener(null, null, listener);
      based.store.addCellListener(null, null, null, listener);

      based.setCell('someTable', '1', 'bool', false);
      based.setCell('someTable', '1', 'str', 'message');
      based.setCell('someTable', '1', 'num', 42);

      expect(listener).toHaveBeenCalledTimes(0);
    });
  });

  describe('undefined handling', () => {
    it('removes cells that are set to be undefined or null from the row', async () => {
      const based = await new SchemaBuilder()
        .addTable(
          new TableBuilder('someTable')
            .add('id', 'string')
            .addOptional('trying_null', 'string')
            .addOptional('trying_undefined', 'string')
        )
        .build();

      based.setRow('someTable', '1', {
        id: '1',
        trying_null: 'null',
        trying_undefined: 'undefined',
      });

      based.setRow('someTable', '1', {
        ...based.getRow('someTable', '1')!,
        trying_undefined: undefined,
        trying_null: null as unknown as undefined,
      });

      // IMPORTANT:  When we set cells to undefined they are actually removed automatically from the row
      expect(based.getRow('someTable', '1')).not.toMatchObject({
        id: '1',
        trying_null: undefined,
        trying_undefined: undefined,
      });

      expect(based.getRow('someTable', '1')).toEqual({
        id: '1',
      });
    });
  });
});
