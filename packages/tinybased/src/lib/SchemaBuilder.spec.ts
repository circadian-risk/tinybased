import { SchemaBuilder } from './SchemaBuilder';
import { TableBuilder } from './TableBuilder';

describe('SchemaBuilder', () => {
  it('should be safe to re-use a schema builder as a template', async () => {
    const getTableCount = vi.fn();
    const sb = new SchemaBuilder()
      .addTable(
        new TableBuilder('users').add('id', 'string').add('name', 'string')
      )
      .addPersister({
        getTable: () => {
          getTableCount();
          return [{ id: '1', name: 'Bob' }];
        },
      });

    const tb1 = await sb.build();

    // Another consumer might want to reuse sb as a "template" to instantiate
    // a different set of data. If it adds its own persistor it could end up
    // stacking against a different user. Instead, we should ensure that calling build
    // clears out persistors and hydrators

    const tb2 = await sb
      .addPersister({
        getTable: () => [{ id: '2', name: 'Alice' }],
      })
      .build();

    const result = tb2.getTable('users');

    expect(getTableCount).toHaveBeenCalledOnce();
  });
});
