# PDF Reports Feature

## Overview
The PDF Reports feature allows users to generate detailed reports for farmers, users, and shops with transaction data, payments, and balances.

## API Endpoints

### Generate Report
```
GET /api/reports/generate
```

**Query Parameters:**
- `shop_id` (required): Shop ID
- `report_type` (required): `farmer`, `user`, or `shop`
- `user_id` (required for farmer/user reports): User ID
- `date_from` (optional): Start date (YYYY-MM-DD)
- `date_to` (optional): End date (YYYY-MM-DD)
- `format` (optional): `json` or `pdf` (default: json)

**Example:**
```
GET /api/reports/generate?shop_id=1&report_type=farmer&user_id=123&date_from=2024-01-01&date_to=2024-12-31&format=pdf
```

### Download Report
```
GET /api/reports/download
```
Same parameters as generate, but returns file for download.

## Report Types

### 1. Farmer Report
- **Purpose**: Shows sales, payments, and balance for a specific farmer
- **Required**: `shop_id`, `user_id` (farmer)
- **Includes**:
  - Farmer information
  - All transactions where farmer sold products
  - Total sales amount
  - Commission deducted
  - Amount paid to farmer
  - Outstanding balance due to farmer
  - Transaction status breakdown

### 2. User Report  
- **Purpose**: Shows purchase history for a specific buyer
- **Required**: `shop_id`, `user_id` (buyer)
- **Includes**:
  - User information
  - All transactions where user bought products
  - Total purchases
  - Payment status
  - Transaction details

### 3. Shop Report
- **Purpose**: Complete shop overview with all transactions
- **Required**: `shop_id`
- **Includes**:
  - Shop information
  - All transactions
  - Total sales and commission
  - Outstanding amounts
  - Status summaries
  - Income breakdown

## Frontend Usage

### In Reports Page
1. Navigate to Reports → PDF Reports tab
2. Select report type (Shop/Farmer/User)
3. Choose user (if applicable)
4. Set date range (optional)
5. Click "Preview Report" or "Download PDF"

### Component Integration
```tsx
import PDFReportGenerator from '../components/PDFReportGenerator';

<PDFReportGenerator 
  shopId={shop.id} 
  users={users} 
/>
```

## Report Features

### Professional Layout
- KisaanCenter branding
- Clean, printable design
- Responsive tables
- Status color coding
- Summary cards

### Data Included
- **Header**: Shop/user info, date range, generation time
- **Summary**: Key metrics and totals
- **Transactions**: Detailed transaction table
- **Footer**: Contact information

### Export Options
- **Preview**: Opens in new window for viewing
- **Download**: Saves as HTML file (can be printed to PDF)

## Technical Implementation

### Backend
- **Service**: `pdfService.ts` - Data processing and HTML generation
- **Controller**: `reportController.ts` - API endpoints
- **Routes**: `reportRoutes.ts` - Route definitions

### Frontend
- **Component**: `PDFReportGenerator.tsx` - UI for report generation
- **Service**: `reportService.ts` - API calls
- **Integration**: Added to Reports page with tabs

## Usage Examples

### Generate Farmer Report
```bash
curl -X GET "http://localhost:3000/api/reports/generate?shop_id=1&report_type=farmer&user_id=123&date_from=2024-01-01&date_to=2024-12-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Download Shop Report
```bash
curl -X GET "http://localhost:3000/api/reports/download?shop_id=1&report_type=shop" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output shop-report.html
```

## Security
- Requires authentication token
- Users can only access reports for their own shops
- Role-based access control applied

## Future Enhancements
- PDF generation using puppeteer/headless Chrome
- Email delivery of reports
- Scheduled report generation
- Custom report templates
- Chart/graph integration