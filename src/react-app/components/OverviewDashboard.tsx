import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Utensils, GlassWater, ShoppingBag, Users, Loader2, Calendar, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config/api';

interface SalesData {
  total: number;
  barSales: number;
  foodSales: number;
}

interface OverviewData {
  period: { start: string; end: string };
  sales: SalesData;
  orders: {
    total: number;
    completed: number;
    averageValue: number;
  };
  inventory: {
    topSellingItems: Array<{ name: string; quantity: number; revenue: number }>;
  };
  staff: {
    topPerformers: Array<{ name: string; orders: number; revenue: number }>;
  };
}

const formatCurrency = (amount: number): string => {
  return `KES ${(amount || 0).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const MetricCard = ({
  title,
  value,
  icon: Icon,
  color,
  subtext
}: {
  title: string;
  value: string | number;
  icon: any;
  color: string;
  subtext?: string;
}) => (
  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-medium text-gray-600">{title}</h3>
      <div className={`p-3 rounded-lg ${color.bg}`}>
        <Icon className={`w-6 h-6 ${color.text}`} />
      </div>
    </div>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
    {subtext && <p className="text-xs text-gray-500 mt-2">{subtext}</p>}
  </div>
);

export default function OverviewDashboard() {
  const { user } = useAuth();
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchOverviewData();
  }, [dateRange]);

  const fetchOverviewData = async () => {
    setIsLoading(true);
    setError(null);
    const token = localStorage.getItem('pos_token');

    try {
      const response = await fetch(
        `${API_URL}/api/reports/overview?start=${dateRange.start}&end=${dateRange.end}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch overview data');
      }

      const data = await response.json();
      setOverviewData(data);
      console.log('✅ Overview data loaded:', data);
    } catch (err) {
      console.error('❌ Error fetching overview:', err);
      setError('Failed to load overview data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
        <span className="ml-3 text-gray-600">Loading overview...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-red-800">Error Loading Overview</h3>
          <p className="text-sm text-red-700 mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!overviewData) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-semibold text-yellow-800">No Data Available</h3>
          <p className="text-sm text-yellow-700 mt-1">No sales data found for the selected period</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Overview Dashboard</h2>
          <p className="text-gray-600">Monitor revenue streams and business performance</p>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Period:</span>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
            />
            <span className="text-gray-500">to</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              min={dateRange.start}
            />
          </div>
        </div>
      </div>

      {/* Revenue Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Total Hotel Revenue"
          value={formatCurrency(overviewData.sales.total)}
          icon={TrendingUp}
          color={{ bg: 'bg-blue-50', text: 'text-blue-600' }}
          subtext={`${overviewData.orders.total} orders`}
        />

        <MetricCard
          title="Bar & Drink Sales"
          value={formatCurrency(overviewData.sales.barSales)}
          icon={GlassWater}
          color={{ bg: 'bg-purple-50', text: 'text-purple-600' }}
          subtext={`${((overviewData.sales.barSales / overviewData.sales.total) * 100 || 0).toFixed(1)}% of total`}
        />

        <MetricCard
          title="Food & Kitchen Sales"
          value={formatCurrency(overviewData.sales.foodSales)}
          icon={Utensils}
          color={{ bg: 'bg-orange-50', text: 'text-orange-600' }}
          subtext={`${((overviewData.sales.foodSales / overviewData.sales.total) * 100 || 0).toFixed(1)}% of total`}
        />
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard
          title="Average Order Value"
          value={formatCurrency(overviewData.orders.averageValue)}
          icon={ShoppingBag}
          color={{ bg: 'bg-green-50', text: 'text-green-600' }}
          subtext={`Total orders: ${overviewData.orders.total}`}
        />

        <MetricCard
          title="Top Staff Members"
          value={overviewData.staff.topPerformers.length}
          icon={Users}
          color={{ bg: 'bg-indigo-50', text: 'text-indigo-600' }}
          subtext={`Top performer: ${overviewData.staff.topPerformers[0]?.name || 'N/A'}`}
        />

        <MetricCard
          title="Top Items Sold"
          value={overviewData.inventory.topSellingItems[0]?.quantity || 0}
          icon={ShoppingBag}
          color={{ bg: 'bg-pink-50', text: 'text-pink-600' }}
          subtext={`${overviewData.inventory.topSellingItems[0]?.name || 'N/A'}`}
        />
      </div>

      {/* Top Performers */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Staff</h3>
        <div className="space-y-3">
          {overviewData.staff.topPerformers.length > 0 ? (
            overviewData.staff.topPerformers.map((performer, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center text-sm font-semibold text-yellow-700">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{performer.name}</p>
                    <p className="text-sm text-gray-500">{performer.orders} orders</p>
                  </div>
                </div>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(performer.revenue)}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No staff data available</p>
          )}
        </div>
      </div>

      {/* Top Selling Items */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Selling Items</h3>
        <div className="space-y-3">
          {overviewData.inventory.topSellingItems.length > 0 ? (
            overviewData.inventory.topSellingItems.slice(0, 5).map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-semibold text-blue-700">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.quantity} units sold</p>
                  </div>
                </div>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(item.revenue)}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-500">No item data available</p>
          )}
        </div>
      </div>
    </div>
  );
}
