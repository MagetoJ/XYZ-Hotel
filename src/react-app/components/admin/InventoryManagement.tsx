import { useState, useEffect } from 'react';
import { Package, Plus, Edit3, Trash2, AlertTriangle, Search, Upload } from 'lucide-react';
import { API_URL } from '../../config/api';
import { useAuth } from '../../contexts/AuthContext';
import SearchComponent from '../SearchComponent'; 

interface InventoryItem {
  id: number;
  name: string;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  cost_per_unit: number;
  buying_price?: number;
  supplier: string;
  inventory_type: 'kitchen' | 'bar' | 'housekeeping' | 'minibar';
  is_active: boolean;
  last_updated: string;
}

export default function InventoryManagement() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [selectedType, setSelectedType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedInventoryIds, setSelectedInventoryIds] = useState<number[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    unit: '',
    current_stock: 0,
    minimum_stock: 0,
    cost_per_unit: 0,
    buying_price: 0,
    supplier: '',
    inventory_type: 'kitchen' as 'kitchen' | 'bar' | 'housekeeping' | 'minibar'
  });

  // Role-based inventory access
  const getAllowedInventoryTypes = () => {
    switch (user?.role) {
      case 'kitchen':
      case 'kitchen_staff':
        return ['kitchen'];
      case 'receptionist':
        return ['bar', 'housekeeping', 'minibar'];
      case 'admin':
      case 'manager':
        return ['kitchen', 'bar', 'housekeeping', 'minibar'];
      default:
        return [];
    }
  };

  const allowedTypes = getAllowedInventoryTypes();
  const canManageType = (type: string) => allowedTypes.includes(type);
  const canAddItems = allowedTypes.length > 0;

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm]);

  useEffect(() => {
    if (user) {
      fetchInventory();
    }
  }, []);

  useEffect(() => {
    fetchInventory();
  }, [selectedType]);

  const fetchInventory = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('pos_token');
      if (!token) return setError('No authentication token found');

      const params = new URLSearchParams();
      if (selectedType !== 'all') {
        params.append('inventory_type', selectedType);
      }

      const url = `${API_URL}/api/inventory?${params.toString()}`;
      console.log('📡 Fetching inventory from:', url);
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: 'Failed to fetch inventory' }));
        console.error('API error:', errData);
        setError(`API Error (${response.status}): ${errData.message || 'Failed to fetch inventory'}`);
        return;
      }

      const data = await response.json();
      console.log('✅ Fetched items:', data.length);
      setInventory(data);
    } catch (err) {
      setError('Network error. Please check your connection.');
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const inventoryTypes = [
    { value: 'kitchen', label: 'Kitchen', color: 'bg-green-100 text-green-800' },
    { value: 'bar', label: 'Bar', color: 'bg-blue-100 text-blue-800' },
    { value: 'housekeeping', label: 'Housekeeping', color: 'bg-purple-100 text-purple-800' },
    { value: 'minibar', label: 'Minibar', color: 'bg-orange-100 text-orange-800' }
  ];

  const filteredInventory = (() => {
    let filtered = selectedType === 'all'
      ? inventory.filter(item => canManageType(item.inventory_type))
      : inventory.filter(item => item.inventory_type === selectedType && canManageType(item.inventory_type));

    // Apply search filter if search term is 3+ characters
    const trimmedSearch = debouncedSearchTerm.trim();
    if (trimmedSearch.length >= 3) {
      const searchLower = trimmedSearch.toLowerCase();
      filtered = filtered.filter(item => {
        // FIX: Safer property access to prevent "Cannot read properties of null (reading 'toLowerCase')"
        const itemName = item.name?.toLowerCase() || '';
        const itemSupplier = item.supplier?.toLowerCase() || '';
        const itemType = item.inventory_type?.toLowerCase() || '';
        const itemUnit = item.unit?.toLowerCase() || '';

        return (
          itemName.includes(searchLower) ||
          itemSupplier.includes(searchLower) ||
          itemType.includes(searchLower) ||
          itemUnit.includes(searchLower) ||
          String(item.id).includes(searchLower)
        );
      });
    }

    return filtered;
  })();

  // Search suggestions
  const searchSuggestions = (() => {
    if (!debouncedSearchTerm.trim()) return [];

    const searchLower = debouncedSearchTerm.toLowerCase().trim();
    return inventory
      .filter(item => {
        // FIX: Safer property access to prevent "Cannot read properties of null (reading 'toLowerCase')"
        const itemName = item.name?.toLowerCase() || '';
        const itemSupplier = item.supplier?.toLowerCase() || '';
        const itemType = item.inventory_type?.toLowerCase() || '';
        const itemUnit = item.unit?.toLowerCase() || '';

        return (
          itemName.includes(searchLower) ||
          itemSupplier.includes(searchLower) ||
          itemType.includes(searchLower) ||
          itemUnit.includes(searchLower) ||
          String(item.id).includes(searchLower)
        );
      })
      .slice(0, 8); // Limit to 8 suggestions
  })();

  const lowStockItems = inventory.filter(item => item.current_stock <= item.minimum_stock);
  const totalValue = inventory.reduce((sum, item) => sum + (item.current_stock * item.cost_per_unit), 0);

  const handleSuggestionClick = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      unit: item.unit,
      current_stock: item.current_stock,
      minimum_stock: item.minimum_stock,
      cost_per_unit: item.cost_per_unit,
      buying_price: item.buying_price ?? 0,
      supplier: item.supplier,
      inventory_type: item.inventory_type
    });
    setSearchTerm('');
    setShowSuggestions(false);
    setShowAddModal(true);
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.unit || !formData.supplier) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('pos_token');
      const response = await fetch(`${API_URL}/api/inventory`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: 'Failed to add item' }));
        setError(errData.message || 'Failed to add inventory item');
        return;
      }

      await fetchInventory();
      resetForm();
      setShowAddModal(false);
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Add error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      unit: item.unit || '',
      current_stock: item.current_stock ?? 0,
      minimum_stock: item.minimum_stock ?? 0,
      cost_per_unit: item.cost_per_unit ?? 0,
      buying_price: item.buying_price ?? 0,
      supplier: item.supplier || '',
      inventory_type: item.inventory_type || 'kitchen'
    });
    setShowAddModal(true);
    setError(null);
  };

  const handleUpdate = async () => {
    if (!editingItem) return;
    if (!formData.name || !formData.unit || !formData.supplier) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('pos_token');
      const response = await fetch(`${API_URL}/api/inventory/${editingItem.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: 'Failed to update item' }));
        setError(errData.message || 'Failed to update inventory item');
        return;
      }

      await fetchInventory();
      setEditingItem(null);
      resetForm();
      setShowAddModal(false);
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Update error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this inventory item?')) return;

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('pos_token');
      const response = await fetch(`${API_URL}/api/inventory/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: 'Failed to delete item' }));
        setError(errData.message || 'Failed to delete inventory item');
        return;
      }

      await fetchInventory();
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Delete error:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStock = async (id: number, newStock: number) => {
    setError(null);
    try {
      const token = localStorage.getItem('pos_token');
      const response = await fetch(`${API_URL}/api/inventory/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ current_stock: Math.max(0, newStock) })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ message: 'Failed to update stock' }));
        setError(errData.message || 'Failed to update stock');
      } else {
        await fetchInventory();
      }
    } catch (err) {
      setError('Network error. Please try again.');
      console.error('Stock update error:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      unit: '',
      current_stock: 0,
      minimum_stock: 0,
      cost_per_unit: 0,
      buying_price: 0,
      supplier: '',
      inventory_type: 'kitchen'
    });
    setError(null);
  };

  const getStockStatusColor = (item: InventoryItem) => {
    if (item.current_stock === 0) return 'text-red-600';
    if (item.current_stock <= item.minimum_stock) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getTypeColor = (type: string) => {
    const typeConfig = inventoryTypes.find(t => t.value === type);
    return typeConfig?.color || 'bg-gray-100 text-gray-800';
  };

  const calculateMargin = (selling: number, buying: number) => {
    if (!selling || selling === 0) return 0;
    return ((selling - buying) / selling) * 100;
  };

  const toggleInventorySelection = (id: number) => {
    setSelectedInventoryIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllInventory = () => {
    const allFilteredIds = filteredInventory.map(item => item.id);
    const allSelected = allFilteredIds.every(id => selectedInventoryIds.includes(id));

    if (allSelected) {
      setSelectedInventoryIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      const newSelection = new Set([...selectedInventoryIds, ...allFilteredIds]);
      setSelectedInventoryIds(Array.from(newSelection));
    }
  };

  const handleBulkDeleteInventory = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedInventoryIds.length} inventory items?`)) return;

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('pos_token');
      await Promise.all(selectedInventoryIds.map(id => 
        fetch(`${API_URL}/api/inventory/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ));
      await fetchInventory();
      setSelectedInventoryIds([]);
      alert('Items deleted successfully');
    } catch (err) {
      setError('Failed to delete some items');
      console.error('Bulk delete error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkStatusUpdate = async (isActive: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('pos_token');
      await Promise.all(selectedInventoryIds.map(id => {
        const item = inventory.find(i => i.id === id);
        if (!item) return Promise.resolve();
        return fetch(`${API_URL}/api/inventory/${id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ ...item, is_active: isActive })
        });
      }));
      await fetchInventory();
      setSelectedInventoryIds([]);
      alert('Items updated successfully');
    } catch (err) {
      setError('Failed to update items');
      console.error('Bulk update error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkMinStockUpdate = async () => {
    const valueStr = prompt(`Enter the new Minimum Stock level for the ${selectedInventoryIds.length} selected items:`);
    if (valueStr === null) return;

    const newMinStock = parseInt(valueStr);
    
    if (isNaN(newMinStock) || newMinStock < 0) {
      alert('Please enter a valid non-negative number.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('pos_token');
      await Promise.all(selectedInventoryIds.map(id => {
        return fetch(`${API_URL}/api/inventory/${id}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          body: JSON.stringify({ minimum_stock: newMinStock })
        });
      }));

      await fetchInventory();
      setSelectedInventoryIds([]);
      alert('Minimum stock levels updated successfully');
    } catch (err) {
      setError('Failed to update minimum stock for some items');
      console.error('Bulk min stock update error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number): string => {
    return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validExtensions = ['.csv', '.xlsx', '.xls', '.pdf'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!validExtensions.includes(fileExtension)) {
      setError('Invalid file type. Please upload CSV, Excel, or PDF.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('pos_token');
      const response = await fetch(`${API_URL}/api/inventory/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      let msg = `Import Successful!\nAdded: ${data.inserted}\nUpdated: ${data.updated}`;
      if (data.errors && data.errors.length > 0) {
        msg += `\n\nWarnings:\n${data.errors.slice(0, 3).join('\n')}...`;
      }
      alert(msg);

      await fetchInventory();
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload file');
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory Management</h2>
          <p className="text-gray-600">Track stock levels and manage suppliers</p>
        </div>
        {canAddItems && (
          <div className="flex gap-2">
            <div className="relative">
              <input
                type="file"
                accept=".csv,.xlsx,.xls,.pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="inventory-file-input"
                disabled={loading}
              />
              <label
                htmlFor="inventory-file-input"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer"
              >
                <Upload className="w-5 h-5" />
                Import
              </label>
            </div>
            <button
              onClick={() => { setEditingItem(null); resetForm(); setShowAddModal(true); }}
              className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-4 py-2 rounded-lg font-medium transition-colors"
              disabled={loading}
            >
              <Plus className="w-5 h-5" />
              Add Item
            </button>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{inventory.length}</div>
          <div className="text-sm text-gray-600">Total Items</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-red-600">{lowStockItems.length}</div>
          <div className="text-sm text-gray-600">Low Stock Alerts</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-green-600">{formatCurrency(totalValue)}</div>
          <div className="text-sm text-gray-600">Total Inventory Value</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-purple-600">{inventory.filter(i => i.inventory_type === 'kitchen').length}</div>
          <div className="text-sm text-gray-600">Kitchen Items</div>
        </div>
      </div>



      {/* Search */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <SearchComponent
          onSearch={(query) => setSearchTerm(query)}
          placeholder="Search inventory items to edit..."
          initialValue={searchTerm}
        />
        {showSuggestions && searchSuggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
            {searchSuggestions.map(item => (
              <button
                type="button"
                key={item.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSuggestionClick(item)}
                className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
              >
                <p className="text-sm font-medium text-gray-900">{item.name}</p>
                <p className="text-xs text-gray-500">
                  ID: {item.id} • {item.supplier} • Stock: {item.current_stock} {item.unit} • {item.inventory_type}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              selectedType === 'all'
                ? 'bg-yellow-400 text-yellow-900'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All Items ({inventory.length})
          </button>
          {inventoryTypes
            .filter(type => canManageType(type.value))
            .map(type => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedType === type.value
                    ? 'bg-yellow-400 text-yellow-900'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {type.label} ({inventory.filter(i => i.inventory_type === type.value).length})
              </button>
            ))}
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <h3 className="text-lg font-semibold text-yellow-900">Low Stock Alerts</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockItems.map(item => (
              <div key={item.id} className="bg-white rounded-md p-3 border border-yellow-200">
                <div className="font-medium text-gray-900">{item.name}</div>
                <div className="text-sm text-gray-600">
                  Current: <span className="text-red-600 font-semibold">{item.current_stock} {item.unit}</span>
                  <span className="mx-2">•</span>
                  Min: {item.minimum_stock} {item.unit}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-400"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedInventoryIds.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex items-center justify-between">
          <span className="text-yellow-800 font-medium">{selectedInventoryIds.length} items selected</span>
          <div className="flex gap-2">
            <button
              onClick={handleBulkMinStockUpdate}
              className="px-3 py-1.5 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
            >
              Set Min Stock
            </button>
            <button
              onClick={() => handleBulkStatusUpdate(true)}
              className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            >
              Mark Active
            </button>
            <button
              onClick={() => handleBulkStatusUpdate(false)}
              className="px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
            >
              Mark Inactive
            </button>
            <button
              onClick={handleBulkDeleteInventory}
              className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-sm flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </div>
      )}

      {/* Inventory Table */}
      {!loading && (
        <>
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
            <span>Showing {filteredInventory.length} of {inventory.length} inventory items</span>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input 
                      type="checkbox"
                      checked={filteredInventory.length > 0 && filteredInventory.every(item => selectedInventoryIds.includes(item.id))}
                      onChange={toggleSelectAllInventory}
                      className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pricing & Margin</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Updated</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input 
                        type="checkbox"
                        checked={selectedInventoryIds.includes(item.id)}
                        onChange={() => toggleInventorySelection(item.id)}
                        className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                          <Package className="w-5 h-5 text-white" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{item.name}</div>
                          <div className="text-sm text-gray-500">Per {item.unit}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(item.inventory_type)}`}>
                        {inventoryTypes.find(t => t.value === item.inventory_type)?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`text-sm font-semibold ${getStockStatusColor(item)}`}>
                          {item.current_stock} {item.unit}
                        </div>
                        {item.current_stock <= item.minimum_stock && (
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        Min: {item.minimum_stock} {item.unit}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <button
                          onClick={() => updateStock(item.id, item.current_stock - 1)}
                          className="w-6 h-6 bg-red-100 hover:bg-red-200 text-red-600 rounded-full flex items-center justify-center text-xs font-bold"
                          disabled={loading}
                        >
                          -
                        </button>
                        <button
                          onClick={() => updateStock(item.id, item.current_stock + 1)}
                          className="w-6 h-6 bg-green-100 hover:bg-green-200 text-green-600 rounded-full flex items-center justify-center text-xs font-bold"
                          disabled={loading}
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between w-40">
                          <span className="text-gray-500 text-xs">Buy:</span>
                          <span className="font-medium">{formatCurrency(item.buying_price || 0)}</span>
                        </div>
                        <div className="flex justify-between w-40">
                          <span className="text-gray-500 text-xs">Sell:</span>
                          <span className="font-medium text-blue-600">{formatCurrency(item.cost_per_unit)}</span>
                        </div>
                        {item.cost_per_unit > 0 && (
                          <div className={`text-xs font-bold text-right w-40 ${
                            calculateMargin(item.cost_per_unit, item.buying_price || 0) > 30 ? 'text-green-600' : 'text-orange-500'
                          }`}>
                            Margin: {calculateMargin(item.cost_per_unit, item.buying_price || 0).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.supplier}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(item.last_updated).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        {canManageType(item.inventory_type) ? (
                          <>
                            <button
                              onClick={() => handleEdit(item)}
                              className="text-blue-600 hover:text-blue-900"
                              disabled={loading}
                              title="Edit item"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="text-red-600 hover:text-red-900"
                              disabled={loading}
                              title="Delete item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <span className="text-gray-400 text-xs">No access</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        </>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingItem ? 'Edit Inventory Item' : 'Add New Inventory Item'}
            </h3>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  required
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    placeholder="kg, bottles, pieces"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select
                    value={formData.inventory_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, inventory_type: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    disabled={loading}
                  >
                    {inventoryTypes
                      .filter(type => canManageType(type.value))
                      .map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Stock</label>
                  <input
                    type="number"
                    value={formData.current_stock}
                    onChange={(e) => setFormData(prev => ({ ...prev, current_stock: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    min="0"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Stock</label>
                  <input
                    type="number"
                    value={formData.minimum_stock}
                    onChange={(e) => setFormData(prev => ({ ...prev, minimum_stock: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    min="0"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Buying Price (Cost)</label>
                  <input
                    type="number"
                    value={formData.buying_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, buying_price: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    min="0"
                    step="0.01"
                    disabled={loading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price</label>
                  <input
                    type="number"
                    value={formData.cost_per_unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, cost_per_unit: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    min="0"
                    step="0.01"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {formData.cost_per_unit > 0 && (
                <div className="mt-2 text-sm text-right text-gray-600">
                  Expected Margin: <span className="font-bold">{calculateMargin(formData.cost_per_unit, formData.buying_price).toFixed(1)}%</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setEditingItem(null);
                  setShowAddModal(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={editingItem ? handleUpdate : handleAdd}
                disabled={!formData.name || !formData.unit || !formData.supplier || loading}
                className="flex-1 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : editingItem ? 'Update' : 'Add'} Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}