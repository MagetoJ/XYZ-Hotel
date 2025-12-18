import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { apiClient } from '../config/api';
import { Calendar, DollarSign, Package, TrendingUp, Loader2, AlertCircle } from 'lucide-react';

interface SalesData {
  staff_id: number;
  staff_name: string;
  staff_role: string;
  sales_date: string;
  total_orders: number;
  total_sales: number;
  total_service_charge: number;
}

interface WaiterSalesData extends SalesData {
  // Additional fields if needed
}

export default function PersonalSalesReport() {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [salesData, setSalesData] = useState<SalesData | null>(null);
  const [waiterSalesData, setWaiterSalesData] = useState<WaiterSalesData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReceptionist = user?.role === 'receptionist';
  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';
  const canViewWaiterReports = isReceptionist || isAdminOrManager;

  useEffect(() => {
    fetchSalesData();
    if (canViewWaiterReports) {
      fetchWaiterSalesData();
    }
  }, [selectedDate, user]);

  const fetchSalesData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.get(`/api/reports/personal-sales?date=${selectedDate}`);
      
      if (response.ok) {
        const data = await response.json();
        setSalesData(data);
      } else {
        throw new Error('Failed to fetch personal sales data');
      }
    } catch (err) {
      setError('Failed to load sales data. Please try again.');
      console.error('Personal sales fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWaiterSalesData = async () => {
    try {
      const response = await apiClient.get(`/api/reports/waiter-sales?date=${selectedDate}`);
      
      if (response.ok) {
        const data = await response.json();
        setWaiterSalesData(data);
      } else {
        console.error('Failed to fetch waiter sales data');
      }
    } catch (err) {
      console.error('Waiter sales fetch error:', err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Sales Reports</h2>
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-gray-500" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Personal Sales Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Your Sales for {formatDate(selectedDate)}
        </h3>

        {salesData ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-green-600 font-medium">Total Sales</p>
                  <p className="text-2xl font-bold text-green-800">
                    {formatCurrency(salesData.total_sales)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Package className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total Orders</p>
                  <p className="text-2xl font-bold text-blue-800">
                    {salesData.total_orders}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-violet-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-purple-600 font-medium">Service Charges</p>
                  <p className="text-2xl font-bold text-purple-800">
                    {formatCurrency(salesData.total_service_charge)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No sales data found for {formatDate(selectedDate)}</p>
          </div>
        )}
      </div>

      {/* Waiter Sales Monitoring (for Receptionists/Admins) */}
      {canViewWaiterReports && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Waiter Sales for {formatDate(selectedDate)}
          </h3>

          {waiterSalesData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Waiter
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Orders
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Sales
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service Charges
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg. per Order
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {waiterSalesData.map((waiter) => (
                    <tr key={waiter.staff_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {waiter.staff_name}
                          </div>
                          <div className="text-sm text-gray-500 capitalize">
                            {waiter.staff_role}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {waiter.total_orders}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                        {formatCurrency(waiter.total_sales)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(waiter.total_service_charge)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {waiter.total_orders > 0 
                          ? formatCurrency(waiter.total_sales / waiter.total_orders)
                          : formatCurrency(0)
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p>No waiter sales data found for {formatDate(selectedDate)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}