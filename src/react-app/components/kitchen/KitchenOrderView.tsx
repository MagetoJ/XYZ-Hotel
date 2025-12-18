import { useState, useEffect } from 'react';
import { apiClient } from '../../config/api';
import { timeAgo } from '../../pages/AdminDashboard'; // Reusing helper function

interface OrderItem {
  product_name: string;
  quantity: number;
  notes?: string;
}

interface Order {
  id: number;
  order_number: string;
  created_at: string;
  status: string;
  items: OrderItem[];
}

export default function KitchenOrderView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch initial orders
    const fetchOrders = async () => {
      try {
        const response = await apiClient.get('/api/kitchen/orders');
        if (response.ok) {
          setOrders(await response.json());
        }
      } catch (error) {
        console.error('Failed to fetch kitchen orders:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOrders();

    // Setup WebSocket connection
    const wsUrl = window.location.protocol === 'https:' 
      ? `wss://${window.location.host}/ws/kitchen`
      : `ws://${window.location.host}/ws/kitchen`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Kitchen WebSocket connected');
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'new_order') {
        setOrders((prevOrders) => [message.order, ...prevOrders]);
      }
    };

    ws.onclose = () => {
      console.log('Kitchen WebSocket disconnected');
    };

    // Cleanup on component unmount
    return () => {
      ws.close();
    };
  }, []);

  const handleStatusChange = async (orderId: number, status: string) => {
    try {
        await apiClient.put(`/api/kitchen/orders/${orderId}/status`, { status });
        setOrders(orders.map(o => o.id === orderId ? { ...o, status } : o));
    } catch (error) {
        console.error('Failed to update order status', error);
    }
  };


  if (isLoading) {
    return <div className="text-center p-8">Loading active orders...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Section with Stats */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Live Orders</h2>
            <p className="text-sm text-gray-600">Active orders requiring kitchen attention</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-2 rounded-lg">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-blue-700">
                {orders.filter(o => o.status === 'pending').length} New
              </span>
            </div>
            <div className="flex items-center gap-2 bg-orange-50 px-3 py-2 rounded-lg">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-sm font-medium text-orange-700">
                {orders.filter(o => o.status === 'preparing').length} Preparing
              </span>
            </div>
            <div className="flex items-center gap-2 bg-green-50 px-3 py-2 rounded-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-700">
                {orders.filter(o => o.status === 'ready').length} Ready
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Orders Grid - Responsive Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {orders.map((order) => (
          <div 
            key={order.id} 
            className={`bg-white rounded-lg shadow-md border-l-4 p-3 sm:p-4 flex flex-col transition-all duration-200 hover:shadow-lg ${
              order.status === 'pending' 
                ? 'border-l-blue-500 bg-blue-50/30' 
                : order.status === 'preparing' 
                ? 'border-l-orange-500 bg-orange-50/30' 
                : 'border-l-green-500 bg-green-50/30'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-base sm:text-lg text-gray-900">{order.order_number}</h3>
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                  order.status === 'pending' 
                    ? 'bg-blue-100 text-blue-800' 
                    : order.status === 'preparing' 
                    ? 'bg-orange-100 text-orange-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {order.status === 'pending' ? '🆕 New Order' : 
                   order.status === 'preparing' ? '👨‍🍳 Preparing' : 
                   '✅ Ready'}
                </div>
              </div>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {timeAgo(order.created_at)}
              </span>
            </div>

            <div className="flex-1 space-y-2 mb-4">
              {order.items.map((item, index) => (
                <div key={index} className="bg-white/70 rounded-lg p-2 border border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">
                          {item.quantity}×
                        </span>
                        <span className="font-medium text-gray-900 text-sm">{item.product_name}</span>
                      </div>
                      {item.notes && (
                        <div className="mt-1 bg-red-50 border border-red-200 rounded-md p-2">
                          <p className="text-xs text-red-700 font-medium">Special Request:</p>
                          <p className="text-xs text-red-600">{item.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              {order.status === 'pending' && (
                <button 
                  onClick={() => handleStatusChange(order.id, 'preparing')}
                  className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  👨‍🍳 Start Preparing
                </button>
              )}
              
              {order.status === 'preparing' && (
                <button 
                  onClick={() => handleStatusChange(order.id, 'ready')}
                  className="w-full py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                >
                  ✅ Mark as Ready
                </button>
              )}

              {order.status === 'ready' && (
                <div className="w-full py-2.5 bg-green-100 text-green-800 rounded-lg text-sm font-semibold text-center border border-green-200">
                  ✅ Order Complete - Ready for Pickup
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {orders.length === 0 && (
        <div className="text-center py-12">
          <div className="bg-gray-50 rounded-full w-20 h-20 mx-auto flex items-center justify-center mb-4">
            <span className="text-3xl">🍽️</span>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Orders</h3>
          <p className="text-gray-600">All caught up! New orders will appear here automatically.</p>
        </div>
      )}
    </div>
  );
}