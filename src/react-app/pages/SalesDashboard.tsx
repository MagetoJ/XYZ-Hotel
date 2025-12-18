import React, { useState } from 'react';
import { UtensilsCrossed, Wine } from 'lucide-react';
import SearchComponent from '../components/SearchComponent';
import ProductGrid from '../components/ProductGrid';

export default function SalesDashboard() {
  const [mode, setMode] = useState<'kitchen' | 'bar'>('kitchen');
  const [searchTerm, setSearchTerm] = useState('');

  const handleModeChange = (newMode: 'kitchen' | 'bar') => {
    setMode(newMode);
    setSearchTerm('');
  };

  return (
    <div className="flex flex-col h-full w-full">
      
      {/* Header: Toggles & Search */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex flex-col gap-3 shadow-sm z-10">
        
        {/* Mode Toggles */}
        <div className="flex gap-3 sm:gap-4">
          <button
            onClick={() => handleModeChange('kitchen')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold text-sm sm:text-base transition-all ${
              mode === 'kitchen' 
                ? 'bg-orange-500 text-white shadow-lg shadow-orange-200 scale-[1.02]' 
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <UtensilsCrossed className="w-5 h-5" />
            <span className="hidden sm:inline">Kitchen & Food</span>
            <span className="sm:hidden">Kitchen</span>
          </button>
          
          <button
            onClick={() => handleModeChange('bar')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-bold text-sm sm:text-base transition-all ${
              mode === 'bar' 
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-200 scale-[1.02]' 
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            <Wine className="w-5 h-5" />
            <span className="hidden sm:inline">Bar & Drinks</span>
            <span className="sm:hidden">Bar</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <SearchComponent 
            onSearch={(query) => setSearchTerm(query)} 
            placeholder={`Search ${mode === 'kitchen' ? 'food' : 'bar'}...`}
            className="w-full"
            initialValue={searchTerm}
          />
        </div>
      </div>

      {/* Content: The Filterable Grid */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <ProductGrid 
          mode={mode} 
          searchQuery={searchTerm} 
        />
      </div>
    </div>
  );
}
