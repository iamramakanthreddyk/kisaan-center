const axios = require('axios');

const BASE = 'http://localhost:8000';
const CREDENTIALS = { username: 'ramakanthreddy_0_107', password: 'reddy@123' };

const expected = {
  today_sales: 0,
  today_transactions: 0,
  today_commission: 0,
  buyer_total_spent: 35046,
  farmer_total_earned: 6091.4,
  buyer_payments_due: 4000,
  farmer_payments_due: 27950,
  total_users: 4,
  commission_realized: 3504.6
};

async function login() {
  const r = await axios.post(`${BASE}/api/auth/login`, CREDENTIALS).catch(e => { throw new Error('Login failed: ' + (e.response ? JSON.stringify(e.response.data) : e.message)); });
  return r.data.data.token;
}

function approxEqual(a, b, tol = 0.01) {
  return Math.abs(Number(a) - Number(b)) <= tol;
}

async function run() {
  try {
    console.log('Logging in...');
    const token = await login();
    const headers = { Authorization: `Bearer ${token}` };

    console.log('Fetching analytics...');
    const anaResp = await axios.get(`${BASE}/api/transactions/analytics?shop_id=1`, { headers }).catch(e => { throw new Error('Analytics fetch failed: ' + (e.response ? JSON.stringify(e.response.data) : e.message)); });
    const analytics = anaResp.data?.data || anaResp.data;
  console.log('Analytics:', analytics);

    console.log('Fetching users...');
    const usersResp = await axios.get(`${BASE}/api/users`, { headers }).catch(e => { throw new Error('Users fetch failed: ' + (e.response ? JSON.stringify(e.response.data) : e.message)); });
    const users = usersResp.data?.data?.users || usersResp.data?.data || usersResp.data || [];
    console.log(`Fetched ${users.length} users`);
    // Print summary of users to inspect balances/cumulative
    console.log('Users detail:');
    for (const u of users) {
      // prefer DB role / cumulative_value when available
      const derivedType = u.role || u.type || u.user_type || (u.is_farmer? 'farmer': (u.is_buyer? 'buyer': undefined));
      const cumulative = u.cumulative_value ?? u.cumulative ?? u.cumulativeValue ?? 0;
      console.log(JSON.stringify({ id: u.id, username: u.username || u.name, role: u.role, type: derivedType, balance: u.balance, cumulative }, null, 2));
    }

    // Compute derived values from responses
    const computed = {};
    // Derive today values from daily array (if present)
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    let todayEntry = null;
    if (Array.isArray(analytics.daily)) {
      todayEntry = analytics.daily.find(d => d.date === todayStr) || null;
    }
    computed.today_sales = Number(todayEntry?.total_sales ?? 0);
    // daily may not contain transaction count; default to 0 when no entry
    computed.today_transactions = Number(todayEntry?.total_transactions ?? 0);
    computed.today_commission = Number(todayEntry?.total_commission ?? 0);
    computed.commission_realized = Number(analytics.commission_realized ?? analytics.total_commission ?? 0);

    // sum buyers payments/spent and farmers earned and payments due
    let buyer_total_spent = 0;
    let farmer_total_earned = 0;
    let buyer_payments_due = 0;
    let farmer_payments_due = 0;
    for (const u of users) {
      const derivedType = (u.role || u.type || u.user_type || (u.is_farmer ? 'farmer' : (u.is_buyer ? 'buyer' : '')) || '').toLowerCase();
      const balance = Number(u.balance || 0);
      const cumulative = Number(u.cumulative_value ?? u.cumulative ?? u.cumulativeValue ?? 0);
      // Keep buyer payments due computed from user balances (sum of positive buyer balances)
      if (derivedType === 'buyer' || u.is_buyer) {
        buyer_total_spent += cumulative;
        if (balance > 0) buyer_payments_due += balance; // buyer owes
      }
      // farmer_total_earned will prefer analytics field when available; still accumulate cumulative for fallback
      if (derivedType === 'farmer' || u.is_farmer) {
        farmer_total_earned += cumulative;
        // Do not use user balance to compute farmer_payments_due here; we'll prefer analytics.pending_to_farmer
      }
    }
  // Prefer analytics-provided realized aggregates if present
  computed.buyer_total_spent = Number(analytics.buyer_total_spent ?? buyer_total_spent.toFixed(2));
  computed.farmer_total_earned = Number(analytics.farmer_total_earned ?? farmer_total_earned.toFixed(2));
  computed.buyer_payments_due = Number(buyer_payments_due.toFixed(2));
  // For farmer payments due prefer analytics.status_summary.pending_to_farmer when available
  computed.farmer_payments_due = Number((analytics.status_summary?.pending_to_farmer ?? farmer_payments_due).toFixed ? Number((analytics.status_summary?.pending_to_farmer ?? farmer_payments_due)) : Number(analytics.status_summary?.pending_to_farmer ?? farmer_payments_due));
    computed.total_users = users.length;

    console.log('\nExpected:', expected);
    console.log('Computed:', computed);

    console.log('\nComparison results:');
    for (const k of Object.keys(expected)) {
      const exp = expected[k];
      const comp = computed[k];
      const ok = typeof comp !== 'undefined' && approxEqual(comp, exp, (typeof exp === 'number' && Math.abs(exp) > 100 ? 1 : 0.01));
      console.log(`${k}: expected=${exp} computed=${comp} => ${ok ? 'MATCH' : 'MISMATCH'}`);
    }

  } catch (err) {
    console.error('ERROR:', err.message || err);
    if (err.response?.data) console.error(err.response.data);
    process.exitCode = 2;
  }
}

if (require.main === module) run();
