import { useState, useEffect } from 'react';
import { Package, AlertTriangle, Search, RefreshCw, Edit } from 'lucide-react';
import { API_URL } from '../config/api';
import InventoryUpdateModal from '../components/InventoryUpdateModal';

interface InventoryItem {
  id: number;
  name: string;
  current_stock: number;
  unit: string;
  minimum_stock: number;
  category: string;
  last_restock_date: string;
}

interface KitchenInventoryManagementProps {
  onClose: () => void;
}

export default function KitchenInventoryManagement({ onClose }: KitchenInventoryManagementProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [filteredInventory, setFilteredInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const categories = ['all', 'vegetables', 'meat', 'dairy', 'spices', 'grains', 'beverages', 'other'];

  const fetchKitchenInventory = async () => {
    setLoading(true);
    const token = localStorage.getItem('pos_token');
    
    try {
      const response = await fetch(`${API_URL}/api/inventory/kitchen`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.ok) {
        const data = await response.json();
        setInventory(data);
        setFilteredInventory(data);
      } else {
        console.error('Failed to fetch kitchen inventory');
      }
    } catch (error) {
      console.error('Error fetching kitchen inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKitchenInventory();
  }, []);

  useEffect(() => {
    let filtered = inventory;

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => 
        item.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredInventory(filtered);
  }, [searchTerm, selectedCategory, inventory]);

  const handleUpdateStock = async (itemId: number, newStock: number, reason: string) => {
    const token = localStorage.getItem('pos_token');
    
    try {
      const response = await fetch(`${API_URL}/api/inventory/kitchen/${itemId}/update-stock`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          current_stock: newStock,
          reason: reason,
        }),
      });

      if (response.ok) {
        await fetchKitchenInventory();
        alert('Inventory updated successfully!');
      } else {
        throw new Error('Failed to update inventory');
      }
    } catch (error) {
      console.error('Error updating inventory:', error);
      throw error;
    }
  };

  const getStockStatus = (item: InventoryItem) => {
    if (item.current_stock === 0) return 'out-of-stock';
    if (item.current_stock <= item.minimum_stock) return 'low';
    return 'normal';
  };

  const getStockStatusColor = (status: string) => {
    switch (status) {
      case 'out-of-stock':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'low':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      default:
        return 'bg-green-100 border-green-300 text-green-800';
    }
  };

  const lowStockCount = inventory.filter(item => getStockStatus(item) === 'low').length;
  const outOfStockCount = inventory.filter(item => getStockStatus(item) === 'out-of-stock').length;

  return (
    <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Kitchen Inventory</h2>
                <p className="text-sm text-gray-600">Manage kitchen stock levels</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs sm:text-sm text-blue-600 mb-1">Total Items</p>
              <p className="text-xl sm:text-2xl font-bold text-blue-700">{inventory.length}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3">
              <p className="text-xs sm:text-sm text-yellow-600 mb-1">Low Stock</p>
              <p className="text-xl sm:text-2xl font-bold text-yellow-700">{lowStockCount}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-xs sm:text-sm text-red-600 mb-1">Out of Stock</p>
              <p className="text-xl sm:text-2xl font-bold text-red-700">{outOfStockCount}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 sm:p-6 border-b border-gray-200 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchKitchenInventory}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Inventory List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <RefreshCw className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading inventory...</p>
              </div>
            </div>
          ) : filteredInventory.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">No items found</h3>
              <p className="text-gray-600">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInventory.map((item) => {
                const status = getStockStatus(item);
                const statusColor = getStockStatusColor(status);

                return (
                  <div
                    key={item.id}
                    className={`bg-white border-2 rounded-lg p-4 hover:shadow-md transition-shadow ${
                      status === 'out-of-stock' ? 'border-red-300' : 
                      status === 'low' ? 'border-yellow-300' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-900 truncate">{item.name}</h3>
                        <p className="text-xs text-gray-500 capitalize">{item.category}</p>
                      </div>
                      {status !== 'normal' && (
                        <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
                          status === 'out-of-stock' ? 'text-red-600' : 'text-yellow-600'
                        }`} />
                      )}
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Current Stock:</span>
                        <span className={`font-bold text-lg ${
                          status === 'out-of-stock' ? 'text-red-600' :
                          status === 'low' ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {item.current_stock} {item.unit}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Minimum:</span>
                        <span className="text-sm text-gray-900">
                          {item.minimum_stock} {item.unit}
                        </span>
                      </div>
                    </div>

                    <div className={`px-3 py-1 rounded-full text-xs font-medium mb-3 text-center ${statusColor}`}>
                      {status === 'out-of-stock' ? 'OUT OF STOCK' :
                       status === 'low' ? 'LOW STOCK' : 'IN STOCK'}
                    </div>

                    <button
                      onClick={() => {
                        setSelectedItem(item);
                        setShowUpdateModal(true);
                      }}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Update Stock
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Update Modal */}
      <InventoryUpdateModal
        isOpen={showUpdateModal}
        onClose={() => {
          setShowUpdateModal(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        onUpdate={handleUpdateStock}
      />
    </div>
  );
}