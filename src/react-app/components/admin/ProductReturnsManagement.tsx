import { useState, useEffect } from 'react';
import { apiClient } from '../../config/api';
import { Plus, Trash2, Edit2, Loader2, AlertCircle } from 'lucide-react';

interface InventoryItem {
  id: number;
  name: string;
  current_stock: number;
  unit: string;
}

const formatInventoryOption = (item: InventoryItem) => `${item.id} - ${item.name} (${item.unit})`;

interface ProductReturn {
  id: number;
  order_id?: number;
  product_id?: number;
  inventory_id?: number;
  product_name?: string;
  inventory_name?: string;
  inventory_unit?: string;
  quantity_returned: number;
  reason: string;
  refund_amount: number;
  notes?: string;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
}

export default function ProductReturnsManagement() {
  const [returns, setReturns] = useState<ProductReturn[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    order_id: '',
    inventory_id: '',
    inventory_display: '',
    quantity_returned: '',
    reason: 'quality_issue',
    refund_amount: '',
    notes: '',
  });
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [returnsRes, inventoryRes] = await Promise.all([
        apiClient.get('/api/product-returns'),
        apiClient.get('/api/product-returns/data/inventory'),
      ]);

      if (!returnsRes.ok || !inventoryRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const returnsData = await returnsRes.json();
      const inventoryData = await inventoryRes.json();

      setReturns(returnsData);
      setInventoryItems(inventoryData);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const inventoryId = parseInt(formData.inventory_id);
      if (Number.isNaN(inventoryId)) {
        throw new Error('Please select a valid inventory item');
      }

      const payload: any = {
        inventory_id: inventoryId,
        quantity_returned: parseInt(formData.quantity_returned),
        reason: formData.reason,
        notes: formData.notes || null,
      };

      if (formData.order_id) {
        payload.order_id = parseInt(formData.order_id);
      }

      if (formData.refund_amount) {
        payload.refund_amount = parseFloat(formData.refund_amount);
      }

      const response = editingId
        ? await apiClient.put(`/api/product-returns/${editingId}`, payload)
        : await apiClient.post('/api/product-returns', payload);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save return');
      }

      await fetchData();
      setShowForm(false);
      setEditingId(null);
      resetForm();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const resetForm = () => {
    setFormData({
      order_id: '',
      inventory_id: '',
      inventory_display: '',
      quantity_returned: '',
      reason: 'quality_issue',
      refund_amount: '',
      notes: '',
    });
  };

  const handleEdit = (ret: ProductReturn) => {
    setEditingId(ret.id);
    const matchedItem = inventoryItems.find((item) => item.id === ret.inventory_id);
    setFormData({
      order_id: ret.order_id?.toString() || '',
      inventory_id: ret.inventory_id?.toString() || '',
      inventory_display: matchedItem ? formatInventoryOption(matchedItem) : '',
      quantity_returned: ret.quantity_returned.toString(),
      reason: ret.reason,
      refund_amount: ret.refund_amount.toString(),
      notes: ret.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this return? This will reverse inventory adjustments.'))
      return;
    try {
      const response = await apiClient.delete(`/api/product-returns/${id}`);
      if (!response.ok) {
        throw new Error('Failed to delete return');
      }
      await fetchData();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleInventorySelect = (item: InventoryItem) => {
    setFormData((prev) => {
      const quantity = parseInt(prev.quantity_returned || '0');
      const refund = Number.isNaN(quantity) || quantity <= 0 ? '' : (item.current_stock * quantity).toString();
      return {
        ...prev,
        inventory_id: item.id.toString(),
        inventory_display: formatInventoryOption(item),
        refund_amount: refund,
      };
    });
    setIsSuggestionOpen(false);
  };

  const handleInventoryLookup = (value: string) => {
    const normalizedValue = value.trim().toLowerCase();
    const matchByFormatted = inventoryItems.find((inv) => formatInventoryOption(inv).toLowerCase() === normalizedValue);
    const matchByName = inventoryItems.find((inv) => (inv.name?.toLowerCase() || '') === normalizedValue);
    const matchById = inventoryItems.find((inv) => String(inv.id) === normalizedValue);
    const matchedItem = matchByFormatted || matchByName || matchById || null;
    if (matchedItem) {
      handleInventorySelect(matchedItem);
    } else {
      setIsSuggestionOpen(true);
      setFormData((prev) => ({
        ...prev,
        inventory_display: value,
        inventory_id: '',
        refund_amount: '',
      }));
    }
  };

  const totalReturnValue = returns.reduce((sum, ret) => sum + ret.refund_amount, 0);

  const reasonCounts = returns.reduce((acc, ret) => {
    acc[ret.reason] = (acc[ret.reason] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const selectedInventory = inventoryItems.find((item) => item.id === parseInt(formData.inventory_id));
  const inventoryQuery = formData.inventory_display.trim().toLowerCase();
  const selectedDisplay = selectedInventory ? formatInventoryOption(selectedInventory).toLowerCase() : '';
  const inventorySuggestions = inventoryQuery.length === 0
    ? []
    : inventoryItems
        .filter((item) => {
          const option = formatInventoryOption(item).toLowerCase();
          const itemName = item.name?.toLowerCase() || '';
          return option.includes(inventoryQuery) || itemName.includes(inventoryQuery);
        })
        .slice(0, 8);
  const showInventorySuggestions = isSuggestionOpen && inventorySuggestions.length > 0 && inventoryQuery !== selectedDisplay;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Product Returns Management</h2>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            resetForm();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Return
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <p className="text-gray-600 text-sm font-medium">Total Returns</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{returns.length}</p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <p className="text-gray-600 text-sm font-medium">Total Refund Value</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            KES {totalReturnValue.toLocaleString('en-KE', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <p className="text-gray-600 text-sm font-medium">Total Quantity</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {returns.reduce((sum, ret) => sum + ret.quantity_returned, 0)} units
          </p>
        </div>
      </div>

      {/* Reason Breakdown */}
      {Object.keys(reasonCounts).length > 0 && (
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">By Reason</h3>
          <div className="space-y-3">
            {Object.entries(reasonCounts).map(([reason, count]) => (
              <div key={reason} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700 capitalize">{reason.replace(/_/g, ' ')}</span>
                <span className="text-sm font-bold text-gray-900">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Return' : 'Add New Return'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Inventory Item *</label>
                <div className="relative">
                  {showInventorySuggestions && (
                    <div className="mb-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                      {inventorySuggestions.map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleInventorySelect(item)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100"
                        >
                          <p className="text-sm font-medium text-gray-900">{item.name}</p>
                          <p className="text-xs text-gray-500">ID: {item.id} • Stock: {item.current_stock} • Unit: {item.unit}</p>
                        </button>
                      ))}
                    </div>
                  )}
                  <input
                    value={formData.inventory_display}
                    onFocus={() => setIsSuggestionOpen(true)}
                    onChange={(e) => {
                      e.preventDefault(); // Prevent any default browser behavior
                      handleInventoryLookup(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.preventDefault(); // Prevent form submission on Enter
                    }}
                    onBlur={() => {
                      window.setTimeout(() => {
                        setIsSuggestionOpen(false);
                      }, 150);
                    }}
                    placeholder="Search inventory item"
                    autoComplete="off"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                    required
                  />
                </div>
                {selectedInventory && (
                  <p className="mt-1 text-xs text-gray-500">
                    Current stock: {selectedInventory.current_stock} {selectedInventory.unit}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order ID (Optional)</label>
                <input
                  type="number"
                  value={formData.order_id}
                  onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Returned *</label>
                <input
                  type="number"
                  min="1"
                  value={formData.quantity_returned}
                  onChange={(e) => {
                    const quantityValue = e.target.value;
                    const item = inventoryItems.find((i) => i.id === parseInt(formData.inventory_id));
                    setFormData((prev) => ({
                      ...prev,
                      quantity_returned: quantityValue,
                      refund_amount: item ? (item.current_stock * parseInt(quantityValue || '0')).toString() : '',
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                <select
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="damaged">Damaged</option>
                  <option value="expired">Expired</option>
                  <option value="wrong_item">Wrong Item</option>
                  <option value="customer_request">Customer Request</option>
                  <option value="quality_issue">Quality Issue</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Refund Amount (KES)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.refund_amount}
                  onChange={(e) => setFormData({ ...formData, refund_amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
              >
                {editingId ? 'Update' : 'Create'} Return
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  resetForm();
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Returns Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Inventory Item</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Qty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Unit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Refund</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {returns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No returns recorded yet
                  </td>
                </tr>
              ) : (
                returns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{ret.inventory_name || ret.product_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">{ret.quantity_returned}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{ret.inventory_unit || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs font-medium capitalize">
                        {ret.reason.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      KES {ret.refund_amount.toLocaleString('en-KE', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(ret.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(ret)}
                          className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(ret.id)}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}