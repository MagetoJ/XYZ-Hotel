import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config/api';
import {
  TrendingUp, DollarSign, ShoppingBag, Star, Clock, Users,
  Award, Target, Loader2, Calendar, Filter
} from 'lucide-react';


interface PerformanceData {
  period: { start: string; end: string };
  orders: {
    total: number;
    completed: number;
    cancelled: number;
    completionRate: string;
  };
  financial: {
    totalSales: number;
    avgOrderValue: number;
    totalTips: number;
  };
  service: {
    avgRating: string;
    avgServiceTime: string;
  };
  attendance: {
    totalShifts: number;
    totalHours: string;
    punctualityScore: number;
  };
}

interface WaiterPerformance {
  staffId: number;
  name: string;
  employeeId: string;
  totalOrders: number;
  completedOrders: number;
  totalSales: number;
  avgRating: string;
}

interface AllStaffPerformance {
  staffId: number;
  name: string;
  role: string;
  employeeId: string;
  totalOrders: number;
  completedOrders: number;
  totalSales: number;
  avgOrderValue: number;
  avgRating: string;
}

const formatCurrency = (amount: number): string => {
  return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
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
  <div className={`bg-white p-6 rounded-xl shadow-sm border-l-4 ${color}`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
        {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
      </div>
      <div className={`p-3 rounded-full ${color.replace('border', 'bg').replace('500', '100')}`}>
        <Icon className={`w-6 h-6 ${color.replace('border', 'text')}`} />
      </div>
    </div>
  </div>
);

export default function PerformanceDashboard() {
  const { user } = useAuth();
  const [myPerformance, setMyPerformance] = useState<PerformanceData | null>(null);
  const [allStaffPerformance, setAllStaffPerformance] = useState<AllStaffPerformance[]>([]);
  const [waiterPerformance, setWaiterPerformance] = useState<WaiterPerformance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedRole, setSelectedRole] = useState('all');

  useEffect(() => {
    fetchPerformanceData();
  }, [dateRange, selectedRole]);

  const fetchPerformanceData = async () => {
    setIsLoading(true);
    setError(null);
    const token = localStorage.getItem('pos_token');

    try {
      // Fetch own performance for all users
      if (user) {
        try {
          const myResponse = await fetch(
            `${API_URL}/api/performance/staff/${user.id}?start_date=${dateRange.start}&end_date=${dateRange.end}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          if (myResponse.ok) {
            const data = await myResponse.json();
            setMyPerformance(data);
            console.log('✅ Performance data loaded:', data);
          } else {
            const errorText = await myResponse.text();
            console.warn('⚠️ Failed to fetch own performance:', myResponse.status, errorText);
          }
        } catch (err) {
          console.error('❌ Error fetching own performance:', err);
          setError('Failed to load your performance data');
        }
      }

      // Fetch all staff performance for admin/manager
      if (user?.role === 'admin' || user?.role === 'manager') {
        try {
          const roleQuery = selectedRole !== 'all' ? `&role=${selectedRole}` : '';
          const allResponse = await fetch(
            `${API_URL}/api/performance/all?start_date=${dateRange.start}&end_date=${dateRange.end}${roleQuery}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          if (allResponse.ok) {
            const data = await allResponse.json();
            setAllStaffPerformance(data);
            console.log('✅ Team performance data loaded:', data);
          } else {
            const errorText = await allResponse.text();
            console.warn('⚠️ Failed to fetch team performance:', allResponse.status, errorText);
          }
        } catch (err) {
          console.error('❌ Error fetching team performance:', err);
        }
      }

      // Fetch waiter performance for receptionist
      if (user?.role === 'receptionist') {
        try {
          const waiterResponse = await fetch(
            `${API_URL}/api/performance/waiters?start_date=${dateRange.start}&end_date=${dateRange.end}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          if (waiterResponse.ok) {
            const data = await waiterResponse.json();
            setWaiterPerformance(data);
            console.log('✅ Waiter performance data loaded:', data);
          } else {
            const errorText = await waiterResponse.text();
            console.warn('⚠️ Failed to fetch waiter performance:', waiterResponse.status, errorText);
          }
        } catch (err) {
          console.error('❌ Error fetching waiter performance:', err);
        }
      }
    } catch (error) {
      console.error('Error in fetchPerformanceData:', error);
      setError('An unexpected error occurred while loading performance data');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return <div className="p-6 text-red-500">Authentication error. Please log in.</div>;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
        <span className="ml-3 text-gray-600">Loading performance data...</span>
      </div>
    );
  }

  // Check if any data is available
  const hasData = myPerformance || allStaffPerformance.length > 0 || waiterPerformance.length > 0;

  return (
    <div className="space-y-6">
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <div className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5">⚠️</div>
          <div>
            <h3 className="font-semibold text-red-800">Error Loading Data</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Performance Dashboard</h2>
          <p className="text-gray-600">
            {user.role === 'admin' || user.role === 'manager'
              ? 'View and analyze team performance metrics'
              : user.role === 'receptionist'
              ? 'Monitor waiter performance and sales'
              : 'Track your individual performance'}
          </p>
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

          {(user.role === 'admin' || user.role === 'manager') && (
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
              >
                <option value="all">All Roles</option>
                <option value="waiter">Waiters</option>
                <option value="cashier">Cashiers</option>
                <option value="kitchen_staff">Kitchen Staff</option>
                <option value="delivery">Delivery</option>
                <option value="receptionist">Receptionists</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* My Performance Section */}
      {myPerformance && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-500" />
            Your Performance
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Sales"
              value={formatCurrency(myPerformance.financial.totalSales)}
              icon={DollarSign}
              color="border-green-500"
              subtext={`Avg: ${formatCurrency(myPerformance.financial.avgOrderValue)}`}
            />
            <MetricCard
              title="Orders Completed"
              value={`${myPerformance.orders.completed}/${myPerformance.orders.total}`}
              icon={ShoppingBag}
              color="border-blue-500"
              subtext={`${myPerformance.orders.completionRate}% completion rate`}
            />
            <MetricCard
              title="Customer Rating"
              value={`${myPerformance.service.avgRating}/5`}
              icon={Star}
              color="border-yellow-500"
              subtext={`Avg service: ${myPerformance.service.avgServiceTime} min`}
            />
            <MetricCard
              title="Total Tips"
              value={formatCurrency(myPerformance.financial.totalTips)}
              icon={Award}
              color="border-purple-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard
              title="Shifts Completed"
              value={myPerformance.attendance.totalShifts}
              icon={Calendar}
              color="border-indigo-500"
              subtext={`${myPerformance.attendance.totalHours} hours`}
            />
            <MetricCard
              title="Punctuality Score"
              value={`${myPerformance.attendance.punctualityScore}%`}
              icon={Clock}
              color="border-teal-500"
            />
            <MetricCard
              title="Avg Service Time"
              value={`${myPerformance.service.avgServiceTime} min`}
              icon={Clock}
              color="border-orange-500"
            />
          </div>
        </div>
      )}

      {/* Team Performance Section (Admin/Manager) */}
      {(user.role === 'admin' || user.role === 'manager') && allStaffPerformance.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-500" />
            Team Performance Overview
          </h3>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completion Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Sales</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {allStaffPerformance
                    .sort((a, b) => b.totalSales - a.totalSales)
                    .map((staff, index) => (
                      <tr key={staff.staffId} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                              index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-400' : 'bg-blue-500'
                            }`}>
                              {index < 3 ? '🏆' : staff.name.charAt(0)}
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">{staff.name}</div>
                              <div className="text-xs text-gray-500">{staff.employeeId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 capitalize">
                          {staff.role.replace('_', ' ')}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {staff.totalOrders}
                        </td>
                        <td className="px-6 py-4 text-sm">
                          <div className="flex items-center">
                            <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                              <div
                                className="bg-green-500 h-2 rounded-full"
                                style={{
                                  width: `${staff.totalOrders > 0 ? (staff.completedOrders / staff.totalOrders) * 100 : 0}%`
                                }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-600">
                              {staff.totalOrders > 0 ? ((staff.completedOrders / staff.totalOrders) * 100).toFixed(0) : 0}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          {formatCurrency(staff.totalSales)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {formatCurrency(staff.avgOrderValue)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-400 mr-1" />
                            <span className="text-sm font-medium text-gray-900">{staff.avgRating}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Performers Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {allStaffPerformance.slice(0, 3).map((staff, index) => (
              <div key={staff.staffId} className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl border-2 border-gray-200 relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-20 h-20 transform rotate-12 translate-x-6 -translate-y-6 ${
                  index === 0 ? 'bg-yellow-200' : index === 1 ? 'bg-gray-200' : 'bg-orange-200'
                } opacity-50 rounded-full`}></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-4xl ${
                      index === 0 ? 'animate-bounce' : ''
                    }`}>
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                    </span>
                    <span className="text-xs font-bold text-gray-500">
                      #{index + 1} {index === 0 ? 'TOP PERFORMER' : 'RUNNER UP'}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-gray-900 mb-1">{staff.name}</h4>
                  <p className="text-sm text-gray-600 mb-3 capitalize">{staff.role.replace('_', ' ')}</p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Sales:</span>
                      <span className="font-semibold text-green-600">{formatCurrency(staff.totalSales)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Orders:</span>
                      <span className="font-semibold">{staff.totalOrders}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Rating:</span>
                      <span className="font-semibold flex items-center">
                        <Star className="w-3 h-3 text-yellow-400 mr-1" />
                        {staff.avgRating}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Waiter Performance Section (Receptionist) */}
      {user.role === 'receptionist' && waiterPerformance.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-500" />
            Waiter Performance & Sales
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-800">Total Waiters</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">{waiterPerformance.length}</p>
                </div>
                <Users className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-800">Total Orders</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">
                    {waiterPerformance.reduce((sum, w) => sum + w.totalOrders, 0)}
                  </p>
                </div>
                <ShoppingBag className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-800">Total Sales</p>
                  <p className="text-2xl font-bold text-yellow-900 mt-1">
                    {formatCurrency(waiterPerformance.reduce((sum, w) => sum + w.totalSales, 0))}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-yellow-600" />
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-800">Avg Rating</p>
                  <p className="text-2xl font-bold text-purple-900 mt-1">
                    {(waiterPerformance.reduce((sum, w) => sum + parseFloat(w.avgRating), 0) / waiterPerformance.length).toFixed(2)}
                  </p>
                </div>
                <Star className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Waiter</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Sales</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {waiterPerformance
                    .sort((a, b) => b.totalSales - a.totalSales)
                    .map((waiter) => (
                      <tr key={waiter.staffId} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                              <span className="text-purple-600 font-semibold text-sm">
                                {waiter.name.charAt(0)}
                              </span>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">{waiter.name}</div>
                              <div className="text-xs text-gray-500">{waiter.employeeId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{waiter.totalOrders}</td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {waiter.completedOrders}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                          {formatCurrency(waiter.totalSales)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <Star className="w-4 h-4 text-yellow-400 mr-1" />
                            <span className="text-sm font-medium text-gray-900">{waiter.avgRating}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Performance Insights */}
      {myPerformance && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-600" />
            Performance Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">Completion Rate</p>
              {(() => {
                const rate = parseFloat(myPerformance.orders.completionRate) || 0;
                return rate >= 90 ? (
                  <p className="text-sm text-green-600">
                    ✅ Excellent! You're maintaining a {myPerformance.orders.completionRate}% completion rate.
                  </p>
                ) : rate >= 75 ? (
                  <p className="text-sm text-yellow-600">
                    ⚠️ Good work! Try to reduce cancellations to reach 90%.
                  </p>
                ) : (
                  <p className="text-sm text-red-600">
                    ⚠️ Your completion rate is {myPerformance.orders.completionRate}%. Focus on reducing cancellations.
                  </p>
                );
              })()}
            </div>

            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">Customer Satisfaction</p>
              {(() => {
                const rating = parseFloat(myPerformance.service.avgRating) || 0;
                return rating >= 4.5 ? (
                  <p className="text-sm text-green-600">
                    ⭐ Outstanding! Customers love your service.
                  </p>
                ) : rating >= 3.5 ? (
                  <p className="text-sm text-yellow-600">
                    👍 Good ratings! Keep improving for 5-star service.
                  </p>
                ) : (
                  <p className="text-sm text-red-600">
                    📈 Focus on customer service to improve your ratings.
                  </p>
                );
              })()}
            </div>

            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">Punctuality</p>
              {(() => {
                const score = myPerformance.attendance.punctualityScore || 0;
                return score >= 95 ? (
                  <p className="text-sm text-green-600">
                    ⏰ Perfect! You're always on time.
                  </p>
                ) : score >= 80 ? (
                  <p className="text-sm text-yellow-600">
                    🕐 Good punctuality. Try to be on time for all shifts.
                  </p>
                ) : (
                  <p className="text-sm text-red-600">
                    ⏰ Improve your punctuality for better performance.
                  </p>
                );
              })()}
            </div>

            <div className="bg-white rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">Service Speed</p>
              {(() => {
                const time = parseInt(myPerformance.service.avgServiceTime) || 30;
                return time <= 15 ? (
                  <p className="text-sm text-green-600">
                    ⚡ Lightning fast! Great service speed.
                  </p>
                ) : time <= 25 ? (
                  <p className="text-sm text-yellow-600">
                    ⏱️ Good pace. Try to speed up service slightly.
                  </p>
                ) : (
                  <p className="text-sm text-red-600">
                    🐌 Focus on reducing service time for better efficiency.
                  </p>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!hasData && !error && (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-12 text-center border-2 border-dashed border-gray-300">
          <div className="flex justify-center mb-4">
            <TrendingUp className="w-16 h-16 text-gray-300" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Performance Data Available</h3>
          <p className="text-gray-600 mb-4">
            {user.role === 'admin' || user.role === 'manager'
              ? 'Your team hasn\'t created any orders yet. Performance metrics will appear here once team members start processing orders.'
              : 'You haven\'t created any orders in the selected period. Start processing orders to see your performance metrics.'}
          </p>
          <p className="text-sm text-gray-500">
            Showing data from {dateRange.start} to {dateRange.end}
          </p>
        </div>
      )}
    </div>
  );
}