import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import { User } from '../src/models/user';
import { Shop } from '../src/models/shop';

async function run() {
  const username = 'ramakanthreddy_0_107';
  console.log('Looking up user by username:', username);
  const user = await User.findOne({ where: { username } });
  if (!user) {
    console.log('User not found');
    process.exit(1);
  }
  console.log('Found user:', { id: user.id, username: user.username, role: user.role, shop_id: user.shop_id });

  // Find shops owned by this user (owner_id === user.id)
  const shops = await Shop.findAll({ where: { owner_id: user.id } });
  console.log('Shops owned by user:', shops.map(s => ({ id: s.id, name: (s as any).name || null })))
}

run().catch(e => { console.error(e); process.exit(1); });
