import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../config/api';
import { envLog, IS_DEVELOPMENT } from '../config/environment';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import StaffManagement from '../components/admin/StaffManagement';
import InventoryManagement from '../components/admin/InventoryManagement';
import MenuManagement from '../components/admin/MenuManagement';
import RoomManagement from '../components/admin/RoomManagement';
import ReportsManagement from '../components/admin/ReportsManagement';
import SettingsManagement from '../components/admin/SettingsManagement';
import ShiftManagement from '../components/admin/ShiftManagement';
import ExpensesManagement from '../components/admin/ExpensesManagement';
import ProductReturnsManagement from '../components/admin/ProductReturnsManagement';
import SuppliersManagement from '../components/admin/SuppliersManagement';
import PurchaseOrdersManagement from '../components/admin/PurchaseOrdersManagement';
import PerfomanceDashboard from '../components/PerfomanceDashboardView';
import PersonalSalesReport from '../components/PersonalSalesReport';
import SearchComponent from '../components/SearchComponent';
import { navigateToSearchResult } from '../utils/searchNavigation';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

import {
  BarChart3,
  Users,
  Package,
  Settings,
  FileText,
  Utensils,
  Bed,
  AlertTriangle,
  DollarSign,
  Loader2,
  Clock,
  TrendingUp,
  Search,
  Receipt,
  RotateCcw,
  Truck,
  ShoppingCart,
} from 'lucide-react';

// --- Helper Functions ---

// This function formats numbers as currency.
export const formatCurrency = (amount: number | string) => {
  // Parse amount to number if it's a string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (typeof numAmount !== 'number' || isNaN(numAmount)) {
    return 'KES 0';
  }
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
  }).format(numAmount);
};

// This function calculates how long ago a date was.
export const timeAgo = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + " years ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + " months ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + " days ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + " hours ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + " minutes ago";
  return Math.floor(seconds) + " seconds ago";
};

// Interface for the fetched overview data
interface OverviewStats {
    todaysRevenue: number;
    ordersToday: number;
    activeStaff: number;
    lowStockItems: number;
    recentOrders: {
        id: number;
        order_number: string;
        location: string;
        total_amount: number;
        created_at: string;
    }[];
}

interface ActiveUser {
  is_active: any;
  [x: string]: any;
  staff_id: any;
  is_active: any;
  logout_time: string;
  id: number;
  name: string;
  role: string;
  login_time: string;
}

interface LowStockItem {
  id: number;
  name: string;
  current_stock: number;
  minimum_stock: number;
  inventory_type: string;
  unit: string;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [overviewData, setOverviewData] = useState<OverviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [allInventory, setAllInventory] = useState<any[]>([]);
  
  // Chart data state
  const [revenueData] = useState([
    { date: 'Mon', revenue: 4500 },
    { date: 'Tue', revenue: 5200 },
    { date: 'Wed', revenue: 4800 },
    { date: 'Thu', revenue: 6100 },
    { date: 'Fri', revenue: 7200 },
    { date: 'Sat', revenue: 8900 },
    { date: 'Sun', revenue: 6500 },
  ]);
  
  const [lowStockChartData, setLowStockChartData] = useState<Array<{ name: string; current: number; minimum: number }>>([]);

  // Handle navigation from URL hash (for search result navigation)
  useEffect(() => {
    if (location.hash) {
      const tab = location.hash.substring(1); // Remove the # symbol
      if (tab && tab !== activeTab) {
        setActiveTab(tab);
      }
    }
  }, [location.hash]);

  // Handle custom search navigation events
  useEffect(() => {
    const handleAdminSearchNavigate = (event: CustomEvent) => {
      const { tab } = event.detail;
      if (tab && tab !== activeTab) {
        setActiveTab(tab);
      }
    };

    window.addEventListener('adminSearchNavigate', handleAdminSearchNavigate as EventListener);
    return () => window.removeEventListener('adminSearchNavigate', handleAdminSearchNavigate as EventListener);
  }, [activeTab]);

  // Clear hash after navigation to prevent issues with back button
  useEffect(() => {
    if (location.hash && activeTab !== 'overview') {
      // Clear the hash after a short delay
      setTimeout(() => {
        window.history.replaceState(null, '', '/admin');
      }, 100);
    }
  }, [activeTab, location.hash]);

  const fetchActiveUsers = async () => {
    try {
      envLog.dev('👥 Fetching user sessions...');
      const response = await apiClient.get('/api/admin/user-sessions');
      if (response.ok) {
        const data = await response.json();
        setActiveUsers(data);
        envLog.dev('✅ User sessions loaded:', data);
      }
    } catch (error) {
      envLog.error('❌ Error fetching user sessions:', error);
    }
  };

  const fetchLowStockItems = async () => {
    try {
      envLog.dev('📦 Fetching low stock items...');
      const response = await apiClient.get('/api/admin/low-stock-alerts');
      if (response.ok) {
        const data = await response.json();
        setLowStockItems(data);
        // Prepare chart data
        const chartData = data.map((item: LowStockItem) => ({
          name: item.name.substring(0, 12), // Truncate for better chart display
          current: item.current_stock,
          minimum: item.minimum_stock,
        }));
        setLowStockChartData(chartData);
        envLog.dev('✅ Low stock items loaded:', data);
      }
    } catch (error) {
      envLog.error('❌ Error fetching low stock items:', error);
    }
  };

  const fetchAllInventory = async () => {
    try {
      envLog.dev('📦 Fetching all inventory items...');
      const response = await apiClient.get('/api/inventory');
      if (response.ok) {
        const data = await response.json();
        setAllInventory(data);
        envLog.dev('✅ Inventory items loaded:', data.length);
      }
    } catch (error) {
      envLog.error('❌ Error fetching inventory items:', error);
    }
  };

  useEffect(() => {
      const fetchOverviewData = async () => {
          if (activeTab === 'overview') {
              setIsLoading(true);
              setError(null);
              
              try {
                  envLog.dev('📊 Fetching overview stats...');
                  
                  // Use apiClient which automatically adds auth headers
                  const response = await apiClient.get('/api/dashboard/overview-stats');
                  
                  if (!response.ok) {
                      const errorText = await response.text();
                      envLog.error('❌ API Error:', response.status, errorText);
                      
                      throw new Error(`Failed to fetch overview stats. Status: ${response.status}`);
                  }
                  
                  const data = await response.json();
                  envLog.dev('✅ Overview stats loaded:', data);
                  
                  setOverviewData(data);

                  // Also fetch active users, low stock items, and inventory for the overview
                  await Promise.all([
                    fetchActiveUsers(),
                    fetchLowStockItems(),
                    fetchAllInventory()
                  ]);
              } catch (error: any) {
                  if (IS_DEVELOPMENT) {
                      console.error("❌ Error fetching overview stats:", error);
                  }
                  
                  // Provide more specific error messages
                  if (error.message?.includes('403')) {
                      setError("Access denied. Please log in again.");
                  } else if (error.message?.includes('401')) {
                      setError("Authentication required. Please log in.");
                  } else if (error.message?.includes('fetch')) {
                      setError("Cannot connect to server. Please check your connection.");
                  } else {
                      setError("Could not load dashboard data. Please try again later.");
                  }
              } finally {
                  setIsLoading(false);
              }
          }
      };

      fetchOverviewData();
  }, [activeTab]);

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'search', label: 'Global Search', icon: Search },
    { id: 'staff', label: 'Staff Management', icon: Users },
    { id: 'shifts', label: 'Shift Management', icon: Clock },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'inventory', label: 'Inventory', icon: Package },
    { id: 'menu', label: 'Menu Management', icon: Utensils },
    { id: 'rooms', label: 'Room Management', icon: Bed },
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
    { id: 'purchase-orders', label: 'Purchase Orders', icon: ShoppingCart },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'product-returns', label: 'Product Returns', icon: RotateCcw },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'sales-reports', label: 'Sales Reports', icon: DollarSign },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const INVENTORY_COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#6366f1'];

  const getStockByTypeData = () => {
    const typeMap: { [key: string]: number } = {};
    allInventory.forEach(item => {
      typeMap[item.inventory_type] = (typeMap[item.inventory_type] || 0) + item.current_stock;
    });
    return Object.entries(typeMap).map(([type, stock]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      stock: stock,
      value: stock
    }));
  };

  const getStockHealthData = () => {
    const statusMap = {
      'Optimal': 0,
      'Low Stock': 0,
      'Out of Stock': 0
    };
    allInventory.forEach(item => {
      if (item.current_stock === 0) {
        statusMap['Out of Stock']++;
      } else if (item.current_stock <= item.minimum_stock) {
        statusMap['Low Stock']++;
      } else {
        statusMap['Optimal']++;
      }
    });
    return Object.entries(statusMap).map(([status, count]) => ({
      name: status,
      value: count
    }));
  };

  const getValueDistributionData = () => {
    const typeMap: { [key: string]: number } = {};
    allInventory.forEach(item => {
      const itemValue = item.current_stock * item.cost_per_unit;
      typeMap[item.inventory_type] = (typeMap[item.inventory_type] || 0) + itemValue;
    });
    return Object.entries(typeMap).map(([type, value]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      value: Math.round(value),
      displayValue: formatCurrency(value)
    }));
  };

  const getTopItemsData = () => {
    return allInventory
      .sort((a, b) => (b.current_stock * b.cost_per_unit) - (a.current_stock * a.cost_per_unit))
      .slice(0, 8)
      .map(item => ({
        name: item.name.length > 15 ? item.name.substring(0, 15) + '...' : item.name,
        value: Math.round(item.current_stock * item.cost_per_unit),
        stock: item.current_stock
      }));
  };

  const getProfitMarginData = () => {
    return allInventory
      .filter(item => item.buying_price && item.cost_per_unit && item.cost_per_unit > 0)
      .map(item => {
        const margin = ((item.cost_per_unit - item.buying_price) / item.cost_per_unit) * 100;
        return {
          name: item.name.length > 12 ? item.name.substring(0, 12) + '...' : item.name,
          margin: Math.round(margin * 10) / 10,
          buyPrice: item.buying_price,
          sellPrice: item.cost_per_unit
        };
      })
      .sort((a, b) => b.margin - a.margin)
      .slice(0, 10);
  };

  const getSalesTrackingData = () => {
    const typeMap: { [key: string]: { quantity: number; revenue: number } } = {};
    allInventory.forEach(item => {
      if (!typeMap[item.inventory_type]) {
        typeMap[item.inventory_type] = { quantity: 0, revenue: 0 };
      }
      typeMap[item.inventory_type].quantity += item.current_stock;
      typeMap[item.inventory_type].revenue += item.current_stock * item.cost_per_unit;
    });
    return Object.entries(typeMap).map(([type, data]) => ({
      name: type.charAt(0).toUpperCase() + type.slice(1),
      quantity: data.quantity,
      revenue: Math.round(data.revenue)
    }));
  };

  const getMarginTrendData = () => {
    const margins = getProfitMarginData();
    const avgMargin = margins.length > 0 ? 
      Math.round((margins.reduce((sum, item) => sum + item.margin, 0) / margins.length) * 10) / 10 
      : 0;
    return {
      average: avgMargin,
      items: margins
    };
  };

  const sidebarStatusCard = (
    <div className="mt-8 p-4 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-lg border border-yellow-200">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
        <span className="text-sm font-medium text-gray-900">System Status</span>
      </div>
      <p className="text-xs text-gray-600">All systems operational</p>
      <p className="text-xs text-gray-600 mt-1">Access Level: {user?.role === 'admin' ? 'Full Admin' : 'Manager'}</p>
    </div>
  );

  const activeTabLabel = menuItems.find(item => item.id === activeTab)?.label || 'Admin';

  const renderOverview = () => {
      if (isLoading) {
          return (
              <div className="flex justify-center items-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
              </div>
          );
      }
      if (error) {
          return (
              <div className="text-center p-6">
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
                      <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-2" />
                      <p className="text-red-700 font-medium">{error}</p>
                      <button 
                          onClick={() => window.location.reload()}
                          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                      >
                          Retry
                      </button>
                  </div>
              </div>
          );
      }
      if (!overviewData) {
          return <div className="text-center">Could not load dashboard data.</div>;
      }

      return (
        <div className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
            <div className="bg-white rounded-lg p-3 lg:p-6 border border-gray-200">
            <div className="flex items-center">
                <div className="p-1.5 lg:p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-4 h-4 lg:w-6 lg:h-6 text-green-600" />
                </div>
                <div className="ml-2 lg:ml-4 min-w-0">
                <p className="text-xs lg:text-sm font-medium text-gray-600 truncate">Today's Revenue</p>
                <p className="text-sm lg:text-2xl font-bold text-gray-900 truncate">{formatCurrency(overviewData.todaysRevenue)}</p>
                </div>
            </div>
            </div>

            <div className="bg-white rounded-lg p-3 lg:p-6 border border-gray-200">
            <div className="flex items-center">
                <div className="p-1.5 lg:p-2 bg-blue-100 rounded-lg">
                <FileText className="w-4 h-4 lg:w-6 lg:h-6 text-blue-600" />
                </div>
                <div className="ml-2 lg:ml-4 min-w-0">
                <p className="text-xs lg:text-sm font-medium text-gray-600 truncate">Orders Today</p>
                <p className="text-sm lg:text-2xl font-bold text-gray-900 truncate">{overviewData.ordersToday}</p>
                </div>
            </div>
            </div>

            <div className="bg-white rounded-lg p-3 lg:p-6 border border-gray-200">
            <div className="flex items-center">
                <div className="p-1.5 lg:p-2 bg-purple-100 rounded-lg">
                <Users className="w-4 h-4 lg:w-6 lg:h-6 text-purple-600" />
                </div>
                <div className="ml-2 lg:ml-4 min-w-0">
                <p className="text-xs lg:text-sm font-medium text-gray-600 truncate">Active Staff</p>
                <p className="text-sm lg:text-2xl font-bold text-gray-900 truncate">{overviewData.activeStaff}</p>
                </div>
            </div>
            </div>

            <div className="bg-white rounded-lg p-3 lg:p-6 border border-gray-200">
            <div className="flex items-center">
                <div className="p-1.5 lg:p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="w-4 h-4 lg:w-6 lg:h-6 text-yellow-600" />
                </div>
                <div className="ml-2 lg:ml-4 min-w-0">
                <p className="text-xs lg:text-sm font-medium text-gray-600 truncate">Low Stock Items</p>
                <p className="text-sm lg:text-2xl font-bold text-gray-900 truncate">{overviewData.lowStockItems}</p>
                </div>
            </div>
            </div>
        </div>

        {/* Charts Section - Revenue Over Time and Low Stock Visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <div className="bg-white rounded-lg p-4 lg:p-6 border border-gray-200">
              <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4">Revenue Trend (This Week)</h3>
              <div className="w-full h-64 lg:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip
                      formatter={(value) => `KES ${value.toLocaleString('en-KE')}`}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="revenue"
                      stroke="#facc15"
                      strokeWidth={2}
                      dot={{ fill: '#facc15', r: 4 }}
                      activeDot={{ r: 6 }}
                      name="Daily Revenue"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Low Stock Items Chart */}
            {lowStockChartData.length > 0 && (
              <div className="bg-white rounded-lg p-4 lg:p-6 border border-gray-200">
                <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4">Low Stock Items - Current vs Minimum</h3>
                <div className="w-full h-64 lg:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={lowStockChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={10} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip
                        formatter={(value) => value}
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                      />
                      <Legend />
                      <Bar dataKey="current" fill="#10b981" name="Current Stock" />
                      <Bar dataKey="minimum" fill="#ef4444" name="Minimum Required" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
        </div>

        {/* Inventory Overview Charts */}
        {allInventory.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Stock by Type Bar Chart */}
            <div className="bg-white rounded-lg p-4 lg:p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <h3 className="text-base lg:text-lg font-semibold text-gray-900">Stock Levels by Type</h3>
              </div>
              {getStockByTypeData().length > 0 ? (
                <div className="w-full h-64 lg:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getStockByTypeData()}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                      <YAxis stroke="#6b7280" fontSize={12} />
                      <Tooltip formatter={(value) => value.toLocaleString()} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                      <Bar dataKey="stock" fill="#3b82f6" name="Stock Units" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">No inventory data</div>
              )}
            </div>

            {/* Stock Health Pie Chart */}
            <div className="bg-white rounded-lg p-4 lg:p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                <h3 className="text-base lg:text-lg font-semibold text-gray-900">Stock Health</h3>
              </div>
              {getStockHealthData().some(d => d.value > 0) ? (
                <div className="w-full h-64 lg:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getStockHealthData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getStockHealthData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={INVENTORY_COLORS[index % INVENTORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">No inventory data</div>
              )}
            </div>

            {/* Inventory Value Distribution */}
            <div className="bg-white rounded-lg p-4 lg:p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h3 className="text-base lg:text-lg font-semibold text-gray-900">Value Distribution</h3>
              </div>
              {getValueDistributionData().length > 0 ? (
                <div className="w-full h-64 lg:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getValueDistributionData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: KES ${value.toLocaleString()}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getValueDistributionData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={INVENTORY_COLORS[index % INVENTORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `KES ${value.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">No inventory data</div>
              )}
            </div>

            {/* Top Items by Value */}
            <div className="bg-white rounded-lg p-4 lg:p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-purple-600" />
                <h3 className="text-base lg:text-lg font-semibold text-gray-900">Top Items by Value</h3>
              </div>
              {getTopItemsData().length > 0 ? (
                <div className="w-full h-64 lg:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getTopItemsData()} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis type="number" stroke="#6b7280" fontSize={12} />
                      <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} stroke="#6b7280" />
                      <Tooltip formatter={(value) => `KES ${value.toLocaleString()}`} contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                      <Bar dataKey="value" fill="#8b5cf6" name="Value (KES)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">No inventory data</div>
              )}
            </div>
          </div>
        )}

        {/* Profit Margin & Sales Tracking Charts */}
        {getProfitMarginData().length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profit Margins Bar Chart */}
            <div className="bg-white rounded-lg p-4 lg:p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-green-600" />
                <h3 className="text-base lg:text-lg font-semibold text-gray-900">Top 10 Profit Margins</h3>
              </div>
              <div className="w-full h-64 lg:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getProfitMarginData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={10} />
                    <YAxis stroke="#6b7280" fontSize={12} label={{ value: 'Margin %', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      formatter={(value) => `${value}%`} 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Bar dataKey="margin" fill="#10b981" name="Profit Margin %" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <p className="text-sm text-green-900">
                  <span className="font-semibold">Average Margin:</span> {getMarginTrendData().average}%
                </p>
              </div>
            </div>

            {/* Sales Tracking by Category */}
            <div className="bg-white rounded-lg p-4 lg:p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-blue-600" />
                <h3 className="text-base lg:text-lg font-semibold text-gray-900">Sales Tracking by Category</h3>
              </div>
              <div className="w-full h-64 lg:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getSalesTrackingData()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={12} />
                    <YAxis stroke="#6b7280" fontSize={12} />
                    <Tooltip 
                      formatter={(value) => value.toLocaleString()} 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Bar dataKey="quantity" fill="#3b82f6" name="Units" />
                    <Bar dataKey="revenue" fill="#fbbf24" name="Revenue (KES)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Price Comparison Chart */}
            <div className="bg-white rounded-lg p-4 lg:p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                <h3 className="text-base lg:text-lg font-semibold text-gray-900">Buying vs Selling Price (Top 8)</h3>
              </div>
              <div className="w-full h-64 lg:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getProfitMarginData().slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#6b7280" fontSize={10} />
                    <YAxis stroke="#6b7280" fontSize={12} label={{ value: 'Price (KES)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      formatter={(value) => `KES ${value.toLocaleString()}`} 
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Legend />
                    <Bar dataKey="buyPrice" fill="#ef4444" name="Buying Price" />
                    <Bar dataKey="sellPrice" fill="#10b981" name="Selling Price" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Margin Distribution Pie Chart */}
            <div className="bg-white rounded-lg p-4 lg:p-6 border border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base lg:text-lg font-semibold text-gray-900">Margin Distribution</h3>
              </div>
              {getProfitMarginData().length > 0 ? (
                <div className="w-full h-64 lg:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={getProfitMarginData().slice(0, 6).map(item => ({
                          name: item.name,
                          value: Math.round(item.margin)
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getProfitMarginData().slice(0, 6).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={INVENTORY_COLORS[index % INVENTORY_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `${value}%`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">No margin data available</div>
              )}
            </div>
          </div>
        )}

        {/* Recent Activity & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg p-4 lg:p-6 border border-gray-200">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4">Recent Orders</h3>
            <div className="space-y-3">
                {overviewData.recentOrders && overviewData.recentOrders.length > 0 ? (
                    overviewData.recentOrders.map((order) => (
                    <div key={order.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 rounded-lg gap-2">
                        <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{order.order_number}</p>
                        <p className="text-sm text-gray-600 truncate">{order.location}</p>
                        </div>
                        <div className="text-left sm:text-right flex-shrink-0">
                        <p className="font-medium text-gray-900">{formatCurrency(order.total_amount)}</p>
                        <p className="text-sm text-gray-600">{timeAgo(order.created_at)}</p>
                        </div>
                    </div>
                    ))
                ) : (
                    <p className="text-sm text-gray-500">No recent orders to display.</p>
                )}
            </div>
            </div>

            <div className="bg-white rounded-lg p-4 lg:p-6 border border-gray-200">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                <button onClick={() => setActiveTab('staff')} className="flex flex-col items-center p-3 lg:p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                <Users className="w-6 h-6 lg:w-8 lg:h-8 text-blue-600 mb-2" />
                <span className="text-xs lg:text-sm font-medium text-blue-900 text-center">Add Staff</span>
                </button>
                <button onClick={() => setActiveTab('inventory')} className="flex flex-col items-center p-3 lg:p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                <Package className="w-6 h-6 lg:w-8 lg:h-8 text-green-600 mb-2" />
                <span className="text-xs lg:text-sm font-medium text-green-900 text-center">Update Inventory</span>
                </button>
                <button onClick={() => setActiveTab('reports')} className="flex flex-col items-center p-3 lg:p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors">
                <FileText className="w-6 h-6 lg:w-8 lg:h-8 text-purple-600 mb-2" />
                <span className="text-xs lg:text-sm font-medium text-purple-900 text-center">Generate Report</span>
                </button>
                <button onClick={() => setActiveTab('settings')} className="flex flex-col items-center p-3 lg:p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors">
                <Settings className="w-6 h-6 lg:w-8 lg:h-8 text-yellow-600 mb-2" />
                <span className="text-xs lg:text-sm font-medium text-yellow-900 text-center">System Settings</span>
                </button>
            </div>
            </div>
        </div>

        {/* Active Users & Low Stock Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Users & Sessions */}
            <div className="bg-white rounded-lg p-4 lg:p-6 border border-gray-200">
                <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 lg:w-5 lg:h-5 text-blue-600" />
                    User Sessions ({activeUsers.length})
                </h3>
                <div className="space-y-3 max-h-48 lg:max-h-64 overflow-y-auto">
                    {activeUsers && activeUsers.length > 0 ? (
                        activeUsers.map((session) => (
                            <div key={`${session.staff_id}-${session.login_time}`} className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg border gap-2 ${
                                session.is_active
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-gray-50 border-gray-200'
                            }`}>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 truncate">{session.name}</p>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs text-gray-600 capitalize bg-gray-100 px-2 py-1 rounded-full">
                                            {session.role}
                                        </span>
                                        <span className={`text-xs ${session.is_active ? 'text-green-600' : 'text-gray-500'}`}>
                                            • {session.is_active
                                                ? `Logged in ${timeAgo(session.login_time)}`
                                                : `Last logged in ${timeAgo(session.logout_time || session.login_time)}`}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-start sm:items-end flex-shrink-0">
                                    <div className="flex items-center gap-1">
                                        <div className={`w-2 h-2 rounded-full ${
                                            session.is_active
                                                ? 'bg-green-500 animate-pulse'
                                                : 'bg-gray-400'
                                        }`}></div>
                                        <p className={`text-xs lg:text-sm font-medium ${
                                            session.is_active
                                                ? 'text-green-600'
                                                : 'text-gray-500'
                                        }`}>
                                            {session.is_active ? 'Active' : 'Offline'}
                                        </p>
                                    </div>
                                    <p className="text-xs text-gray-500">
                                        {new Date(session.login_time).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-6">
                            <Users className="w-8 h-8 lg:w-12 lg:h-12 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">No user sessions found</p>
                            <p className="text-xs text-gray-400">Users will appear here when they log in</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Low Stock Alerts */}
            <div className="bg-white rounded-lg p-4 lg:p-6 border border-gray-200">
                <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 lg:w-5 lg:h-5 text-red-600" />
                    Low Stock Alerts ({lowStockItems.length})
                </h3>
                <div className="space-y-3 max-h-48 lg:max-h-64 overflow-y-auto">
                    {lowStockItems && lowStockItems.length > 0 ? (
                        lowStockItems.map((item) => (
                            <div key={item.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-red-50 rounded-lg border border-red-100 gap-2">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 truncate">{item.name}</p>
                                    <p className="text-sm text-gray-600 capitalize truncate">
                                        {item.inventory_type} • {item.unit}
                                    </p>
                                </div>
                                <div className="text-left sm:text-right flex-shrink-0">
                                    <p className="text-sm text-red-600 font-medium">
                                        {item.current_stock} / {item.minimum_stock}
                                    </p>
                                    <p className="text-xs text-gray-500">Current / Min</p>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-4">
                            <Package className="w-6 h-6 lg:w-8 lg:h-8 text-green-500 mx-auto mb-2" />
                            <p className="text-sm text-green-600 font-medium">All items well stocked!</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
        </div>
      );
  };

  const handleSearchSelect = (result: any, type: string) => {
    console.log('Search result selected:', result, 'Type:', type);
    
    // Use the navigation utility with setActiveTab for internal navigation
    navigateToSearchResult(result, () => {}, user?.role, setActiveTab);
  };

  const renderSearch = () => {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Global Search</h2>
          <p className="text-gray-600">Search across all system data - staff, inventory, orders, menu items, and rooms</p>
        </div>

        {/* Search Interface */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <SearchComponent
            onSelectResult={handleSearchSelect}
            placeholder="Search anything in the system..."
            autoFocus={false}
          />
          
          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-sm font-medium text-gray-900">Staff</h3>
              <p className="text-xs text-gray-500">Search employees</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 bg-green-100 rounded-lg">
                <Package className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-sm font-medium text-gray-900">Inventory</h3>
              <p className="text-xs text-gray-500">Find items</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 bg-yellow-100 rounded-lg">
                <Utensils className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="text-sm font-medium text-gray-900">Menu</h3>
              <p className="text-xs text-gray-500">Search dishes</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 bg-purple-100 rounded-lg">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-sm font-medium text-gray-900">Orders</h3>
              <p className="text-xs text-gray-500">Find orders</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 bg-gray-100 rounded-lg">
                <Bed className="w-6 h-6 text-gray-600" />
              </div>
              <h3 className="text-sm font-medium text-gray-900">Rooms</h3>
              <p className="text-xs text-gray-500">Search rooms</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center w-12 h-12 mx-auto mb-2 bg-indigo-100 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-sm font-medium text-gray-900">Purchase Orders</h3>
              <p className="text-xs text-gray-500">Find POs</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return renderOverview();
      case 'search':
        return renderSearch();
      case 'staff':
        return <StaffManagement />;
      case 'shifts':
        return <ShiftManagement />;
      case 'performance':
        return <PerfomanceDashboard />;
      case 'inventory':
        return <InventoryManagement />;
      case 'menu':
        return <MenuManagement />;
      case 'rooms':
        return <RoomManagement />;
      case 'suppliers':
        return <SuppliersManagement />;
      case 'purchase-orders':
        return <PurchaseOrdersManagement />;
      case 'expenses':
        return <ExpensesManagement />;
      case 'product-returns':
        return <ProductReturnsManagement />;
      case 'reports':
        return <ReportsManagement />;
      case 'sales-reports':
        return <PersonalSalesReport />;
      case 'settings':
        return <SettingsManagement />;
      default:
        return renderOverview();
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />

      <div className="flex flex-1">
        <Sidebar
          title="Admin Dashboard"
          navItems={menuItems}
          activeItem={activeTab}
          onNavItemClick={setActiveTab}
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          showMobileQuickNav={false}
        >
          {sidebarStatusCard}
        </Sidebar>

        <div className="flex-1 flex flex-col overflow-hidden lg:ml-64">
          <div className="lg:hidden sticky top-0 bg-white border-b border-gray-200 z-10">
            <div className="px-4 sm:px-6 h-16 flex items-center justify-between">
              <h1 className="text-xl font-semibold text-gray-900">{activeTabLabel}</h1>
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="text-gray-500 hover:text-gray-600"
                aria-label="Open sidebar"
              >
                <Utensils className="w-6 h-6" />
              </button>
            </div>
          </div>

          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-full">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}