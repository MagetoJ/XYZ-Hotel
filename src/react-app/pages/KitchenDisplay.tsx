import KitchenInventoryManagement from '../components/kitchen/KitchenInventoryView';
import { useState, useEffect } from 'react';
import Header from '../components/Header';
import { Clock, CheckCircle, ChefHat, Package, X } from 'lucide-react';
import { API_URL } from '../config/api';
// --- Interface Definitions ---
interface KitchenOrderItem {
  id: number;
  product_name: string;
  quantity: number;
  notes?: string;
  status: 'pending' | 'preparing' | 'ready';
  preparation_time: number;
}

interface KitchenOrder {
  id: number;
  order_number: string;
  table_number?: string;
  room_number?: string;
  order_type: string;
  items: KitchenOrderItem[];
  total_time: number;
  priority: 'low' | 'medium' | 'high';
  created_at: string;
}

// --- Main Component ---
export default function KitchenDisplay() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showInventory, setShowInventory] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  // --- Data Fetching ---
  const fetchKitchenOrders = async () => {
    const token = localStorage.getItem('pos_token');
    try {
      const response = await fetch(`${API_URL}/api/orders/kitchen`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        const processedData = data.map((o: any) => ({
          ...o,
          priority: o.items.length > 2 ? 'high' : 'medium',
          total_time: Math.max(...o.items.map((i: any) => i.preparation_time || 0)),
        }));
        setOrders(processedData);
      } else {
        console.error('Failed to fetch kitchen orders.');
      }
    } catch (error) {
      console.error('Error fetching kitchen orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Effects ---
  useEffect(() => {
    fetchKitchenOrders();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    const wsUrl = window.location.protocol === 'https:' 
      ? `wss://${window.location.host}/ws/kitchen`
      : `ws://${window.location.host}/ws/kitchen`;

    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ WebSocket connected for KDS');
      setWsConnected(true);
    };
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.type === 'new_order') {
        console.log('New order received, refreshing...');
        fetchKitchenOrders();
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setWsConnected(false);
    };
    
    ws.onclose = () => {
      console.log('⚠️ WebSocket disconnected for KDS');
      setWsConnected(false);
    };

    return () => {
      clearInterval(timer);
      ws.close();
    };
  }, []);

  // --- Event Handlers ---
  const updateItemStatus = async (orderId: number, itemId: number, status: 'pending' | 'preparing' | 'ready') => {
    const token = localStorage.getItem('pos_token');
    try {
      await fetch(`${API_URL}/api/orders/${orderId}/items/${itemId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      fetchKitchenOrders(); // Re-fetch to ensure data consistency
    } catch (error) {
      console.error('Error updating item status:', error);
    }
  };

  const markOrderComplete = async (orderId: number) => {
    const token = localStorage.getItem('pos_token');
    try {
      await fetch(`${API_URL}/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: 'ready_for_pickup' }),
      });
      setOrders((prev) => prev.filter((order) => order.id !== orderId));
      alert('Order marked as complete and sent to service staff');
    } catch (error) {
      console.error('Error marking order as complete:', error);
    }
  };

  // --- Helper Functions ---
  const getElapsedTime = (createdAt: string) => {
    const created = new Date(createdAt);
    return Math.floor((currentTime.getTime() - created.getTime()) / 1000 / 60);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 border-red-300 text-red-800';
      case 'medium': return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'low': return 'bg-green-100 border-green-300 text-green-800';
      default: return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'bg-green-500 text-white';
      case 'preparing': return 'bg-yellow-500 text-white';
      case 'pending': return 'bg-gray-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  // --- Render Logic ---
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header />

      <div className="flex-1 p-4 lg:p-6 overflow-y-auto">
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ChefHat className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-600" />
              <div>
                <h1 className="text-xl sm:text-3xl font-bold text-gray-900">Kitchen Display System</h1>
                <p className="text-sm sm:text-base text-gray-600 flex items-center gap-2">
                  Active orders and preparation status
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${wsConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    {wsConnected ? 'Live' : 'Disconnected'}
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowInventory(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow hover:bg-blue-700 transition"
            >
              Manage Inventory
            </button>
          </div>
        </div>

        {/* --- Main Content --- */}
        {isLoading ? (
          <div className="text-center p-10">
            <p className="text-lg text-gray-500">Loading kitchen orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center p-10">
            <p className="text-lg text-gray-500">No active orders.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orders.map((order) => (
              <div key={order.id} className={`rounded-lg border shadow-sm flex flex-col ${getPriorityColor(order.priority)}`}>
                <div className="p-4 bg-white rounded-t-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="font-bold text-lg">{order.order_number}</h2>
                      <p className="text-sm text-gray-600">{order.order_type === 'dine-in' ? `Table ${order.table_number}` : `Room ${order.room_number}`}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg">{getElapsedTime(order.created_at)} min</p>
                      <p className="text-xs text-gray-500">Est. {order.total_time} min</p>
                    </div>
                  </div>
                </div>

                <div className="flex-1 p-4 border-t border-b">
                  {order.items.map((item) => (
                    <div key={item.id} className="mb-3">
                      <div className="flex justify-between items-center">
                        <p className="font-semibold">{item.quantity}x {item.product_name}</p>
                        <div className="flex gap-1">
                          <button onClick={() => updateItemStatus(order.id, item.id, 'pending')} className={`px-2 py-1 text-xs rounded ${item.status === 'pending' ? 'bg-gray-600 text-white' : 'bg-gray-200'}`}>P</button>
                          <button onClick={() => updateItemStatus(order.id, item.id, 'preparing')} className={`px-2 py-1 text-xs rounded ${item.status === 'preparing' ? 'bg-yellow-500 text-white' : 'bg-yellow-100'}`}>P</button>
                          <button onClick={() => updateItemStatus(order.id, item.id, 'ready')} className={`px-2 py-1 text-xs rounded ${item.status === 'ready' ? 'bg-green-500 text-white' : 'bg-green-100'}`}>R</button>
                        </div>
                      </div>
                      {item.notes && <p className="text-xs text-gray-500 italic"> - {item.notes}</p>}
                    </div>
                  ))}
                </div>

                <div className="p-2">
                  <button
                    onClick={() => markOrderComplete(order.id)}
                    disabled={order.items.some(i => i.status !== 'ready')}
                    className="w-full bg-green-600 text-white font-bold py-2 px-4 rounded disabled:bg-gray-400 hover:bg-green-700 transition"
                  >
                    <CheckCircle className="inline-block mr-2" />
                    Mark as Ready
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- Inventory Modal --- */}
      {showInventory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">Kitchen Inventory Management</h2>
              <button onClick={() => setShowInventory(false)} className="p-2 rounded-full hover:bg-gray-200">
                <X />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <KitchenInventoryManagement onClose={() => setShowInventory(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}