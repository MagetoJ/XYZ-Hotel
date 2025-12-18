import { useState, useEffect } from 'react';
import { apiClient } from '../config/api';
import { Printer, Download, Loader2, Clock, DollarSign } from 'lucide-react';
import ReceiptModal from './receptionist/ReceiptModal';

interface OrderItem {
  id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  notes?: string;
}

interface RecentOrder {
  id: number;
  order_number: string;
  order_type: string;
  customer_name?: string;
  total_amount: number;
  payment_method: string;
  status: string;
  created_at: string;
  items: OrderItem[];
}

interface ReceiptData {
  orderId?: number;
  orderNumber: string;
  customerName?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  total: number;
  paymentMethod: string;
  staffName: string;
  createdAt: string;
  orderType?: string;
}

export default function MyRecentOrders() {
  const [orders, setOrders] = useState<RecentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrderForReceipt, setSelectedOrderForReceipt] = useState<ReceiptData | null>(null);
  const [staffName, setStaffName] = useState<string>('');

  useEffect(() => {
    fetchRecentOrders();
  }, []);

  const fetchRecentOrders = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await apiClient.get('/api/orders/recent/all?limit=20&offset=0');
      
      if (!response.ok) {
        throw new Error('Failed to fetch recent orders');
      }

      const data = await response.json();
      setOrders(data);
      
      // Get staff name from local storage or first order
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setStaffName(user.name || 'Staff');
      }
    } catch (err) {
      console.error('Error fetching recent orders:', err);
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `KES ${Number(amount).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-KE', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateSubtotal = (items: OrderItem[]) => {
    return items.reduce((sum, item) => sum + item.total_price, 0);
  };

  const handleReprint = (order: RecentOrder) => {
    const receiptData: ReceiptData = {
      orderId: order.id,
      orderNumber: order.order_number,
      customerName: order.customer_name,
      items: order.items.map(item => ({
        name: item.product_name,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        totalPrice: Number(item.total_price)
      })),
      subtotal: calculateSubtotal(order.items),
      total: Number(order.total_amount),
      paymentMethod: order.payment_method || 'cash',
      staffName: staffName,
      createdAt: order.created_at,
      orderType: order.order_type
    };

    setSelectedOrderForReceipt(receiptData);
  };

  const getOrderTypeLabel = (orderType: string) => {
    const typeMap: { [key: string]: string } = {
      'dine_in': '🍽️ Dine In',
      'takeaway': '🛍️ Takeaway',
      'delivery': '🚗 Delivery',
      'room_service': '🛏️ Room Service'
    };
    return typeMap[orderType] || orderType;
  };

  const getPaymentMethodLabel = (method: string) => {
    const methodMap: { [key: string]: string } = {
      'cash': '💵 Cash',
      'card': '💳 Card',
      'mobile_money': '📱 Mobile Money',
      'room_charge': '🏨 Room Charge'
    };
    return methodMap[method] || method;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-10 h-10 animate-spin text-yellow-500 mx-auto mb-3" />
          <p className="text-gray-600">Loading your recent orders...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700 font-medium">Error loading orders</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-12 text-center">
        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">No recent orders</p>
        <p className="text-gray-500 text-sm mt-1">Your completed orders will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900">My Recent Orders</h2>
        <button
          onClick={fetchRecentOrders}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium"
        >
          <Download className="w-4 h-4 inline mr-2" />
          Refresh
        </button>
      </div>

      <div className="space-y-3">
        {orders.map((order) => (
          <div
            key={order.id}
            className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow p-4"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900">{order.order_number}</span>
                  <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                    {getOrderTypeLabel(order.order_type)}
                  </span>
                </div>
                <div className="flex items-center text-sm text-gray-600 gap-3">
                  <span>{formatDate(order.created_at)}</span>
                  {order.customer_name && (
                    <span className="text-gray-700">👤 {order.customer_name}</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">
                  {formatCurrency(order.total_amount)}
                </div>
                <div className="text-xs text-gray-600 mt-1">
                  {getPaymentMethodLabel(order.payment_method)}
                </div>
              </div>
            </div>

            {/* Items Summary */}
            <div className="mb-3 bg-gray-50 rounded p-3">
              <div className="text-sm text-gray-600 space-y-1">
                {order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between text-xs">
                    <span>{item.quantity}x {item.product_name}</span>
                    <span>{formatCurrency(item.total_price)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={() => handleReprint(order)}
              className="w-full py-2 px-4 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Reprint Receipt
            </button>
          </div>
        ))}
      </div>

      {/* Receipt Modal */}
      {selectedOrderForReceipt && (
        <ReceiptModal
          receiptData={selectedOrderForReceipt}
          onClose={() => setSelectedOrderForReceipt(null)}
        />
      )}
    </div>
  );
}