import sequelize from './src/config/database';

async function listTablesAndColumns() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database.');
    const [tables] = await sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);
    for (const row of tables as { table_name: string }[]) {
      const tableName = row.table_name;
      console.log(`\nTable: ${tableName}`);
      const [columns] = await sequelize.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = '${tableName}' AND table_schema = 'public';
      `);
      for (const col of columns as any[]) {
        console.log(`  - ${col.column_name} (${col.data_type})${col.is_nullable === 'NO' ? ' NOT NULL' : ''}${col.column_default ? ` DEFAULT ${col.column_default}` : ''}`);
      }
    }
    await sequelize.close();
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

listTablesAndColumns();
