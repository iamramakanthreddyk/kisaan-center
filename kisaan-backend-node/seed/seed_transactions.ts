
import { sequelize, Transaction } from '../src/models/index';

export async function seedTransactions() {
	// SAFETY CHECK: Prevent destructive operations on production and test databases
	const PROTECTED_DBS = ['kisaan_prod', 'kisaan_production', 'production', 'kisaan_test', 'test', 'kisaan_dev'];
	const currentDb = process.env.DB_NAME || 'kisaan_dev';
	
	if (PROTECTED_DBS.includes(currentDb.toLowerCase())) {
		console.warn(`⚠️  SAFETY BLOCK: Skipping transaction seeding on protected database: ${currentDb}`);
		console.warn('   This script performs destructive operations that could delete existing data.');
		console.warn('   Use a custom database name or set DB_NAME to a non-protected value.');
		return;
	}
	
	console.log(`🌱 Seeding transactions on database: ${currentDb}`);
	
   try {
	   // WARNING: sequelize.sync() can alter schema - only use in development/test
	   if (process.env.NODE_ENV === 'production') {
		   console.warn('⚠️  Skipping sequelize.sync() in production environment');
	   } else {
		   await sequelize.sync();
	   }
	   
		   await Transaction.bulkCreate([
			   {
				   shop_id: 1,
				   farmer_id: 1,
				   buyer_id: 1,
				   category_id: 1,
				   product_name: 'Apple',
				   quantity: 10,
				   unit_price: 15.0,
				   // Use canonical DB column names required by the Transaction model
				   total_sale_value: 150.0,
				   shop_commission: 15.0,
				   farmer_earning: 135.0,
			   },
		   ]);
	   console.log('Seeded transactions');
   } catch (err) {
	   console.error('Error seeding transactions:', err);
   }
}
