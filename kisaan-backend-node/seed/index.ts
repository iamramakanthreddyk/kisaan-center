
import { seedPlans } from './seed_plans';
import { seedCategories } from './seed_categories';
// seed_products was removed as part of cleanup. If you restore that file, re-enable the import and call below.
// import { seedProducts } from './seed_products';
// import { seedShopCategories } from './seed_shop_categories';
// import { seedCredits } from './seed_credits';
// import { seedPayments } from './seed_payments';
// import { seedTransactions } from './seed_transactions';
// import { seedShopProducts } from './seed_shop_products';

async function runSeeders() {
	await seedPlans();
	await seedCategories();
	// seedProducts() removed — skip until seed_products is restored
	// Uncomment as needed:
	// await seedShopCategories();
	// await seedShopProducts();
	// await seedCredits();
	// await seedTransactions();
	// await seedPayments();
	console.log('All seeders completed');
}

runSeeders();
export { runSeeders };
