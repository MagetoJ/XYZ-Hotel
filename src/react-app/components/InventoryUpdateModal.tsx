import { useState } from 'react';
import { X, Plus, Minus, Save, Package } from 'lucide-react';
interface InventoryItem {
  id: number;
  name: string;
  current_stock: number;
  unit: string;
  minimum_stock: number;
  category: string;
}

interface InventoryUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: InventoryItem | null;
  onUpdate: (itemId: number, newStock: number, reason: string) => Promise<void>;
}

export default function InventoryUpdateModal({
  isOpen,
  onClose,
  item,
  onUpdate,
}: InventoryUpdateModalProps) {
  const [stockChange, setStockChange] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState(false);

  if (!isOpen || !item) return null;

  const newStock = item.current_stock + stockChange;
  const isLowStock = newStock <= item.minimum_stock;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      alert('Please provide a reason for the stock update');
      return;
    }

    if (newStock < 0) {
      alert('Stock cannot be negative');
      return;
    }

    setLoading(true);
    try {
      await onUpdate(item.id, newStock, reason);
      setStockChange(0);
      setReason('');
      onClose();
    } catch (error) {
      console.error('Error updating inventory:', error);
      alert('Failed to update inventory. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const quickAdjust = (amount: number) => {
    setStockChange((prev) => prev + amount);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Update Stock</h2>
              <p className="text-sm text-gray-600">{item.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          {/* Current Stock Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600 mb-1">Current Stock</p>
                <p className="text-2xl font-bold text-gray-900">
                  {item.current_stock}
                  <span className="text-sm text-gray-500 ml-1">{item.unit}</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Minimum Stock</p>
                <p className="text-2xl font-bold text-orange-600">
                  {item.minimum_stock}
                  <span className="text-sm text-gray-500 ml-1">{item.unit}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Stock Adjustment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Stock Adjustment
            </label>
            
            {/* Quick Adjust Buttons */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              <button
                type="button"
                onClick={() => quickAdjust(-10)}
                className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium text-sm transition-colors"
              >
                -10
              </button>
              <button
                type="button"
                onClick={() => quickAdjust(-1)}
                className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium text-sm transition-colors"
              >
                -1
              </button>
              <button
                type="button"
                onClick={() => quickAdjust(1)}
                className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-medium text-sm transition-colors"
              >
                +1
              </button>
              <button
                type="button"
                onClick={() => quickAdjust(10)}
                className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg font-medium text-sm transition-colors"
              >
                +10
              </button>
            </div>

            {/* Manual Input */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStockChange((prev) => prev - 1)}
                className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Minus className="w-5 h-5 text-gray-700" />
              </button>
              
              <input
                type="number"
                value={stockChange}
                onChange={(e) => setStockChange(Number(e.target.value))}
                className="flex-1 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg py-3 focus:border-blue-500 focus:outline-none"
              />
              
              <button
                type="button"
                onClick={() => setStockChange((prev) => prev + 1)}
                className="p-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          </div>

          {/* New Stock Preview */}
          <div className={`p-4 rounded-lg ${isLowStock ? 'bg-red-50 border-2 border-red-200' : 'bg-blue-50 border-2 border-blue-200'}`}>
            <p className="text-sm text-gray-600 mb-1">New Stock Level</p>
            <div className="flex items-center justify-between">
              <p className={`text-3xl font-bold ${isLowStock ? 'text-red-600' : 'text-blue-600'}`}>
                {newStock}
                <span className="text-sm text-gray-500 ml-1">{item.unit}</span>
              </p>
              {isLowStock && (
                <span className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded-full">
                  LOW STOCK
                </span>
              )}
            </div>
          </div>

          {/* Reason Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Update <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Used for lunch service, Received new delivery, Wastage..."
              rows={3}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || stockChange === 0}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Update Stock
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
