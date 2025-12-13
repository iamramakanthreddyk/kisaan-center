import { useState, useCallback } from 'react';
import {
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Input,
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from "@/components/ui";
import { Calendar, Loader2, FileText, Download, User } from "lucide-react";
// import { useTransactionStore } from "@/stores/transactionStore";
import { useToast } from "@/components/ui/use-toast";
// import { exportTransactionsPDF } from "@/lib/pdfExport";
// import { formatDate, getToday } from "@/lib/dateUtils";
import { reportService } from "@/services/reportService";
// Type definitions
// Temporary stubs for missing functions/constants
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const useTransactionStore = (..._args: unknown[]) => [];
const getToday = () => new Date().toISOString().slice(0, 10);
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const exportTransactionsPDF = (..._args: unknown[]) => {};
const formatDate = (date: string) => date;
type UserType = { readonly id: string; readonly username: string; readonly role: string };
interface PDFReportGeneratorProps {
  readonly shopId: string;
  readonly users?: ReadonlyArray<UserType>;
}
type ReportRow = {
  id: string | number;
  transaction_id: string | number;
  created_at: string;
  product?: string;
  buyer?: string;
  farmer?: string;
  quantity?: number | string;
  unit_price?: number | string;
  total_amount?: number | string;
  paid_amount?: number | string;
  [key: string]: unknown;
};

export default function PDFReportGenerator({ shopId, users = [] }: PDFReportGeneratorProps) {
  const userSelector = useCallback(
    (state: { usersByShop?: Record<string, UserType[]> }) => (state.usersByShop?.[shopId] || []).map((u: UserType) => ({
      id: String(u.id),
      username: u.username,
      role: u.role
    })),
    [shopId]
  );
  const zustandUsers: UserType[] = useTransactionStore(userSelector);
  const allUsers: ReadonlyArray<UserType> = zustandUsers.length > 0 ? zustandUsers : users;


  // Helper to get display name
  const getDisplayName = (username: string | undefined): string => {
    const uname = typeof username === 'string' ? username : '';
    const user = allUsers.find(u => u.username === uname);
    return user ? user.username + (user.role ? ` (${user.role})` : '') : uname;
  };

  // Helper to sum paid amounts for multi-party payments
  const isPayment = (p: unknown): p is { status: string; amount: number|string } => {
    return typeof p === 'object' && p !== null && 'status' in p && 'amount' in p;
  };
  const getPaidAmount = (row: ReportRow): number => {
    if (Array.isArray(row.payments)) {
      return row.payments
        .filter(isPayment)
        .filter(p => p.status === 'PAID')
        .reduce((sum: number, p) => sum + Number(p.amount), 0);
    }
    return typeof row.paid_amount === 'number' ? row.paid_amount : Number(row.paid_amount) || 0;
  };

  const [reportRows, setReportRows] = useState<ReportRow[]>([]);
  const [reportType, setReportType] = useState<'farmer' | 'user' | 'shop'>('shop');
  const [selectedUser, setSelectedUser] = useState('');
  const [dateFrom, setDateFrom] = useState(getToday());
  const [dateTo, setDateTo] = useState(getToday());
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleExportPDF = (): void => {
    if (!reportRows.length) {
      toast({ title: 'Error', description: 'No report data to export.', variant: 'destructive' });
      return;
    }
    try {
      const titleMap: Record<string,string> = {
        shop: 'Shop Transactions Report',
        farmer: 'Farmer Transactions Report',
        user: 'User Transactions Report'
      };
      const title = titleMap[reportType] || 'Report';
      const mapped = reportRows.map((row, idx) => ({
        id: row.transaction_id || row.id || idx + 1,
        transaction_id: row.transaction_id || row.id || idx + 1,
        created_at: typeof row.created_at === 'string' ? row.created_at : '',
        product_name: typeof row.product === 'string' ? row.product : '',
        buyer_name: getDisplayName(row.buyer),
        farmer_name: getDisplayName(row.farmer),
        total_sale_value: typeof row.total_amount === 'number' ? row.total_amount : row.total_amount || '',
        paid_amount: getPaidAmount(row),
        quantity: typeof row.quantity === 'number' ? row.quantity : row.quantity || '',
        unit_price: typeof row.unit_price === 'number' ? row.unit_price : row.unit_price || '',
      }));
      exportTransactionsPDF(mapped, {
        title,
        generatedBy: selectedUser ? `User ${selectedUser}` : 'System',
        dateRange: { from: dateFrom, to: dateTo }
      });
      toast({ title: 'Success', description: 'PDF exported successfully!' });
    } catch {
      toast({ title: 'Error', description: 'Failed to export PDF. Please try again.', variant: 'destructive' });
    }
  };

  const handleGenerateReport = async (): Promise<void> => {
    setIsGenerating(true);
    try {
      interface ReportFilters {
        shop_id: string;
        report_type: 'shop' | 'farmer' | 'user';
        date_from?: string;
        date_to?: string;
        user_id?: string;
      }
      const filters: ReportFilters = {
        shop_id: shopId,
        report_type: reportType
      };
      if (dateFrom) filters.date_from = formatDate(dateFrom);
      if (dateTo) filters.date_to = formatDate(dateTo);
      if (selectedUser) filters.user_id = selectedUser;
      const response = await reportService.previewReport(filters);
      const rows = response && typeof response === 'object' && 'data' in response && Array.isArray((response as { data?: unknown[] }).data)
        ? (response as { data?: unknown[] }).data as ReportRow[]
        : [];
      setReportRows(rows);
      if (rows.length === 0) {
        toast({ title: 'No Data', description: 'No report data found for the selected filters.', variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Error', description: 'Failed to generate report', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
    }
  };

  const isUserRequired = reportType === 'farmer' || reportType === 'user';
  const farmers = allUsers.filter(u => u.role === 'farmer');
  const buyers = allUsers.filter(u => u.role === 'buyer');
  const availableUsers = reportType === 'farmer' ? farmers : buyers;

  // Subcomponents
  function ReportTypeSelect() {
    return (
      <div className="flex flex-col gap-2">
        <Label htmlFor="reportType" className="text-xs">Report Type</Label>
        <Select value={reportType} onValueChange={(value: 'farmer' | 'user' | 'shop') => { setReportType(value); setSelectedUser(''); }}>
          <SelectTrigger className="text-sm px-2 py-1 rounded-md">
            <SelectValue placeholder="Select report type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="shop">Shop Report (All Transactions)</SelectItem>
            <SelectItem value="farmer">Farmer Report (Sales & Payments)</SelectItem>
            <SelectItem value="user">User Report (Purchases)</SelectItem>
          </SelectContent>
        </Select>
      </div>
    );
  }

  function UserSelect() {
    if (!isUserRequired) return null;
    return (
      <div className="flex flex-col gap-2">
        <Label htmlFor="user" className="text-xs">
          Select {reportType === 'farmer' ? 'Farmer' : 'User'}
        </Label>
        <Select value={selectedUser} onValueChange={setSelectedUser}>
          <SelectTrigger className="text-sm px-2 py-1 rounded-md">
            <SelectValue placeholder={`Select ${reportType}`} />
          </SelectTrigger>
          <SelectContent>
            {availableUsers.length > 0 ? availableUsers.map(user => (
              <SelectItem key={user.id} value={user.id}>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {user.username} ({user.role})
                </div>
              </SelectItem>
            )) : (
              <div className="text-xs text-muted-foreground px-2 py-1">
                No {reportType}s found. Please add {reportType}s first.
              </div>
            )}
          </SelectContent>
        </Select>
      </div>
    );
  }

  function DateRangeInputs() {
    return (
      <div className="flex flex-col gap-2 w-full">
        <div className="flex flex-col md:flex-row gap-2 w-full">
          <div className="flex flex-col flex-1">
            <Label htmlFor="dateFrom" className="text-xs mb-1">From</Label>
            <div className="relative w-full flex items-center gap-2">
              <Calendar className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
              <Input id="dateFrom" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="pl-8 text-sm py-1 rounded-md w-full" min="2020-01-01" max={getToday()} />
              {dateFrom && (
                <Button type="button" size="sm" variant="ghost" className="px-2 py-1" onClick={() => setDateFrom('')}>
                  Clear
                </Button>
              )}
            </div>
            <span className="block md:hidden text-xs text-muted-foreground mt-1">Selected: {dateFrom || 'None'}</span>
          </div>
          <div className="flex flex-col flex-1">
            <Label htmlFor="dateTo" className="text-xs mb-1">To</Label>
            <div className="relative w-full flex items-center gap-2">
              <Calendar className="absolute left-2 top-2 h-4 w-4 text-muted-foreground" />
              <Input id="dateTo" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="pl-8 text-sm py-1 rounded-md w-full" min="2020-01-01" max={getToday()} />
              {dateTo && (
                <Button type="button" size="sm" variant="ghost" className="px-2 py-1" onClick={() => setDateTo('')}>
                  Clear
                </Button>
              )}
            </div>
            <span className="block md:hidden text-xs text-muted-foreground mt-1">Selected: {dateTo || 'None'}</span>
          </div>
        </div>
      </div>
    );
  }

// Moved out: ActionButtons
function ActionButtons({
  onPreview,
  onExport,
  isGenerating,
  isUserRequired,
  selectedUser,
  reportRows
}: {
  onPreview: () => void;
  onExport: () => void;
  isGenerating: boolean;
  isUserRequired: boolean;
  selectedUser: string;
  reportRows: ReportRow[];
}) {
  return (
    <div className="flex flex-row gap-2 pt-2 w-full justify-between">
      <Button onClick={onPreview} disabled={isGenerating || (isUserRequired && !selectedUser)} className="text-xs px-2 py-1 rounded-md flex-1" variant="outline">
        {isGenerating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
        Preview
      </Button>
      <Button onClick={onExport} disabled={!reportRows.length} className="text-xs px-2 py-1 rounded-md flex-1" variant="outline">
        <Download className="h-4 w-4 mr-1" />
        Export as PDF
      </Button>
    </div>
  );
}

  function HelpText() {
    return (
      <div className="text-xs text-muted-foreground space-y-1 pt-2">
        <p><strong>Shop Report:</strong> All transactions for the shop. PDF is branded with Kisaan Center logo and ready for printing.</p>
        <p><strong>Farmer Report:</strong> Sales, payments, and balance for a specific farmer</p>
        <p><strong>User Report:</strong> Purchase history for a specific buyer</p>
        <p>Leave dates empty to include all transactions.</p>
      </div>
    );
  }

  function PreviewTable() {
    if (!reportRows.length) return null;
    return (
      <div className="overflow-x-auto border rounded-md p-2 bg-muted/30">
        <table className="min-w-full text-xs">
          <thead>
            <tr>
              <th className="px-2 py-1">Txn ID</th>
              <th className="px-2 py-1">Date</th>
              <th className="px-2 py-1">Product</th>
              <th className="px-2 py-1">Buyer</th>
              <th className="px-2 py-1">Farmer</th>
              <th className="px-2 py-1">Quantity</th>
              <th className="px-2 py-1">Unit Price</th>
              <th className="px-2 py-1">Sale Value</th>
              <th className="px-2 py-1">Paid Amount</th>
            </tr>
          </thead>
          <tbody>
            {reportRows.map((row, idx) => (
              <tr key={row.transaction_id || row.id || idx} className="border-b">
                <td className="px-2 py-1">{row.transaction_id || row.id}</td>
                <td className="px-2 py-1">{row.created_at || ''}</td>
                <td className="px-2 py-1">{typeof row.product === 'string' || typeof row.product === 'number' ? row.product : ''}</td>
                <td className="px-2 py-1">{getDisplayName(row.buyer)}</td>
                <td className="px-2 py-1">{getDisplayName(row.farmer)}</td>
                <td className="px-2 py-1">{typeof row.quantity === 'string' || typeof row.quantity === 'number' ? row.quantity : ''}</td>
                <td className="px-2 py-1">{typeof row.unit_price === 'string' || typeof row.unit_price === 'number' ? row.unit_price : ''}</td>
                <td className="px-2 py-1">{typeof row.total_amount === 'string' || typeof row.total_amount === 'number' ? row.total_amount : ''}</td>
                <td className="px-2 py-1">{getPaidAmount(row)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Main render
  return (
    <Card className="p-2">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-5 w-5" />
          Generate PDF Report
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 p-2">
        <ReportTypeSelect />
        <UserSelect />
        <DateRangeInputs />
        <ActionButtons
          onPreview={handleGenerateReport}
          onExport={handleExportPDF}
          isGenerating={isGenerating}
          isUserRequired={isUserRequired}
          selectedUser={selectedUser}
          reportRows={reportRows}
        />
        <HelpText />
        <PreviewTable />
      </CardContent>
    </Card>
  );
}
