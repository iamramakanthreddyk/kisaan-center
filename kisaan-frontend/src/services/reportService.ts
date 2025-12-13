
import { apiClient } from './apiClient';

interface ReportFilters {
  shop_id: string;
  user_id?: string;
  date_from?: string;
  date_to?: string;
  report_type: 'farmer' | 'user' | 'shop';
}

export const reportService = {

  async generateReport(filters: ReportFilters) {
    // This method is now for export only (download)
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    // Use apiClient to get blob for export
    const response = await apiClient.fetchBlob(`/reports/generate?${params.toString()}`);
    const url = window.URL.createObjectURL(response);
    const link = document.createElement('a');
    link.href = url;
    const extension = 'pdf';
    link.download = `${filters.report_type}-report-${Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },


  async downloadReport(filters: ReportFilters) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    // Use apiClient to get blob
    const response = await apiClient.fetchBlob(`/reports/download?${params.toString()}`);
    const url = window.URL.createObjectURL(response);
    const link = document.createElement('a');
    link.href = url;
    const extension = 'pdf';
    link.download = `${filters.report_type}-report-${Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  async previewReport(filters: ReportFilters) {
    // This method fetches JSON data for preview
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.append(key, value);
    });
    // Do NOT append format=pdf for preview
    // Use apiClient to get JSON data
    return await apiClient.get(`/reports/generate?${params.toString()}`);
  }
};