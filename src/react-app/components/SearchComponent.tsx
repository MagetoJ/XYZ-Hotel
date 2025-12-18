import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchComponentProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
  initialValue?: string;
  className?: string;
  onSelectResult?: (result: any, type: string) => void;
  onClose?: () => void;
  autoFocus?: boolean;
  onAddToOrder?: (product: any) => void;
}

const SearchComponent: React.FC<SearchComponentProps> = ({
  onSearch,
  placeholder = 'Search...',
  initialValue = '',
  className = ''
}) => {
  const [query, setQuery] = useState(initialValue);

  // Debounce: Wait 300ms after typing stops before searching
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (typeof onSearch === 'function') {
        onSearch(query);
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [query, onSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault(); // Stop browser from doing anything native
    setQuery(e.target.value);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-5 w-5 text-gray-400" />
      </div>
      <input
        type="text"
        className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
        placeholder={placeholder}
        value={query}
        onChange={handleChange}
        autoComplete="off"
        // Prevent Enter key from submitting any parent forms
        onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
      />
      {query && (
        <button
          type="button"
          onClick={() => { setQuery(''); onSearch(''); }}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-500"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

export default SearchComponent;