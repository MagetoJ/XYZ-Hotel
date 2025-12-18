import { useState, useEffect } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { usePOS, Product } from '../contexts/POSContext';
import { apiClient, IS_DEVELOPMENT } from '../config/api';

interface Props {
  mode?: 'kitchen' | 'bar';
  searchQuery?: string;
}

interface POSItem extends Product {
  source: 'kitchen' | 'bar';
  category_name?: string;
}

const formatCurrency = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (typeof numAmount !== 'number' || isNaN(numAmount)) {
    return 'KES 0';
  }
  return `KES ${numAmount.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export default function ProductGrid({ mode = 'kitchen', searchQuery = '' }: Props) {
  const [items, setItems] = useState<POSItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addItemToOrder } = usePOS();

  useEffect(() => {
    fetchItems();
  }, [mode]);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      if (IS_DEVELOPMENT) {
        console.log(`📱 Fetching ${mode} items...`);
      }

      const endpoint = mode === 'kitchen'
        ? '/api/products'
        : '/api/quick-pos/bar-items-as-products';

      const res = await apiClient.get(endpoint);

      if (!res.ok) {
        throw new Error(`Failed to load ${mode} items`);
      }

      const data = await res.json();

      let normalizedData: POSItem[] = [];

      if (mode === 'kitchen') {
        if (Array.isArray(data)) {
          normalizedData = data.map((item: any) => ({
            ...item,
            source: 'kitchen',
            price: item.price,
            is_available: item.is_available !== undefined ? item.is_available : true,
          }));
        } else {
          Object.values(data).forEach((group: any) => {
            if (Array.isArray(group)) {
              group.forEach((item: any) => {
                normalizedData.push({
                  ...item,
                  source: 'kitchen',
                  price: item.price,
                  is_available: item.is_available !== undefined ? item.is_available : true,
                });
              });
            }
          });
        }
      } else {
        normalizedData = data.map((item: any) => ({
          ...item,
          source: 'bar',
          price: item.price || item.cost_per_unit || 0,
          is_available: item.current_stock > 0,
        }));
      }

      if (IS_DEVELOPMENT) {
        console.log(`✅ ${mode} items loaded:`, normalizedData.length);
      }

      setItems(normalizedData);
    } catch (err) {
      if (IS_DEVELOPMENT) {
        console.error(`❌ Failed to load ${mode} items:`, err);
      }
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch = searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.category_name && item.category_name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return item.is_available && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 py-12">
        <Loader2 className="w-10 h-10 animate-spin text-yellow-500" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500 p-8">Error: {error}</div>;
  }

  if (filteredItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <p className="text-xl font-medium">No items found</p>
        <p className="text-sm">Try searching for something else in {mode} menu.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 pb-20">
      {filteredItems.map((item) => (
        <div
          key={`${item.source}-${item.id}`}
          onClick={() => addItemToOrder(item)}
          className={`
            group relative bg-white rounded-xl shadow-sm border-2 cursor-pointer 
            transition-all duration-200 hover:shadow-lg hover:-translate-y-1 active:scale-95 overflow-hidden
            ${mode === 'bar'
              ? 'border-purple-100 hover:border-purple-400'
              : 'border-orange-100 hover:border-orange-400'
            }
          `}
        >
          <div className={`h-28 flex items-center justify-center relative ${
            mode === 'bar' ? 'bg-purple-50' : 'bg-orange-50'
          }`}>
            {item.image_url ? (
              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
            ) : (
              <span className={`text-3xl font-bold ${
                mode === 'bar' ? 'text-purple-200' : 'text-orange-200'
              }`}>
                {item.name.charAt(0)}
              </span>
            )}
            
            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <div className="bg-white rounded-full p-2 shadow-sm">
                <Plus className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="p-3">
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-bold text-gray-800 leading-tight line-clamp-2 text-sm">{item.name}</h3>
              {item.source === 'bar' && item.current_stock !== undefined && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                  {item.current_stock}
                </span>
              )}
            </div>
            <p className={`font-bold ${mode === 'bar' ? 'text-purple-700' : 'text-orange-600'}`}>
              {formatCurrency(item.price)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
