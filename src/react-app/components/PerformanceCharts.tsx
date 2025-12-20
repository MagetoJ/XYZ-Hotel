import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell
} from 'recharts';

interface WaiterPerformance {
  staffId: number;
  name: string;
  employeeId: string;
  totalOrders: number;
  completedOrders: number;
  totalSales: number;
  avgRating: string;
}

interface PerformanceChartsProps {
  waiterData?: WaiterPerformance[];
  barSales?: number;
  foodSales?: number;
}

export default function PerformanceCharts({ waiterData = [], barSales = 0, foodSales = 0 }: PerformanceChartsProps) {
  const waiterChartData = waiterData.map(waiter => ({
    name: waiter.name.split(' ')[0],
    revenue: waiter.totalSales,
    orders: waiter.totalOrders,
    rating: parseFloat(waiter.avgRating) || 0
  }));

  const salesComparisonData = [
    { name: 'Bar Sales', amount: barSales },
    { name: 'Food Sales', amount: foodSales },
  ];

  const formatCurrency = (value: number) => {
    return `KES ${(value / 1000).toFixed(0)}k`;
  };

  return (
    <div className="space-y-6">
      {(barSales > 0 || foodSales > 0) && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold mb-6 text-gray-800">Revenue Comparison: Bar vs Food</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesComparisonData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis tickFormatter={formatCurrency} stroke="#6b7280" />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Bar dataKey="amount" radius={[8, 8, 0, 0]} isAnimationActive>
                  <Cell fill="#6366f1" />
                  <Cell fill="#f59e0b" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {waiterChartData.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold mb-6 text-gray-800">Sales Performance by Waiter</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={waiterChartData} 
                layout="vertical" 
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" tickFormatter={formatCurrency} />
                <YAxis dataKey="name" type="category" stroke="#6b7280" width={95} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Bar dataKey="revenue" fill="#4f46e5" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {waiterChartData.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 font-semibold text-gray-700">Waiter</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Orders</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Revenue</th>
                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Rating</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {waiterData.map((waiter, index) => (
                <tr key={waiter.staffId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 font-medium text-gray-900">{waiter.name}</td>
                  <td className="px-6 py-4 text-right text-gray-600">{waiter.totalOrders}</td>
                  <td className="px-6 py-4 text-right font-semibold text-gray-900">
                    KES {waiter.totalSales.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center gap-1 text-yellow-600 font-medium">
                      ⭐ {waiter.avgRating}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(barSales > 0 || foodSales > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
            <p className="text-sm font-medium text-indigo-600 mb-2">Total Bar Revenue</p>
            <p className="text-3xl font-bold text-indigo-900">KES {barSales.toLocaleString()}</p>
            <p className="text-xs text-indigo-700 mt-2">
              {barSales + foodSales > 0 ? ((barSales / (barSales + foodSales)) * 100).toFixed(1) : 0}% of total
            </p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
            <p className="text-sm font-medium text-amber-600 mb-2">Total Food Revenue</p>
            <p className="text-3xl font-bold text-amber-900">KES {foodSales.toLocaleString()}</p>
            <p className="text-xs text-amber-700 mt-2">
              {barSales + foodSales > 0 ? ((foodSales / (barSales + foodSales)) * 100).toFixed(1) : 0}% of total
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
