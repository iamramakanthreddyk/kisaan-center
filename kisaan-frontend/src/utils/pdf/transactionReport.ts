// ...existing code...
// Helper: format ISO date string to readable format
function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  // Format: DD MMM YYYY, HH:mm (24h)
  const day = d.getDate().toString().padStart(2, '0');
  const month = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, '0');
  const mins = d.getMinutes().toString().padStart(2, '0');
  return `${day} ${month} ${year}, ${hours}:${mins}`;
}
// Global helper: enrich transactions with user names from user context
// Removed conflicting import
type UserLike = { id: string | number; firstname?: string };
type ShopLike = { id: string | number; name?: string };
// Removed local interfaces, use exported ones below
export function enrichTransactionsWithNames(transactions: TransactionLike[], users: UserLike[], shops?: ShopLike[]): TransactionLike[] {
  const userMap: Record<string, UserLike> = {};
  users.forEach(u => { userMap[String(u.id)] = u; });
  const shopMap: Record<string, ShopLike> = {};
  if (shops && Array.isArray(shops)) {
    shops.forEach(s => { shopMap[String(s.id)] = s; });
  }
  return transactions.map(t => {
    // Use total_amount as fallback for total_sale_value
    let total_sale_value = t.total_sale_value;
    if (
      total_sale_value === undefined ||
      total_sale_value === null ||
      total_sale_value === '' ||
      isNaN(Number(total_sale_value))
    ) {
      if (typeof t.total_amount !== 'undefined' && t.total_amount !== null && !isNaN(Number(t.total_amount))) {
        total_sale_value = Number(t.total_amount);
      } else if (typeof t.quantity !== 'undefined' && typeof t.unit_price !== 'undefined') {
        total_sale_value = Number(t.quantity) * Number(t.unit_price);
      } else if (typeof t.quantity !== 'undefined' && typeof t.rate !== 'undefined') {
        total_sale_value = Number(t.quantity) * Number(t.rate);
      }
    }
    // Use unit_price as fallback for rate
    let rate = t.rate;
    if (rate === undefined || rate === null || rate === '' || isNaN(Number(rate))) {
      if (typeof t.unit_price !== 'undefined' && t.unit_price !== null && !isNaN(Number(t.unit_price))) {
        rate = Number(t.unit_price);
      }
    }
    // Calculate buyer_paid: sum of payments where payer_type is BUYER
    let buyer_paid = 0;
    if (Array.isArray(t.payments)) {
      buyer_paid = t.payments
        .filter((p: PaymentLike) => p.payer_type === 'BUYER' && !isNaN(Number(p.amount)))
        .reduce((sum: number, p: PaymentLike) => sum + Number(p.amount), 0);
    }
    // Calculate farmer_paid: sum of payments where payee_type is FARMER
    let farmer_paid = 0;
    if (Array.isArray(t.payments)) {
      farmer_paid = t.payments
        .filter((p: PaymentLike) => p.payee_type === 'FARMER' && !isNaN(Number(p.amount)))
        .reduce((sum: number, p: PaymentLike) => sum + Number(p.amount), 0);
    }
    return {
      ...t,
      buyer_name: userMap[String(t.buyer_id)]?.firstname || 'Unknown',
      farmer_name: userMap[String(t.farmer_id)]?.firstname || 'Unknown',
      shop_name: shopMap[String(t.shop_id)]?.name || 'Shop',
      total_sale_value,
      rate,
      buyer_paid,
      farmer_paid,
    };
  });
}

// Helper: get payment label using only transaction's names (simple mapping)
function getPaymentLabelSimple(p: PaymentLike, t: TransactionLike): string {
  const payerRole = String(p.payer_type);
  const payeeRole = String(p.payee_type);
  const buyerName = t.buyer_name || 'Unknown';
  const farmerName = t.farmer_name || 'Unknown';
  const shopName = t.shop_name || 'Shop';
  if (payerRole === 'SHOP' && payeeRole === 'FARMER') {
    return `Paid by ${shopName} (SHOP) to Seller (${farmerName})`;
  }
  if (payerRole === 'BUYER' && payeeRole === 'SHOP') {
    return `Paid by Buyer (${buyerName}) to ${shopName} (SHOP)`;
  }
  if (payerRole === 'SHOP' && payeeRole === 'SHOP') {
    return `Commission (${shopName})`;
  }
  // fallback for any other case
  return `Paid by ${payerRole} to ${payeeRole}`;
}
import jsPDF from 'jspdf';

export interface PaymentLike {
  id?: string | number;
  payer?: string;
  payee?: string;
  amount?: number | string;
  method?: string;
  payment_date?: string; // already formatted date string
  status?: string;
  payer_type?: string;
  payee_type?: string;
  created_at?: string;
}

export interface TransactionLike {
  id?: string | number;
  transaction_id?: string | number;
  created_at?: string;
  product_name?: string;
  buyer_name?: string;
  farmer_name?: string;
  shop_name?: string;
  total_sale_value?: number | string;
  buyer_paid?: number | string;
  deficit?: number | string; // buyer pending
  farmer_paid?: number | string;
  farmer_due?: number | string; // farmer pending
  payments?: PaymentLike[];
  total_amount?: number | string;
  quantity?: number | string;
  unit_price?: number | string;
  rate?: number | string;
  buyer_id?: string | number;
  farmer_id?: string | number;
  shop_id?: string | number;
}

interface ExportOptions {
  title?: string;
  shopName?: string;
  dateRange?: { from?: string; to?: string };
  generatedBy?: string;
  ownerFirstName?: string;
  ownerUsername?: string;
}

const formatCurrency = (value: number | string | undefined) => {
  if (value === undefined || value === null || value === '') return 'Rs. 0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'Rs. 0';
  return 'Rs. ' + num.toLocaleString('en-IN');
};

// Accepts optional users context to resolve names
export function exportTransactionsPDF(
  transactions: TransactionLike[],
  options: ExportOptions = {},
  users?: UserLike[]
) {
  if (!transactions || transactions.length === 0) return;
  // If users context is provided, enrich transactions with names
  const txs = users ? enrichTransactionsWithNames(transactions, users) : transactions;
  // Build userMap for payment label resolution
  const userMap: Record<string, UserLike> = {};
  if (users) users.forEach(u => { userMap[String(u.id)] = u; });
  const doc = new jsPDF({ orientation: 'landscape' });
  let y = 14;

  // Header
  doc.setFontSize(14);
  doc.text(options.title || 'Transactions Report', 14, y);
  y += 6;
  doc.setFontSize(10);
  if (options.shopName) { doc.text(`Shop: ${options.shopName}`, 14, y); y += 5; }
  if (options.dateRange) {
    const dr = options.dateRange;
    if (dr.from || dr.to) { doc.text(`Period: ${dr.from || ''} to ${dr.to || ''}`, 14, y); y += 5; }
  }
  if (options.shopName) {
    doc.text(`Generated By: ${options.shopName}`, 14, y); y += 5;
  } else if (options.ownerFirstName || options.ownerUsername) {
    const ownerLabel = options.ownerFirstName ? options.ownerFirstName : options.ownerUsername;
    doc.text(`Generated By: ${ownerLabel}`, 14, y); y += 5;
  } else if (options.generatedBy) {
    doc.text(`Generated By: ${options.generatedBy}`, 14, y); y += 5;
  }
  // Summary totals
  const totals = txs.reduce((acc, t) => {
    const toNum = (v: number | string | undefined) => { const n = typeof v === 'string' ? parseFloat(v) : v ?? 0; return isNaN(Number(n)) ? 0 : Number(n); };
    acc.total += toNum(t.total_sale_value);
    acc.buyerPaid += toNum(t.buyer_paid);
    acc.buyerPending += toNum(t.deficit);
    acc.farmerPaid += toNum(t.farmer_paid);
    acc.farmerPending += toNum(t.farmer_due);
    return acc;
  }, { total:0, buyerPaid:0, buyerPending:0, farmerPaid:0, farmerPending:0 });
  doc.setFont('helvetica', 'bold');
  doc.text(
    `Totals: Sale ${formatCurrency(totals.total)}`,
    14, y, { maxWidth: 260 }
  );
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Buyer Paid ${formatCurrency(totals.buyerPaid)} | Buyer Pending ${formatCurrency(totals.buyerPending)} | Farmer Paid ${formatCurrency(totals.farmerPaid)} | Farmer Pending ${formatCurrency(totals.farmerPending)}`,
    14, y + 5, { maxWidth: 260 }
  );
  y += 13;
  doc.setDrawColor(180); doc.line(10, y, 285, y); y += 6;

  const pageHeight = doc.internal.pageSize.getHeight();
  // const contentWidth = 275; // landscape width minus margins (unused)
  const leftX = 14;

  const ensureSpace = (linesNeeded: number) => {
    if (y + linesNeeded > pageHeight - 12) {
      doc.addPage();
      y = 14;
      doc.setFontSize(12);
      doc.text('Transactions (cont.)', leftX, y); y += 6;
      doc.setDrawColor(180); doc.line(10, y, 285, y); y += 4;
      doc.setFontSize(10);
    }
  };

  // One transaction per row: left = info, right = payments
  const colWidth = (doc.internal.pageSize.getWidth() - 28) / 2; // 2 columns, 14 margin each side
  let rowY = y;
  for (let i = 0; i < txs.length; i++) {
    ensureSpace(36);
    const t = txs[i];
    const infoX = 14;
    const paymentsX = infoX + colWidth;
    let txY = rowY;
    // Left: transaction info
    doc.setFontSize(11);
    const txId = t.transaction_id || t.id || i + 1;
    doc.setFont('helvetica', 'bold');
    doc.text(`Txn #${txId}`, infoX, txY);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
  if (t.created_at) doc.text(formatDisplayDate(t.created_at), infoX + 35, txY);
    txY += 5;
    doc.setFont('helvetica', 'bold');
    doc.text(`Product: ${t.product_name || ''}`, infoX + 4, txY);
    txY += 5;
    doc.text(`Buyer: ${t.buyer_name || ''}`, infoX + 4, txY);
    txY += 5;
    doc.text(`Seller: ${t.farmer_name || ''}`, infoX + 4, txY);
    txY += 5;
    doc.text(`Total: ${formatCurrency(t.total_sale_value)}`, infoX + 4, txY);
    txY += 5;
    doc.setFont('helvetica', 'normal');
    doc.text(`Buyer Paid: ${formatCurrency(t.buyer_paid)} | Buyer Pending: ${formatCurrency(t.deficit)}`, infoX + 4, txY);
    txY += 5;
    doc.text(`Farmer Paid: ${formatCurrency(t.farmer_paid)} | Farmer Pending: ${formatCurrency(t.farmer_due)}`, infoX + 4, txY);
    // Right: payments
    let payY = rowY;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Payments:', paymentsX, payY); payY += 5;
    doc.setFont('helvetica', 'normal');
    if (t.payments && t.payments.length) {
      t.payments.forEach((p: PaymentLike) => {
        ensureSpace(6);
        const label = getPaymentLabelSimple(p, t);
        const amount = formatCurrency(p.amount || 0);
        const method = p.method || '';
  const date = p.payment_date ? `, ${formatDisplayDate(p.payment_date)}` : '';
        const prefix = '• ' + label + ': ';
        const suffix = ` (${method}${date})`;
        doc.setFont('helvetica', 'normal');
        const prefixWidth = doc.getTextWidth(prefix);
        const amountWidth = doc.getTextWidth(amount);
        const startX = paymentsX + 2;
        doc.text(prefix, startX, payY);
        doc.setFont('helvetica', 'bold');
        doc.text(amount, startX + prefixWidth, payY);
        doc.setFont('helvetica', 'normal');
        doc.text(suffix, startX + prefixWidth + amountWidth, payY);
        payY += 5;
      });
    } else {
      doc.text('No payments', paymentsX + 2, payY); payY += 5;
    }
    // Divider (full row)
    const dividerY = Math.max(txY, payY) + 2;
    doc.setDrawColor(230); doc.line(infoX + 2, dividerY, infoX + 2 + colWidth * 2 - 4, dividerY);
    rowY = dividerY + 6;
    // Add new page if needed
    if (rowY > doc.internal.pageSize.getHeight() - 24) {
      doc.addPage();
      rowY = 14;
    }
  }

  doc.save('transactions.pdf');
}
