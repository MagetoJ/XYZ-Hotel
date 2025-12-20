import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { usePOS } from '../contexts/POSContext';

interface CustomItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderType: 'dine_in' | 'takeaway' | 'delivery' | 'room_service';
}

export default function CustomItemModal({ isOpen, onClose, orderType }: CustomItemModalProps) {
  const { addCustomItemToOrder } = usePOS();
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [error, setError] = useState('');

  const handleAddCustomItem = () => {
    setError('');

    if (!itemName.trim()) {
      setError('Please enter an item name');
      return;
    }

    const price = parseFloat(itemPrice);
    if (isNaN(price) || price < 0) {
      setError('Please enter a valid price');
      return;
    }

    const qty = parseInt(quantity);
    if (isNaN(qty) || qty < 1) {
      setError('Please enter a valid quantity');
      return;
    }

    addCustomItemToOrder(itemName.trim(), price, qty, orderType);

    setItemName('');
    setItemPrice('');
    setQuantity('1');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-bold text-gray-800">Add Custom Item</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item Name *
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => {
                setItemName(e.target.value);
                setError('');
              }}
              placeholder="e.g., Special Dish, Custom Pizza"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Price (KES) *
            </label>
            <input
              type="number"
              value={itemPrice}
              onChange={(e) => {
                setItemPrice(e.target.value);
                setError('');
              }}
              placeholder="0.00"
              step="0.01"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => {
                setQuantity(e.target.value);
                setError('');
              }}
              placeholder="1"
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <p className="text-blue-700 text-sm">
              <strong>Note:</strong> This item will be marked as a custom dish for the kitchen and receptionist to see.
            </p>
          </div>
        </div>

        <div className="p-4 border-t flex gap-2">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-200 hover:bg-gray-300 rounded-md font-semibold transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAddCustomItem}
            className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-md font-semibold flex justify-center items-center gap-2 transition-colors"
          >
            <Plus size={20} />
            Add to Order
          </button>
        </div>
      </div>
    </div>
  );
}
