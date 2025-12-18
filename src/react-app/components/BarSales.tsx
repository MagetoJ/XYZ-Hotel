import { useState, useEffect } from 'react';
import { usePOS, Product } from '../contexts/POSContext';
import { apiClient, IS_DEVELOPMENT } from '../config/api';
import { Plus, Loader2, AlertCircle, Wine } from 'lucide-react';

// Extended product interface to support bar items
interface BarProduct extends Product {
  inventory_type?: 'bar';
  current_stock?: number;
  unit?: string;
}

// Centralized currency formatter
const formatCurrency = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (typeof numAmount !== 'number' || isNaN(numAmount)) {
    return 'KES 0';
  }
  return `KES ${numAmount.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export default function BarSales() {
  const { addItemToOrder } = usePOS();
  const [barItems, setBarItems] = useState<BarProduct[]>([]);
  const [filteredItems, setFilteredItems] = useState<BarProduct[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBarItems();
  }, []);

  const fetchBarItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (IS_DEVELOPMENT) {
        console.log('📱 Fetching bar items...');
      }

      const response = await apiClient.get('/api/quick-pos/bar-items-as-products');

      if (!response.ok) {
        throw new Error('Failed to fetch bar items. Please try again.');
      }

      const data = await response.json();

      if (IS_DEVELOPMENT) {
        console.log('✅ Bar items loaded:', data.length);
      }

      setBarItems(data);
      setFilteredItems(data);
    } catch (err) {
      if (IS_DEVELOPMENT) {
        console.error('❌ Failed to fetch bar items:', err);
      }
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter items based on search term
  useEffect(() => {
    const filtered = barItems.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredItems(filtered);
  }, [searchTerm, barItems]);

  const handleAddItem = (item: BarProduct) => {
    // Convert bar item to Product format for adding to order
    const productToAdd: Product = {
      id: item.id,
      category_id: item.category_id,
      name: item.name,
      description: item.description,
      price: item.price,
      is_available: item.is_available,
      preparation_time: item.preparation_time,
      image_url: item.image_url
    };

    addItemToOrder(productToAdd, 1, 'dine_in');
  };

  // Show loading spinner while data is being fetched
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full py-12">
        <Loader2 className="w-10 h-10 animate-spin text-yellow-500" />
      </div>
    );
  }

  // Show an error message if fetching fails
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <div className="text-center text-red-500">
          <p className="font-semibold mb-2">Error loading bar items</p>
          <p className="text-sm">{error}</p>
          <button
            onClick={fetchBarItems}
            className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Show empty state if no items
  if (barItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-center text-gray-500">
          <p className="font-semibold mb-2">No bar items available</p>
          <p className="text-sm">No bar items available for sale at the moment.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-6">
      {/* Search Bar */}
      <div className="mb-4 sm:mb-6">
        <input
          type="text"
          placeholder="Search bar items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
        />
      </div>

      {/* Bar Items Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.id}
            className={`
              bg-white rounded-xl shadow-sm border-2 overflow-hidden transition-all group
              ${item.is_available
                ? 'border-green-200 hover:shadow-lg hover:border-yellow-400 cursor-pointer'
                : 'border-red-200 opacity-50 cursor-not-allowed'
              }
            `}
          >
            {/* Item Image/Icon Area */}
            <div className="aspect-square bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center overflow-hidden relative">
              {item.image_url ? (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Wine className="w-12 h-12 text-amber-600" />
              )}
              {item.current_stock !== undefined && (
                <div className="absolute top-2 right-2 bg-blue-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                  {item.current_stock} {item.unit}
                </div>
              )}
              {!item.is_available && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <span className="text-white font-bold text-center">Out of Stock</span>
                </div>
              )}
            </div>

            {/* Item Details */}
            <div className="p-3">
              <h3 className="font-semibold text-gray-900 mb-1 line-clamp-2 text-sm">{item.name}</h3>
              <p className="text-xs text-gray-500 mb-3 line-clamp-1">{item.unit}</p>
              <div className="flex items-center justify-between">
                <span className="font-bold text-yellow-600">{formatCurrency(item.price)}</span>
                <button
                  onClick={() => handleAddItem(item)}
                  disabled={!item.is_available}
                  className={`
                    p-2 rounded-lg transition-all
                    ${item.is_available
                      ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-500 active:scale-95'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }
                  `}
                  title={item.is_available ? 'Add to order' : 'Out of stock'}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* No search results */}
      {filteredItems.length === 0 && searchTerm && (
        <div className="text-center text-gray-500 py-12">
          <p className="font-semibold">No items found matching "{searchTerm}"</p>
        </div>
      )}
    </div>
  );
}