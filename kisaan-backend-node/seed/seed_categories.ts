import { Category } from '../src/models/index';

export async function seedCategories() {
	// SAFETY CHECK: Prevent destructive operations on production and test databases
	const PROTECTED_DBS = ['kisaan_prod', 'kisaan_production', 'production', 'kisaan_test', 'test', 'kisaan_dev'];
	const currentDb = process.env.DB_NAME || 'kisaan_dev';

	if (PROTECTED_DBS.includes(currentDb.toLowerCase())) {
		console.warn(`⚠️  SAFETY BLOCK: Skipping category seeding on protected database: ${currentDb}`);
		console.warn('   This script performs destructive operations (TRUNCATE) that could delete existing data.');
		console.warn('   Use a custom database name or set DB_NAME to a non-protected value.');
		return;
	}

	console.log(`🌱 Seeding categories on database: ${currentDb}`);
	await Category.destroy({ where: {}, truncate: true, restartIdentity: true, cascade: true });
	await Category.bulkCreate([
		{ name: 'Fruits', description: 'All types of fruits' },      // id: 1
		{ name: 'Vegetables', description: 'All types of vegetables' }, // id: 2
		{ name: 'Grains', description: 'All types of grains' },        // id: 3
		{ name: 'Flowers', description: 'All types of flowers' },      // id: 4
	]);
	console.log('Seeded categories (fruits, vegetables, grains, flowers)');
}
