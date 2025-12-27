// Shared ledger export utilities
import { exportLedgerCsv } from '../../../pages/ledger/api';

export interface ExportOptions {
  shopId: number;
  farmerId?: number;
  from?: string;
  to?: string;
  category?: string;
  filename?: string;
}

export const exportLedgerToCsv = async (options: ExportOptions): Promise<void> => {
  try {
    const { shopId, farmerId, from, to, category, filename = 'ledger-export.csv' } = options;

    const blob = await exportLedgerCsv(shopId, farmerId, from, to, category);

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error) {
    console.error('Export error:', error);
    alert('Error exporting data. Please try again.');
  }
};

export const exportLedgerToPdf = async (options: ExportOptions): Promise<void> => {
  // PDF export functionality can be added here later
  // For now, we'll use the print functionality as PDF
  alert('PDF export will open print dialog. Please select "Save as PDF" in your browser.');
  // This could be enhanced with a proper PDF library like jsPDF
};