import { useState, useEffect } from 'react';
import { usePOS, Category } from '../contexts/POSContext';
import { apiClient, IS_DEVELOPMENT } from '../config/api';
import { Loader2, Wine, UtensilsCrossed } from 'lucide-react';
import ProductGrid from './ProductGrid';
import SearchComponent from './SearchComponent';

export default function MenuGrid() {
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'kitchen' | 'bar'>('kitchen');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true);
      setError(null);
      try {
        if (IS_DEVELOPMENT) {
          console.log('📱 Fetching categories...');
        }

        const res = await apiClient.get('/api/categories');

        if (!res.ok) {
          throw new Error('Failed to fetch categories');
        }

        const categoriesData = await res.json();

        if (IS_DEVELOPMENT) {
          console.log('✅ Categories loaded:', categoriesData.length);
        }

        setCategories(categoriesData);
      } catch (err) {
        if (IS_DEVELOPMENT) {
          console.error('❌ Failed to fetch categories:', err);
        }
        setError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full py-12">
        <Loader2 className="w-10 h-10 animate-spin text-yellow-500" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-red-500 p-8">Error: {error}</div>;
  }

  return (
    <div className="flex-1 p-3 sm:p-4 lg:p-6 flex flex-col">
      {/* Mode Switcher */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => { setMode('kitchen'); setSelectedCategory(null); setSearchTerm(''); }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            mode === 'kitchen'
              ? 'bg-orange-400 text-orange-900'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          <UtensilsCrossed className="w-4 h-4" />
          Kitchen
        </button>
        <button
          onClick={() => { setMode('bar'); setSelectedCategory(null); setSearchTerm(''); }}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            mode === 'bar'
              ? 'bg-purple-400 text-purple-900'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          <Wine className="w-4 h-4" />
          Bar
        </button>
      </div>

      {/* Search Bar */}
      <div className="mb-4">
        <SearchComponent 
          onSearch={(query) => setSearchTerm(query)} 
          placeholder={`Search ${mode === 'kitchen' ? 'food menu' : 'bar inventory'}...`}
          initialValue={searchTerm}
        />
      </div>

      {/* Category Tabs - Only show for kitchen mode when not searching */}
      {mode === 'kitchen' && searchTerm === '' && (
        <div className="flex gap-1 sm:gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base font-medium whitespace-nowrap transition-colors ${
              selectedCategory === null
                ? 'bg-yellow-400 text-yellow-900'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            All Items
          </button>
          {categories
            .filter((cat) => cat.is_active)
            .map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-sm sm:text-base font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-yellow-400 text-yellow-900'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                {category.name}
              </button>
            ))}
        </div>
      )}

      {/* Products Grid */}
      <div className="flex-1 overflow-y-auto">
        <ProductGrid mode={mode} searchQuery={searchTerm} />
      </div>
    </div>
  );
}