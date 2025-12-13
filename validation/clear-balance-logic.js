// CORRECTED BUSINESS FLOW VALIDATION
// =================================

// CORRECT BALANCE SEMANTICS (matching actual system):
// 1. Farmer Balance = What shop owes farmer (positive = shop owes farmer)
// 2. Buyer Balance = What buyer owes shop (positive = buyer owes shop)
// 3. Expense Balance = What farmer owes shop for expenses (positive = farmer owes shop)

class CompleteBusinessFlow {
  constructor() {
    this.farmer_balance = 0;        // Shop owes farmer (positive = shop owes farmer)
    this.buyer_balance = 0;         // Buyer owes shop (positive = buyer owes shop)
    this.farmer_expense_balance = 0; // Farmer owes shop for expenses (positive = farmer owes shop)
  }

  createTransaction(goods_amount, farmer_earning) {
    this.farmer_balance += farmer_earning; // Shop now owes farmer
    this.buyer_balance += goods_amount;    // Buyer now owes shop
    console.log('Transaction: Farmer sells goods, earns ₹' + farmer_earning);
    console.log('Farmer balance: ₹' + this.farmer_balance + ' (shop owes farmer)');
    console.log('Buyer balance: ₹' + this.buyer_balance + ' (buyer owes shop)');
  }

  shopPaysFarmer(amount) {
    console.log('Shop pays farmer: ₹' + amount);

    // Priority 1: Settle expenses first
    let expense_recovery = Math.min(amount, this.farmer_expense_balance);
    if (expense_recovery > 0) {
      this.farmer_expense_balance -= expense_recovery;
      console.log('Recovers ₹' + expense_recovery + ' from expenses');
    }

    // Priority 2: Reduce farmer balance
    let remaining = amount - expense_recovery;
    if (remaining > 0) {
      let reduction = Math.min(remaining, this.farmer_balance);
      this.farmer_balance -= reduction;
      console.log('Reduces farmer balance by ₹' + reduction);
    }
  }

  shopPaysExpenseToFarmer(amount) {
    // Treat shop-paid expense as a reimbursement that reduces the farmer balance
    // (i.e., reduces what the shop owes the farmer)
    const reduction = Math.min(amount, this.farmer_balance);
    this.farmer_balance = Math.max(0, this.farmer_balance - amount);
    console.log('Shop pays expense (reimbursement): ₹' + amount + ' — reduced farmer balance by ₹' + reduction);
  }

  getStatus() {
    console.log('=== STATUS ===');
    console.log('Farmer balance: ₹' + this.farmer_balance + ' (shop owes farmer)');
    console.log('Expense balance: ₹' + this.farmer_expense_balance + ' (farmer owes shop)');
    console.log('Buyer balance: ₹' + this.buyer_balance + ' (buyer owes shop)');
    const net = this.farmer_balance - this.farmer_expense_balance;
    if (net > 0) {
      console.log('NET: Shop owes farmer ₹' + net);
    } else if (net < 0) {
      console.log('NET: Farmer owes shop ₹' + Math.abs(net));
    } else {
      console.log('NET: All settled');
    }
  }
}

console.log('CORRECTED BUSINESS FLOW:');
const business = new CompleteBusinessFlow();
business.createTransaction(1000, 850);
business.getStatus();
console.log('');
business.shopPaysExpenseToFarmer(300);
business.getStatus();
console.log('');
business.shopPaysFarmer(500);
business.getStatus();

console.log('\n' + '---'.repeat(10) + '\n');
// Scenario B: Shop pays expense BEFORE transaction (edge-case)
console.log('SCENARIO B: Expense before transaction');
const businessB = new CompleteBusinessFlow();
businessB.shopPaysExpenseToFarmer(300);
businessB.getStatus();
console.log('');
businessB.createTransaction(1000, 850);
businessB.getStatus();
console.log('');
businessB.shopPaysFarmer(500);
businessB.getStatus();
