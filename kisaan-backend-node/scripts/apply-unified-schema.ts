import { Sequelize } from 'sequelize';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
const envPath = path.resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

async function executeUnifiedSchema() {
  const useSSL = process.env.DB_SSL_MODE === 'require';
  const sequelize = new Sequelize(
    process.env.DB_NAME || 'postgres',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || '',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
      dialect: 'postgres',
      logging: console.log,
      dialectOptions: useSSL ? { ssl: { require: true, rejectUnauthorized: false } } : {},
    }
  );

  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected to database successfully');

    // Read the unified schema SQL file
    const sqlFilePath = path.resolve(__dirname, '../schema/unified-schema.sql');
    console.log('📖 Reading unified schema SQL file:', sqlFilePath);

    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`SQL file not found: ${sqlFilePath}`);
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    console.log('📄 SQL file loaded, size:', sqlContent.length, 'characters');

    // Execute the entire SQL file as one transaction
    console.log('🔄 Executing unified schema SQL script...');
    await sequelize.query(sqlContent);
    console.log('✅ Unified schema SQL script executed successfully!');
  } catch (err) {
    if (err instanceof Error) {
      console.error('❌ Error executing unified schema SQL file:', err.message);
      console.error(err.stack);
    } else {
      console.error('❌ Error executing unified schema SQL file:', err);
    }
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the script
if (require.main === module) {
  executeUnifiedSchema();
}
