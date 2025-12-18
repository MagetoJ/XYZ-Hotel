import { useState, useEffect } from 'react';
import { apiClient } from '../../config/api';
import { Package, Edit } from 'lucide-react';

// This new interface defines the props your component will accept
interface KitchenInventoryViewProps {
  onClose: () => void; // It expects a function called `onClose`
}

interface InventoryItem {
  id: number;
  name: string;
  current_stock: number;
  unit: string;
}

// The component's function signature is updated to accept the props
export default function KitchenInventoryView({ onClose }: KitchenInventoryViewProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [newStock, setNewStock] = useState(0);

  const fetchInventory = async () => {
    try {
      const response = await apiClient.get('/api/inventory');
      if (response.ok) {
        setInventory(await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleUpdateStock = async () => {
    if (!editingItem) return;

    try {
      const response = await apiClient.put(`/api/inventory/${editingItem.id}/stock`, {
        current_stock: newStock,
      });

      if (response.ok) {
        fetchInventory(); // Re-fetch to get updated list
        setEditingItem(null); // Close modal
      }
    } catch (error) {
      console.error('Failed to update stock:', error);
    }
  };

  // This is the start of the part you asked about.
  // It begins right after the last function inside your component.
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg relative">
      
      {/* A close button has been added here */}
      <button 
        onClick={onClose} 
        className="absolute top-2 right-3 text-gray-500 hover:text-gray-800 text-2xl font-bold"
        aria-label="Close"
      >
        &times;
      </button>

      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Package /> Kitchen Inventory
      </h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {inventory.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap">{item.name}</td>
                <td className="px-6 py-4 whitespace-nowrap">{item.current_stock}</td>
                <td className="px-6 py-4 whitespace-nowrap">{item.unit}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <button
                    onClick={() => {
                      setEditingItem(item);
                      setNewStock(item.current_stock);
                    }}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    <Edit size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal for editing stock */}
      {editingItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">Update Stock for {editingItem.name}</h3>
            <label className="block mb-2 text-sm font-medium">New Stock Count:</label>
            <input
              type="number"
              value={newStock}
              onChange={(e) => setNewStock(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditingItem(null)} className="px-4 py-2 bg-gray-200 rounded-md">Cancel</button>
              <button onClick={handleUpdateStock} className="px-4 py-2 bg-blue-600 text-white rounded-md">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}