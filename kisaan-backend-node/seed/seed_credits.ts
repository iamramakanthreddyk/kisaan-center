
import { createExpense } from '../src/services/settlementService';

export async function seedCredits() {
  // Create an 'advance' expense to represent credit advance
  await createExpense({
    shop_id: 1,
    user_id: '1',
    user_type: 'farmer',
    amount: 1000.0,
    type: 'advance',
    description: 'Seeded credit advance'
  });
  console.log('Seeded credit advances as expenses');
}
