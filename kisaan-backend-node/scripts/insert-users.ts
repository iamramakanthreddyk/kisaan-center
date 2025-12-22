const fs = require('fs');
const path = require('path');

// Initialize database
require('../src/config/database');

const models = require('../src/models');

async function insertUsers() {
  try {
    // Read the users.json file
    const usersData = JSON.parse(fs.readFileSync(path.join(__dirname, '../../users.json'), 'utf8'));

    // Update shop_id to 4 for all users
    const usersToInsert = usersData.data.map((user: any) => ({
      username: user.username,
      email: user.email,
      role: user.role,
      shop_id: 4, // Change to owner's shop_id
      firstname: user.firstname,
      contact: user.contact,
      balance: user.balance,
      custom_commission_rate: user.custom_commission_rate,
      status: user.status,
      cumulative_value: user.cumulative_value,
      created_at: new Date(),
      updated_at: new Date()
    }));

    // Insert users in bulk
    await models.User.bulkCreate(usersToInsert, { ignoreDuplicates: true });

    console.log(`Inserted ${usersToInsert.length} users successfully`);
  } catch (error) {
    console.error('Error inserting users:', error);
  } finally {
    process.exit();
  }
}

insertUsers();