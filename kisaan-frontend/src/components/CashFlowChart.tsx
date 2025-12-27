import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { TrendingUp } from 'lucide-react';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface CashFlowChartProps {
  periodData: Array<{
    period: string;
    credit: string | number;
    debit: string | number;
    commission: string | number;
    balance: string | number;
  }>;
  periodType: 'weekly' | 'monthly';
}

const CashFlowChart: React.FC<CashFlowChartProps> = ({ periodData, periodType }) => {
  // Prepare data for the chart
  const labels = periodData.map(item => item.period);

  const creditData = periodData.map(item => Number(item.credit) || 0);
  const debitData = periodData.map(item => Number(item.debit) || 0);
  const commissionData = periodData.map(item => Number(item.commission) || 0);
  const balanceData = periodData.map(item => Number(item.balance) || 0);

  const data = {
    labels,
    datasets: [
      {
        label: 'Credit (Farmer Earnings)',
        data: creditData,
        borderColor: 'rgb(34, 197, 94)', // green-500
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: false,
        pointBackgroundColor: 'rgb(34, 197, 94)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
      },
      {
        label: 'Debit (Payments to Farmers)',
        data: debitData,
        borderColor: 'rgb(239, 68, 68)', // red-500
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        fill: false,
        pointBackgroundColor: 'rgb(239, 68, 68)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
      },
      {
        label: 'Commission (Shop Earnings)',
        data: commissionData,
        borderColor: 'rgb(245, 158, 11)', // amber-500
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.4,
        fill: false,
        pointBackgroundColor: 'rgb(245, 158, 11)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
      },
      {
        label: 'Net Balance (Payable to Farmers)',
        data: balanceData,
        borderColor: 'rgb(59, 130, 246)', // blue-500
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        tension: 0.4,
        fill: false,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 10,
          font: {
            size: 11,
          },
          boxWidth: 8,
          boxHeight: 8,
        },
      },
      title: {
        display: false,
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        cornerRadius: 8,
        displayColors: true,
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            label += '₹' + Number(context.parsed.y).toLocaleString('en-IN');
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Period',
          font: {
            size: 14,
            weight: 'bold' as const,
          },
        },
        grid: {
          display: false,
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Amount (₹)',
          font: {
            size: 14,
            weight: 'bold' as const,
          },
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.1)',
        },
        ticks: {
          callback: function(value: any) {
            return '₹' + Number(value).toLocaleString('en-IN');
          },
        },
      },
    },
    elements: {
      point: {
        hoverRadius: 8,
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Chart */}
      <Card>
        <CardHeader className="pb-2 sm:pb-4">
          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
         
            <span className="hidden sm:inline">Farmer Transactions & Shop Earnings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-2 sm:pt-4">
          <div className="hidden sm:block mb-4 text-sm text-gray-600">
            Track farmer earnings, payments, shop commissions, and outstanding balances over time
          </div>
          <div className="h-72 sm:h-80 md:h-96">
            <Line data={data} options={options} />
          </div>
          <div className="hidden sm:block mt-4 text-sm text-gray-600">
            <p className="mb-2">
              <strong>💡 Insights:</strong>
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Green line shows income trends over time</li>
              <li>Red line indicates expense patterns</li>
              <li>Orange line represents commission earnings</li>
              <li>Blue line shows net balance progression</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CashFlowChart;