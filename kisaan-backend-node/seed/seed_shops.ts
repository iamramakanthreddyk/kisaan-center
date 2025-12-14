import { Shop } from '../src/models/index';

export async function seedShops() {
  await Shop.bulkCreate([
    {
      name: 'Kisaan Shop 1',
      owner_id: 1,
      plan_id: 1,
      address: '123 Main Street, Village A',
      contact: '9876543210',
      status: 'active'
    },
    {
      name: 'Organic Farm Shop',
      owner_id: 3, // Assign to owner_id=3 for testing multi-owner scenario
      plan_id: 2,
      address: '456 Farm Road, Village B',
      contact: '9876543211',
      status: 'active'
    }
  ]);
  console.log('Seeded shops');
}
