import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Building2, 
  Users, 
  TrendingUp, 
  DollarSign
} from 'lucide-react';

interface SuperadminStatsProps {
  stats: {
    total_shops: number;
    total_owners: number;
    total_users: number;
    total_revenue: number;
    active_shops: number;
    pending_settlements: number;
  };
  isLoading?: boolean;
}

const formatCurrency = (amount: number) => `₹${amount.toLocaleString()}`;

export const SuperadminStats: React.FC<SuperadminStatsProps> = ({ stats, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="h-8 w-8 bg-gray-200 rounded"></div>
                <div className="ml-4 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Shops",
      value: stats.total_shops.toString(),
      subtitle: `${stats.active_shops} active`,
      icon: Building2,
      color: "text-blue-600"
    },
    {
      title: "Total Users",
      value: stats.total_users.toString(),
      subtitle: `${stats.total_owners} owners`,
      icon: Users,
      color: "text-green-600"
    },
    {
      title: "Total Revenue",
      value: formatCurrency(stats.total_revenue),
      subtitle: "Platform wide",
      icon: TrendingUp,
      color: "text-purple-600"
    },
    {
      title: "Pending Settlements",
      value: stats.pending_settlements.toString(),
      subtitle: "Requires attention",
      icon: DollarSign,
      color: "text-orange-600"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((stat, index) => (
        <Card key={index} className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center">
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.subtitle}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};