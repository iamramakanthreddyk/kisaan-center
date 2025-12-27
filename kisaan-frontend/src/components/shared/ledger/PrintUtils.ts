// Shared print utilities for ledger components

export interface PrintData {
  overall?: {
    credit: string | number;
    debit: string | number;
    commission: string | number;
    balance: string | number;
  };
  period?: Array<{
    period: string;
    credit: string | number;
    debit: string | number;
    commission: string | number;
    balance: string | number;
  }>;
  entries?: Array<{
    transaction_date?: string;
    farmer_id: number;
    notes?: string;
    category: string;
    type: string;
    amount: number;
    commission_amount?: number;
    net_amount?: number;
  }>;
}

export interface PrintOptions {
  title: string;
  periodType?: string;
  farmerName?: string;
  dateRange?: string;
  categoryInfo?: string;
  generatedDate?: string;
  showEntries?: boolean;
  showSummary?: boolean;
  showPeriodBreakdown?: boolean;
  isOwner?: boolean;
}

export const generateLedgerPrintHTML = (
  data: PrintData,
  options: PrintOptions,
  allUsers: any[] = []
): string => {
  const {
    title,
    periodType,
    farmerName = 'All Farmers',
    dateRange = 'All Dates',
    categoryInfo = 'All Categories',
    generatedDate = new Date().toLocaleString('en-IN'),
    showEntries = false,
    showSummary = true,
    showPeriodBreakdown = false,
    isOwner = false
  } = options;

  // Create farmer name map
  const farmerNameMap = new Map();
  allUsers.forEach((user: any) => {
    let displayName;
    if (user.firstname && user.firstname.trim()) {
      displayName = user.firstname.trim();
    } else if (user.username && user.username.trim()) {
      displayName = user.username.trim();
    } else {
      displayName = `Farmer #${user.id}`;
    }
    farmerNameMap.set(Number(user.id), displayName);
  });

  // Determine terminology based on user role
  const creditLabel = isOwner ? 'Total Farmer Earnings' : 'Total Credit';
  const debitLabel = isOwner ? 'Amount Paid to Farmers' : 'Total Debit';
  const balanceLabel = isOwner ? 'Amount Owed to Farmers' : 'Net Balance';
  const balanceDescription = isOwner ? '(Positive = Shop owes farmers, Negative = Farmers owe shop)' : '';

  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .filters { background: #f8fafc; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #e2e8f0; }
        .summary { background: #f0f8ff; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #3b82f6; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .summary-item { text-align: center; }
        .summary-value { font-size: 24px; font-weight: bold; color: #1e40af; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f8fafc; font-weight: bold; color: #374151; }
        .positive { color: #059669; font-weight: bold; }
        .negative { color: #dc2626; font-weight: bold; }
        .commission { color: #d97706; font-weight: bold; }
        .total { font-weight: bold; background-color: #fef3c7; }
        @media print {
          body { margin: 0.5in; }
          .no-print { display: none !important; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🌾 ${title}</h1>
        ${periodType ? `<p><strong>Period Type:</strong> ${periodType}</p>` : ''}
        <p><strong>Generated:</strong> ${generatedDate}</p>
      </div>

      <div class="filters">
        <h3 style="margin-bottom: 15px; color: #1f2937; font-size: 18px; border-bottom: 2px solid #3b82f6; padding-bottom: 5px;">📋 Report Filters</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
          <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">
            <div style="font-weight: 600; color: #374151; font-size: 14px; margin-bottom: 4px;">👤 Farmer</div>
            <div style="color: #6b7280; font-size: 16px;">${farmerName}</div>
          </div>
          <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">
            <div style="font-weight: 600; color: #374151; font-size: 14px; margin-bottom: 4px;">📅 Date Range</div>
            <div style="color: #6b7280; font-size: 16px;">${dateRange}</div>
          </div>
          <div style="background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb;">
            <div style="font-weight: 600; color: #374151; font-size: 14px; margin-bottom: 4px;">🏷️ Category</div>
            <div style="color: #6b7280; font-size: 16px;">${categoryInfo}</div>
          </div>
        </div>
      </div>
  `;

  // Overall Summary
  if (showSummary && data.overall) {
    html += `
      <div class="summary">
        <h2>Summary Overview</h2>
        <div class="summary-grid">
          <div class="summary-item">
            <div>${creditLabel}</div>
            <div class="summary-value positive">₹${Number(data.overall.credit || 0).toLocaleString('en-IN')}</div>
          </div>
          <div class="summary-item">
            <div>${debitLabel}</div>
            <div class="summary-value negative">₹${Number(data.overall.debit || 0).toLocaleString('en-IN')}</div>
          </div>
          <div class="summary-item">
            <div>Total Commission</div>
            <div class="summary-value commission">₹${Number(data.overall.commission || 0).toLocaleString('en-IN')}</div>
          </div>
          <div class="summary-item">
            <div>${balanceLabel}</div>
            <div class="summary-value ${Number(data.overall.balance || 0) >= 0 ? 'positive' : 'negative'}">₹${Number(data.overall.balance || 0).toLocaleString('en-IN')}</div>
            ${balanceDescription ? `<div style="font-size: 12px; color: #666; margin-top: 4px;">${balanceDescription}</div>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  // Period Breakdown
  if (showPeriodBreakdown && data.period && data.period.length > 0) {
    html += `
      <h2>${periodType || 'Period'} Breakdown</h2>
      <table>
        <thead>
          <tr>
            <th>Period</th>
            <th>Credit</th>
            <th>Debit</th>
            <th>Commission</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          ${data.period.map(p => `
            <tr>
              <td>${p.period}</td>
              <td class="positive">₹${Number(p.credit).toLocaleString('en-IN')}</td>
              <td class="negative">₹${Number(p.debit).toLocaleString('en-IN')}</td>
              <td style="color: #ff9800;">₹${Number(p.commission).toLocaleString('en-IN')}</td>
              <td class="${Number(p.balance) >= 0 ? 'positive' : 'negative'}">₹${Number(p.balance).toLocaleString('en-IN')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  // Transaction Details
  if (showEntries && data.entries && data.entries.length > 0) {
    html += `
      <h2>Transaction Details</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Farmer</th>
            <th>Description</th>
            <th>Category</th>
            <th>Credit</th>
            <th>Debit</th>
            <th>Commission</th>
            <th>Balance</th>
          </tr>
        </thead>
        <tbody>
          ${data.entries.map(entry => `
            <tr>
              <td>${entry.transaction_date ? new Date(entry.transaction_date).toLocaleDateString('en-IN') : 'N/A'}</td>
              <td>${farmerNameMap.get(entry.farmer_id) || `Farmer #${entry.farmer_id}`}</td>
              <td>${entry.notes || '-'}</td>
              <td>${entry.category}</td>
              <td class="positive">${entry.type === 'credit' ? `₹${Number(entry.amount).toLocaleString('en-IN')}` : '-'}</td>
              <td class="negative">${entry.type === 'debit' ? `₹${Number(entry.amount).toLocaleString('en-IN')}` : '-'}</td>
              <td class="commission">${entry.commission_amount ? `₹${Number(entry.commission_amount).toLocaleString('en-IN')}` : '-'}</td>
              <td class="${Number(entry.net_amount || 0) >= 0 ? 'positive' : 'negative'}">₹${Number(entry.net_amount || 0).toLocaleString('en-IN')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  } else if (showEntries && (!data.entries || data.entries.length === 0)) {
    html += `
      <h2>Transaction Details</h2>
      <table>
        <tbody>
          <tr>
            <td colspan="8" style="text-align: center; padding: 20px;">No transactions found for the selected filters.</td>
          </tr>
        </tbody>
      </table>
    `;
  }

  html += `
    </body>
    </html>
  `;

  return html;
};

export const printLedgerReport = (
  data: PrintData,
  options: PrintOptions,
  allUsers: any[] = []
): void => {
  try {
    const html = generateLedgerPrintHTML(data, options, allUsers);
    const printWindow = window.open('', '_blank');

    if (!printWindow) {
      alert('Please allow popups for this site to print reports.');
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  } catch (error) {
    console.error('Print error:', error);
    alert('Error generating print report. Please try again.');
  }
};