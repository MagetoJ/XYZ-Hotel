import { useState, useEffect } from 'react';
import { apiClient } from '../../config/api';
import { Plus, Trash2, Edit2, Loader2, AlertCircle, X, CheckCircle, Truck, Search } from 'lucide-react';

interface InventoryItem {
  id: number;
  name: string;
  unit: string;
  current_stock: number;
}

interface Supplier {
  id: number;
  name: string;
}

interface PurchaseOrderItem {
  id: number;
  inventory_item_id: number;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  item_name?: string;
}

interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_id: number;
  supplier_name?: string;
  order_date: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  status: string;
  total_amount: number;
  notes?: string;
  items?: PurchaseOrderItem[];
  created_by?: number;
  created_at: string;
}

const formatInventoryOption = (item: InventoryItem) => `${item.id} - ${item.name} (${item.unit})`;

export default function PurchaseOrdersManagement() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showReceiveForm, setShowReceiveForm] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [formData, setFormData] = useState({
    supplier_id: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    items: [{ inventory_item_id: '', quantity_ordered: '', unit_cost: '', item_display: '' }],
    notes: '',
  });
  const [receiveData, setReceiveData] = useState<{ [key: number]: number }>({});
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState<number | null>(null);

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        console.log('📦 Fetching POs, suppliers, and inventory...');
        // Build PO query params
        const poParams = new URLSearchParams();
        const trimmedSearch = debouncedSearchTerm.trim();
        if (trimmedSearch.length >= 3) {
          poParams.append('search', trimmedSearch);
        }
        if (statusFilter !== 'all') {
          poParams.append('status', statusFilter);
        }

        const [posRes, suppliersRes, inventoryRes] = await Promise.all([
          apiClient.get(`/api/purchase-orders?${poParams.toString()}`),
          apiClient.get('/api/suppliers'),
          apiClient.get('/api/inventory'),
        ]);

        if (posRes.ok) {
          const data = await posRes.json();
          setPurchaseOrders(data);
          console.log('✅ POs loaded:', data.length);
        }

        if (suppliersRes.ok) {
          const data = await suppliersRes.json();
          setSuppliers(data);
          console.log('✅ Suppliers loaded:', data.length);
        }

        if (inventoryRes.ok) {
          const data = await inventoryRes.json();
          setInventoryItems(data);
          console.log('✅ Inventory items loaded:', data.length);
        }
      } catch (err) {
        const errorMessage = (err as Error).message || 'Failed to fetch data';
        console.error('❌ Error fetching data:', errorMessage);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [debouncedSearchTerm, statusFilter]);

  const handleItemSelect = (index: number, item: InventoryItem) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = {
        ...newItems[index],
        inventory_item_id: String(item.id),
        item_display: formatInventoryOption(item),
      };
      return { ...prev, items: newItems };
    });
    setActiveSuggestionIndex(null);
  };

  const handleItemLookup = (index: number, value: string) => {
    const normalizedValue = value.trim().toLowerCase();
    const matchByFormatted = inventoryItems.find(inv => formatInventoryOption(inv).toLowerCase() === normalizedValue);
    const matchByName = inventoryItems.find(inv => (inv.name?.toLowerCase() || '') === normalizedValue);
    const matchById = inventoryItems.find(inv => String(inv.id) === normalizedValue);
    const matchedItem = matchByFormatted || matchByName || matchById || null;
    if (matchedItem) {
      handleItemSelect(index, matchedItem);
    } else {
      setActiveSuggestionIndex(index);
      setFormData(prev => {
        const newItems = [...prev.items];
        newItems[index] = {
          ...newItems[index],
          item_display: value,
          inventory_item_id: '',
        };
        return { ...prev, items: newItems };
      });
    }
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { inventory_item_id: '', quantity_ordered: '', unit_cost: '', item_display: '' }],
    });
  };

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!formData.supplier_id) {
        throw new Error('Supplier is required');
      }

      if (formData.items.length === 0 || !formData.items.every(item => item.inventory_item_id && item.quantity_ordered && item.unit_cost)) {
        throw new Error('All items must have inventory item, quantity, and unit cost');
      }

      const payload = {
        supplier_id: parseInt(formData.supplier_id),
        order_date: formData.order_date,
        expected_delivery_date: formData.expected_delivery_date || null,
        items: formData.items.map(item => ({
          inventory_item_id: parseInt(item.inventory_item_id),
          quantity_ordered: parseInt(item.quantity_ordered),
          unit_cost: parseFloat(item.unit_cost),
        })),
        notes: formData.notes,
      };

      console.log('📝 Creating purchase order...', payload);
      const response = await apiClient.post('/api/purchase-orders', payload);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to create purchase order');
      }

      console.log('✅ Purchase order created successfully');
      const pos = await apiClient.get('/api/purchase-orders');
      if (pos.ok) {
        setPurchaseOrders(await pos.json());
      }
      setShowForm(false);
      setFormData({
        supplier_id: '',
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: '',
        items: [{ inventory_item_id: '', quantity_ordered: '', unit_cost: '', item_display: '' }],
        notes: '',
      });
    } catch (err) {
      const errorMessage = (err as Error).message || 'Unknown error occurred';
      console.error('❌ Error creating PO:', errorMessage);
      setError(errorMessage);
    }
  };

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!selectedPO) throw new Error('No PO selected');

      const items = selectedPO.items?.map(item => ({
        id: item.id,
        quantity_received: receiveData[item.id] || item.quantity_received,
      })) || [];

      console.log('📦 Receiving purchase order...', items);
      const response = await apiClient.post(`/api/purchase-orders/${selectedPO.id}/receive`, {
        items,
        received_date: new Date().toISOString().split('T')[0],
      });

      if (!response.ok) {
        throw new Error('Failed to receive purchase order');
      }

      console.log('✅ Purchase order received successfully');
      const pos = await apiClient.get('/api/purchase-orders');
      if (pos.ok) {
        setPurchaseOrders(await pos.json());
      }
      setShowReceiveForm(false);
      setSelectedPO(null);
      setReceiveData({});
    } catch (err) {
      const errorMessage = (err as Error).message || 'Unknown error occurred';
      console.error('❌ Error receiving PO:', errorMessage);
      setError(errorMessage);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this purchase order?')) return;
    try {
      console.log('❌ Canceling PO:', id);
      const response = await apiClient.patch(`/api/purchase-orders/${id}/cancel`);

      if (!response.ok) {
        throw new Error('Failed to cancel purchase order');
      }

      console.log('✅ Purchase order cancelled successfully');
      const pos = await apiClient.get('/api/purchase-orders');
      if (pos.ok) {
        setPurchaseOrders(await pos.json());
      }
    } catch (err) {
      const errorMessage = (err as Error).message || 'Unknown error occurred';
      console.error('❌ Error canceling PO:', errorMessage);
      setError(errorMessage);
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'received':
        return 'bg-green-100 text-green-800';
      case 'partially_received':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredPOs = statusFilter === 'all' 
    ? purchaseOrders 
    : purchaseOrders.filter(po => po.status === statusFilter);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Purchase Orders</h2>
          <p className="text-gray-600 mt-1">Manage purchase orders and stock receiving</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({
              supplier_id: '',
              order_date: new Date().toISOString().split('T')[0],
              expected_delivery_date: '',
              items: [{ inventory_item_id: '', quantity_ordered: '', unit_cost: '', item_display: '' }],
              notes: '',
            });
            setShowForm(true);
          }}
          className="w-full sm:w-auto flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Purchase Order
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <div className="relative">
            <input
              type="text"
              placeholder="Search by PO#, Supplier, or Item..."
              value={searchTerm}
              onChange={(e) => {
                e.preventDefault(); // Prevent any default browser behavior
                setSearchTerm(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.preventDefault(); // Prevent form submission on Enter
              }}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoComplete="off"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          </div>
        </div>
        <div className="sm:w-48">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="ordered">Ordered</option>
            <option value="partially_received">Partially Received</option>
            <option value="received">Received</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 font-medium">Error</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4 text-red-600" />
          </button>
        </div>
      )}

      {/* Status Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'pending', 'received', 'partially_received', 'cancelled'].map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              statusFilter === status
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6 border-b bg-white">
              <h3 className="text-base sm:text-lg font-bold">Create New Purchase Order</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-700 self-end sm:self-auto">
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Supplier *
                  </label>
                  <select
                    value={formData.supplier_id}
                    onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select supplier</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Order Date *
                  </label>
                  <input
                    type="date"
                    value={formData.order_date}
                    onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    value={formData.expected_delivery_date}
                    onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Order notes"
                    rows={2}
                  />
                </div>
              </div>

              {/* Items Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-gray-900">Order Items *</h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {formData.items.map((item, index) => {
                    const selectedInventory = inventoryItems.find(inv => String(inv.id) === item.inventory_item_id);
                    const query = item.item_display.trim().toLowerCase();
                    const selectedDisplay = selectedInventory ? formatInventoryOption(selectedInventory).toLowerCase() : '';
                    const suggestions = query.length === 0
                      ? []
                      : inventoryItems
                          .filter(inv => {
                            const option = formatInventoryOption(inv).toLowerCase();
                            const itemName = inv.name?.toLowerCase() || '';
                            return option.includes(query) || itemName.includes(query);
                          })
                          .slice(0, 8);
                    const showSuggestions = activeSuggestionIndex === index && suggestions.length > 0 && query !== selectedDisplay;
                    return (
                      <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-end">
                        <div className="flex-1 min-w-0">
                          <div className="relative">
                            {showSuggestions && (
                              <div className="mb-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                                {suggestions.map(inv => (
                                  <button
                                    type="button"
                                    key={inv.id}
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => handleItemSelect(index, inv)}
                                    className="w-full text-left px-3 py-2 hover:bg-gray-100"
                                  >
                                    <p className="text-sm font-medium text-gray-900">{inv.name}</p>
                                    <p className="text-xs text-gray-500">ID: {inv.id} • Unit: {inv.unit} • Stock: {inv.current_stock}</p>
                                  </button>
                                ))}
                              </div>
                            )}
                            <input
                              value={item.item_display}
                              onFocus={() => setActiveSuggestionIndex(index)}
                              onChange={(e) => handleItemLookup(index, e.target.value)}
                              onBlur={() => {
                                window.setTimeout(() => {
                                  setActiveSuggestionIndex(prev => (prev === index ? null : prev));
                                }, 150);
                              }}
                              placeholder="Search inventory item"
                              autoComplete="off"
                              className="w-full px-2 sm:px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                              required
                            />
                          </div>
                          {selectedInventory && (
                            <p className="mt-1 text-xs text-gray-500">
                              Unit: {selectedInventory.unit} • Stock: {selectedInventory.current_stock}
                            </p>
                          )}
                        </div>
                        <div className="w-full sm:w-20 md:w-24">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity_ordered}
                            onChange={(e) => {
                              const newItems = [...formData.items];
                              newItems[index].quantity_ordered = e.target.value;
                              setFormData({ ...formData, items: newItems });
                            }}
                            className="w-full px-2 sm:px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="Qty"
                            required
                          />
                        </div>
                        <div className="w-full sm:w-24 md:w-32">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_cost}
                            onChange={(e) => {
                              const newItems = [...formData.items];
                              newItems[index].unit_cost = e.target.value;
                              setFormData({ ...formData, items: newItems });
                            }}
                            className="w-full px-2 sm:px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            placeholder="Unit Cost"
                            required
                          />
                        </div>
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="self-end sm:self-auto p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 justify-end border-t pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Form Modal */}
      {showReceiveForm && selectedPO && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between p-4 sm:p-6 border-b bg-white">
              <h3 className="text-base sm:text-lg font-bold">Receive PO {selectedPO.po_number}</h3>
              <button onClick={() => { setShowReceiveForm(false); setSelectedPO(null); }} className="text-gray-500 hover:text-gray-700 self-end sm:self-auto">
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>

            <form onSubmit={handleReceive} className="p-4 sm:p-6 space-y-4">
              <div className="space-y-3">
                {selectedPO.items?.map((item) => (
                  <div key={item.id} className="flex flex-col gap-3 sm:flex-row sm:items-center p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{item.item_name}</p>
                      <p className="text-sm text-gray-600">Ordered: {item.quantity_ordered}, Already Received: {item.quantity_received}</p>
                    </div>
                    <input
                      type="number"
                      min={item.quantity_received}
                      max={item.quantity_ordered}
                      defaultValue={item.quantity_received}
                      onChange={(e) => setReceiveData({ ...receiveData, [item.id]: parseInt(e.target.value) })}
                      className="w-full sm:w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-3 justify-end border-t pt-4">
                <button
                  type="button"
                  onClick={() => { setShowReceiveForm(false); setSelectedPO(null); }}
                  className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Receive Items
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POs Table/Cards */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredPOs.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">No purchase orders found.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">PO Number</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Supplier</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Order Date</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Total</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                    <th className="px-6 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredPOs.map((po) => (
                    <tr key={po.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{po.po_number}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{po.supplier_name || 'Unknown'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{new Date(po.order_date).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">KES {po.total_amount.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(po.status)}`}>
                          {po.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <div className="flex items-center justify-end gap-2">
                          {po.status === 'pending' || po.status === 'partially_received' ? (
                            <>
                              <button
                                onClick={() => {
                                  setSelectedPO(po);
                                  // Load full PO details
                                  apiClient.get(`/api/purchase-orders/${po.id}`).then(res => {
                                    if (res.ok) {
                                      res.json().then(data => {
                                        setSelectedPO(data);
                                        setShowReceiveForm(true);
                                      });
                                    }
                                  });
                                }}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Receive"
                              >
                                <Truck className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleCancel(po.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Cancel"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <span className="text-gray-500 text-xs">No actions available</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden divide-y divide-gray-200">
              {filteredPOs.map((po) => (
                <div key={po.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900 truncate">{po.po_number}</h3>
                      <p className="text-sm text-gray-600 truncate">{po.supplier_name || 'Unknown'}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(po.status)}`}>
                      {po.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex flex-col gap-1">
                      <span className="text-gray-600">Order Date</span>
                      <span className="font-medium">{new Date(po.order_date).toLocaleDateString()}</span>
                    </div>
                    <div className="flex flex-col gap-1 text-right">
                      <span className="text-gray-600">Total</span>
                      <span className="font-semibold text-gray-900">KES {po.total_amount.toFixed(2)}</span>
                    </div>
                  </div>

                  {(po.status === 'pending' || po.status === 'partially_received') && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => {
                          setSelectedPO(po);
                          // Load full PO details
                          apiClient.get(`/api/purchase-orders/${po.id}`).then(res => {
                            if (res.ok) {
                              res.json().then(data => {
                                setSelectedPO(data);
                                setShowReceiveForm(true);
                              });
                            }
                          });
                        }}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors text-sm font-medium"
                      >
                        <Truck className="w-4 h-4" />
                        Receive
                      </button>
                      <button
                        onClick={() => handleCancel(po.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}