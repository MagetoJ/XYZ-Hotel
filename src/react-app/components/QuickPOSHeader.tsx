import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Wine, ShoppingBag, History, Search, X } from 'lucide-react';
import { apiClient } from '../config/api';
import { usePOS } from '../contexts/POSContext';

interface SearchResult {
  id: number;
  type: string;
  title: string;
  subtitle: string;
  description: string;
  metadata?: any;
}

interface QuickPOSHeaderProps {
  onLogout: () => void;
  toggleBarMode: () => void;
  isBarMode: boolean;
  setShowRecentOrders: (show: boolean) => void;
}

const QuickPOSHeader: React.FC<QuickPOSHeaderProps> = ({
  onLogout,
  toggleBarMode,
  isBarMode,
  setShowRecentOrders
}) => {
  const { user } = useAuth();
  const { addItemToOrder } = usePOS();
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Debounce search term
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm]);

  // Perform search when debounced term changes
  useEffect(() => {
    const performSearch = async () => {
      const trimmedSearch = debouncedSearchTerm.trim();
      if (trimmedSearch.length >= 2) {
        setIsSearching(true);
        setShowSearchResults(true);
        try {
          const response = await apiClient.get(`/api/quick-pos/search?q=${encodeURIComponent(trimmedSearch)}&limit=20`);
          if (response.ok) {
            const data = await response.json();
            setSearchResults(data.results || []);
          } else {
            setSearchResults([]);
          }
        } catch (error) {
          console.error('Search error:', error);
          setSearchResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    };

    performSearch();
  }, [debouncedSearchTerm]);

  const handleSearchResultClick = (result: SearchResult) => {
    if (result.type === 'menu') {
      const product = {
        id: result.id,
        category_id: result.metadata?.category ? 1 : 0,
        name: result.title,
        description: result.metadata?.description || '',
        price: result.metadata?.price || 0,
        is_available: result.metadata?.is_active !== false,
        preparation_time: 0,
        image_url: undefined
      };
      addItemToOrder(product, 1, 'dine_in');
    } else if (result.type === 'inventory') {
      const inventoryItem = {
        id: result.id,
        category_id: 0,
        name: result.title,
        description: result.metadata?.supplier ? `From: ${result.metadata.supplier}` : '',
        price: result.metadata?.cost_per_unit || 0,
        is_available: true,
        preparation_time: 0,
        image_url: undefined
      };
      addItemToOrder(inventoryItem, 1, 'dine_in');
    }

    // Clear search
    setSearchTerm('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  const handleSearchInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    setSearchTerm(e.target.value);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  return (
    <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
      {/* Search Bar */}
      <div className="mb-3 relative">
        <div className="relative">
          <input
            type="text"
            placeholder="Search menu items or inventory to add to order..."
            value={searchTerm}
            onChange={handleSearchInputChange}
            onKeyDown={handleSearchKeyDown}
            className="w-full px-4 py-2 pl-10 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            autoComplete="off"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showSearchResults && (
          <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto mt-1">
            {isSearching ? (
              <div className="px-4 py-3 text-center text-gray-500">
                Searching...
              </div>
            ) : searchResults.length > 0 ? (
              searchResults.map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSearchResultClick(result)}
                  className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-900">{result.title}</div>
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                      result.type === 'menu' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-amber-100 text-amber-700'
                    }`}>
                      {result.type === 'menu' ? 'Menu' : 'Inventory'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">{result.subtitle}</div>
                  <div className="text-xs text-gray-500 mt-1">{result.description}</div>
                </button>
              ))
            ) : debouncedSearchTerm.trim().length >= 2 ? (
              <div className="px-4 py-3 text-center text-gray-500">
                No items found
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Header Content */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-100 p-2 rounded-full">
            <ShoppingBag className="h-6 w-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Quick POS</h1>
            <p className="text-xs text-gray-500">
              {user ? `${user.name} (${user.role})` : 'Guest User'}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Recent Orders Button */}
        <button
          onClick={() => setShowRecentOrders(true)}
          className="p-2 text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
          title="Recent Orders"
        >
          <History className="h-6 w-6" />
        </button>

        {/* Bar Mode Toggle - Always Visible */}
        <button
          onClick={toggleBarMode}
          className={`p-2 rounded-full transition-colors ${
            isBarMode
              ? 'bg-purple-100 text-purple-700'
              : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50'
          }`}
          title={isBarMode ? "Switch to Kitchen Menu" : "Switch to Bar Menu"}
        >
          <Wine className="h-6 w-6" />
        </button>

        <div className="h-6 w-px bg-gray-300 mx-2 hidden sm:block"></div>

        <button
          onClick={onLogout}
          className="flex items-center text-gray-600 hover:text-red-600 transition-colors"
          title="Logout"
        >
          <LogOut className="h-5 w-5" />
          <span className="ml-2 hidden sm:inline text-sm font-medium">Logout</span>
        </button>
        </div>
      </div>
    </div>
  );
};

export default QuickPOSHeader;