import { useState, useEffect } from 'react';
import { apiClient } from '../../config/api';
import InventoryUpdateModal from '../InventoryUpdateModal'; // Reusing the modal

interface InventoryItem {
  id: number;
  name: string;
  current_stock: number;
  unit: string;
  inventory_type: string;
}

export default function ReceptionistInventory() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const fetchItems = async () => {
    try {
      const response = await apiClient.get('/api/inventory');
      if (response.ok) {
        setItems(await response.json());
      }
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleUpdateSuccess = () => {
    setEditingItem(null);
    fetchItems(); // Refresh data after update
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Manage Bar & Housekeeping Inventory</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Stock</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-4">{item.name}</td>
                <td className="px-6 py-4 capitalize">{item.inventory_type}</td>
                <td className="px-6 py-4">{item.current_stock} {item.unit}</td>
                <td className="px-6 py-4 text-right">
                  <button
                    onClick={() => setEditingItem(item)}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Update Stock
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingItem && (
        <InventoryUpdateModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
          onSuccess={handleUpdateSuccess}
        />
      )}
    </div>
  );
}