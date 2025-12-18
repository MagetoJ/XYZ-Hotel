import React, { useState, useEffect } from 'react';
import { User, Phone, MapPin, Package } from 'lucide-react';
import { API_URL } from '../config/api'; //

// ← ADD THIS FUNCTION
const formatCurrency = (amount: number): string => {
  return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

interface DeliveryItem {
    quantity: number;
    product_name: string;
}

interface DeliveryOrder {
    id: number;
    order_number: string;
    customer_name: string;
    customer_phone: string;
    delivery_address: string;
    total_amount: number;
    delivery_status: 'unassigned' | 'assigned' | 'out_for_delivery' | 'delivered';
    created_at: string;
    items: DeliveryItem[];
}

export default function DeliveryManagement() {
    const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchDeliveries = async () => {
        setIsLoading(true);
        const token = localStorage.getItem('pos_token');
        try {
            const response = await fetch(`${API_URL}/api/deliveries`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setDeliveries(data);
            }
        } catch (error) {
            console.error("Failed to fetch deliveries:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDeliveries();
        const interval = setInterval(fetchDeliveries, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const updateStatus = async (orderId: number, status: DeliveryOrder['delivery_status']) => {
        const token = localStorage.getItem('pos_token');
        try {
            const response = await fetch(`${API_URL}/api/deliveries/${orderId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });
            if (response.ok) {
                // Optimistically update UI or re-fetch
                fetchDeliveries();
            } else {
                alert("Failed to update status");
            }
        } catch (error) {
            console.error("Failed to update status:", error);
        }
    };
    
    const columns = {
        unassigned: deliveries.filter(d => d.delivery_status === 'unassigned'),
        assigned: deliveries.filter(d => d.delivery_status === 'assigned'),
        out_for_delivery: deliveries.filter(d => d.delivery_status === 'out_for_delivery'),
    };

    if (isLoading && deliveries.length === 0) {
        return <div className="p-6 text-center">Loading delivery orders...</div>;
    }

    return (
        <div className="flex-1 p-6 overflow-x-auto">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Delivery Management</h2>
                <p className="text-gray-600">Track and manage all outgoing delivery orders.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-[1200px]">
                {/* Column for Unassigned */}
                <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-4">New Orders ({columns.unassigned.length})</h3>
                    <div className="space-y-4">
                        {columns.unassigned.map(order => (
                            <DeliveryCard key={order.id} order={order} onUpdateStatus={updateStatus} />
                        ))}
                    </div>
                </div>

                {/* Column for Assigned */}
                <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-4">Preparing / Assigned ({columns.assigned.length})</h3>
                    <div className="space-y-4">
                        {columns.assigned.map(order => (
                            <DeliveryCard key={order.id} order={order} onUpdateStatus={updateStatus} />
                        ))}
                    </div>
                </div>

                {/* Column for Out for Delivery */}
                <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-4">Out for Delivery ({columns.out_for_delivery.length})</h3>
                    <div className="space-y-4">
                        {columns.out_for_delivery.map(order => (
                            <DeliveryCard key={order.id} order={order} onUpdateStatus={updateStatus} />
                        ))}
                    </div>
                </div>
            </div>
             {deliveries.length === 0 && !isLoading && (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">No Active Deliveries</h3>
                <p className="text-gray-600">New delivery orders will appear here automatically.</p>
              </div>
            )}
        </div>
    );
}

// Sub-component for the delivery order card
interface DeliveryCardProps {
    key?: React.Key;
    order: DeliveryOrder;
    onUpdateStatus: (id: number, status: DeliveryOrder['delivery_status']) => Promise<void>;
}

const DeliveryCard = ({ order, onUpdateStatus }: DeliveryCardProps) => {
    return (
        <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h4 className="font-bold text-gray-900">{order.order_number}</h4>
                    <span className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleTimeString()}
                    </span>
                </div>
                <span className="font-bold text-lg text-green-600">{formatCurrency(order.total_amount)}</span>
            </div>

            <div className="space-y-2 text-sm text-gray-700 mb-3">
                <div className="flex items-center gap-2"><User size={14} /> {order.customer_name}</div>
                <div className="flex items-center gap-2"><Phone size={14} /> {order.customer_phone}</div>
                <div className="flex items-center gap-2"><MapPin size={14} /> {order.delivery_address}</div>
            </div>
            
            <div className="border-t border-gray-100 pt-2 mb-3">
                <p className="text-xs font-medium text-gray-500">Items:</p>
                <p className="text-xs text-gray-600 truncate">
                    {order.items.map(item => `${item.quantity}x ${item.product_name}`).join(', ')}
                </p>
            </div>

            <div className="flex gap-2">
                 {order.delivery_status === 'unassigned' && (
                    <button onClick={() => onUpdateStatus(order.id, 'assigned')} className="flex-1 bg-blue-500 text-white py-1.5 rounded-md text-sm">Assign Driver</button>
                )}
                 {order.delivery_status === 'assigned' && (
                    <button onClick={() => onUpdateStatus(order.id, 'out_for_delivery')} className="flex-1 bg-yellow-500 text-white py-1.5 rounded-md text-sm">Out for Delivery</button>
                )}
                 {order.delivery_status === 'out_for_delivery' && (
                    <button onClick={() => onUpdateStatus(order.id, 'delivered')} className="flex-1 bg-green-500 text-white py-1.5 rounded-md text-sm">Mark Delivered</button>
                )}
            </div>
        </div>
    );
};
