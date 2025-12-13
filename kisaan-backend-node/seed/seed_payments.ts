import { Payment, PaymentParty, PaymentMethod } from '../src/models/payment';

export async function seedPayments() {
	await Payment.bulkCreate([
		{
			transaction_id: 1,
			amount: 150.0,
			payer_type: PaymentParty.Buyer,
			payee_type: PaymentParty.Shop,
			method: PaymentMethod.Cash,
			payment_date: new Date('2025-09-01'),
		},
	]);
	console.log('Seeded payments');
}
