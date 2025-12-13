// Balance & Expense Reconciliation Logic
// ======================================

// BALANCE CONVENTION:
// Positive (+) = Owner owes farmer (farmer has credit)
// Negative (-) = Farmer owes owner (farmer has debit)

// EXPENSE TYPES:
// OWNER_EXPENSE = Owner paid farmer (increases farmer balance)
// FARMER_ADVANCE = Advance given to farmer (increases farmer balance)
// SHOP_EXPENSE = Shop expenses (doesn't affect farmer balance directly)

class BalanceCalculator {
  constructor() {
    this.scenarios = [];
  }

  // Scenario 1: Owner pays farmer ₹300 transportation
  addTransportationExpense() {
    this.scenarios.push({
      action: "OWNER_PAYS_TRANSPORTATION",
      amount: 300,
      balance_impact: "+300", // Owner owes farmer ₹300
      description: "Owner paid farmer ₹300 for transportation",
      expense_record: {
        expense_type: "OWNER_EXPENSE",
        paid_by_user_id: "owner_id",
        paid_to_user_id: "farmer_id",
        amount: 300,
        status: "PENDING"
      }
    });
  }

  // Scenario 2: Farmer sells goods worth ₹1000
  addTransaction(amount = 1000) {
    this.scenarios.push({
      action: "FARMER_SELLS_GOODS",
      amount: amount,
      balance_impact: `-${amount}`, // Farmer owes owner ₹1000
      description: `Farmer sells goods worth ₹${amount}`,
      transaction_record: {
        amount: amount,
        farmer_balance_impact: -amount
      }
    });
  }

  // Scenario 3: Owner pays farmer
  addPayment(amount, type = "BALANCE_SETTLEMENT") {
    this.scenarios.push({
      action: "OWNER_PAYS_FARMER",
      amount: amount,
      balance_impact: `-${amount}`, // Reduces what farmer owes
      description: `Owner pays farmer ₹${amount} (${type})`,
      payment_record: {
        payment_type: type,
        amount: amount
      }
    });
  }

  calculateBalance() {
    let balance = 0;
    let pendingExpenses = 0;

    console.log("🔄 BALANCE CALCULATION LOGIC:\n");

    this.scenarios.forEach((scenario, index) => {
      console.log(`${index + 1}. ${scenario.description}`);
      console.log(`   Balance Impact: ${scenario.balance_impact}`);

      // Calculate running balance
      const impact = parseInt(scenario.balance_impact.replace(/[^\d-]/g, ''));
      balance += impact;

      // Track pending expenses
      if (scenario.expense_record && scenario.expense_record.status === "PENDING") {
        pendingExpenses += scenario.expense_record.amount;
      }

      console.log(`   Running Balance: ₹${balance}`);
      console.log(`   Pending Expenses: ₹${pendingExpenses}\n`);
    });

    return { balance, pendingExpenses };
  }

  getNetPosition() {
    const { balance, pendingExpenses } = this.calculateBalance();

    console.log("📊 FINAL POSITION:");
    console.log(`Raw Balance: ₹${balance}`);
    console.log(`Pending Expenses: ₹${pendingExpenses}`);
    console.log(`Net Position: ₹${balance + pendingExpenses}`);

    if (balance + pendingExpenses > 0) {
      console.log(`💰 Owner owes farmer: ₹${balance + pendingExpenses}`);
    } else if (balance + pendingExpenses < 0) {
      console.log(`💸 Farmer owes owner: ₹${Math.abs(balance + pendingExpenses)}`);
    } else {
      console.log("✅ Fully settled");
    }

    return balance + pendingExpenses;
  }

  // API Response Structure
  getFarmerBalanceAPI() {
    const { balance, pendingExpenses } = this.calculateBalance();

    return {
      farmer_id: "farmer_123",
      raw_balance: balance,
      pending_expenses: pendingExpenses,
      net_position: balance + pendingExpenses,
      summary: {
        owner_owes_farmer: Math.max(0, balance + pendingExpenses),
        farmer_owes_owner: Math.max(0, -(balance + pendingExpenses))
      },
      breakdown: {
        transactions: this.scenarios.filter(s => s.transaction_record),
        expenses: this.scenarios.filter(s => s.expense_record),
        payments: this.scenarios.filter(s => s.payment_record)
      }
    };
  }
}

// DEMONSTRATE YOUR SCENARIOS
console.log("🎯 YOUR BUSINESS SCENARIOS:\n");

const calc = new BalanceCalculator();

// Scenario 1: Farmer takes ₹300 transportation
calc.addTransportationExpense();

// Scenario 2: Farmer sells ₹1000 goods
calc.addTransaction(1000);

// Show current position
console.log("📋 AFTER EXPENSE + TRANSACTION:");
calc.getNetPosition();

console.log("\n" + "=".repeat(50) + "\n");

// Scenario 3: Owner pays ₹500 (net amount)
calc.addPayment(500, "BALANCE_SETTLEMENT");

console.log("💰 AFTER PAYMENT:");
calc.getNetPosition();

console.log("\n" + "=".repeat(50) + "\n");

// API Response Example
console.log("🔌 API RESPONSE STRUCTURE:");
console.log(JSON.stringify(calc.getFarmerBalanceAPI(), null, 2));