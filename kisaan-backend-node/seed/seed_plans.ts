import { Plan } from '../src/models/index';

export async function seedPlans() {
	const plans = [
		{
			name: 'Basic',
			description: 'Basic plan for small shops',
			price: 100,
			billing_cycle: 'monthly',
			max_farmers: 5,
			max_buyers: 5,
			max_transactions: 100,
			features: JSON.stringify(['basic_support']),
			status: 'active',
		},
		{
			name: 'Premium',
			description: 'Premium plan for large shops',
			price: 500,
			billing_cycle: 'monthly',
			max_farmers: 50,
			max_buyers: 50,
			max_transactions: 1000,
			features: JSON.stringify(['priority_support', 'analytics']),
			status: 'active',
		},
		{
			name: 'Enterprise',
			description: 'Enterprise plan for enterprise customers',
			price: 2000,
			billing_cycle: 'monthly',
			max_farmers: 500,
			max_buyers: 500,
			max_transactions: 10000,
			features: JSON.stringify(['dedicated_support', 'custom_analytics', 'integration']),
			status: 'active',
		},
	];

	for (const plan of plans) {
		await Plan.upsert(plan);
	}
	console.log('Seeded/updated plans (Basic, Premium, Enterprise)');
} 

// Allow running this file directly
if (require.main === module) {
	seedPlans()
		.then(() => {
			console.log('✅ Plans seeding complete.');
			process.exit(0);
		})
		.catch((err) => {
			console.error('❌ Plans seeding failed:', err);
			process.exit(1);
		});
}
