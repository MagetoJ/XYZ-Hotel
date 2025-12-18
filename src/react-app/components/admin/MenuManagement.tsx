import { useState, useEffect, useRef } from 'react';
import { UtensilsCrossed, Plus, Edit3, Trash2, Search, Upload, Download } from 'lucide-react';
import { apiClient } from '../../config/api';

// Define interfaces to match backend schema
interface Product {
  id: number;
  category_id: number;
  name: string;
  description: string;
  price: number;
  cost?: number;
  is_available: boolean;
  is_active: boolean;
  image_url?: string;
  preparation_time: number;
}

interface Category {
  id: number;
  name: string;
  description: string;
  is_active: boolean;
  display_order: number;
}

// Currency formatter function
const formatCurrency = (amount: number | string): string => {
  // Parse amount to number if it's a string
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (typeof numAmount !== 'number' || isNaN(numAmount)) {
    return 'KES 0';
  }
  return `KES ${numAmount.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export default function MenuManagement() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<'products' | 'categories'>('products');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | Category | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<number[]>([]);

  const [productForm, setProductForm] = useState({
    category_id: 1,
    name: '',
    description: '',
    price: 0,
    cost: 0,
    preparation_time: 0,
    image_url: ''
  });

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    display_order: 0
  });

  const getToken = () => localStorage.getItem('pos_token');

  // --- Data Fetching ---
  const fetchProducts = async () => {
    try {
      const response = await apiClient.get('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await apiClient.get('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  // Debounce search term
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm]);

  const getCategoryName = (categoryId: number) => {
    return categories.find(c => c.id === categoryId)?.name || 'Unknown';
  };

  const filteredProducts = (() => {
    let filtered = selectedCategory
      ? products.filter(p => p.category_id === selectedCategory)
      : products;

    // Apply search filter if search term is 3+ characters
    const trimmedSearch = debouncedSearchTerm.trim();
    if (trimmedSearch.length >= 3) {
      const searchLower = trimmedSearch.toLowerCase();
      filtered = filtered.filter(p => {
        // FIX: Safer property access to prevent "Cannot read properties of null (reading 'toLowerCase')"
        const productName = p.name?.toLowerCase() || '';
        const productDescription = p.description?.toLowerCase() || '';
        const categoryName = getCategoryName(p.category_id).toLowerCase();

        return (
          productName.includes(searchLower) ||
          productDescription.includes(searchLower) ||
          categoryName.includes(searchLower) ||
          String(p.id).includes(searchLower)
        );
      });
    }

    return filtered;
  })();

  // Search suggestions
  const searchSuggestions = (() => {
    if (!debouncedSearchTerm.trim()) return [];

    const searchLower = debouncedSearchTerm.toLowerCase().trim();
    return products
      .filter(p => {
        // FIX: Safer property access to prevent "Cannot read properties of null (reading 'toLowerCase')"
        const productName = p.name?.toLowerCase() || '';
        const productDescription = p.description?.toLowerCase() || '';
        const categoryName = getCategoryName(p.category_id).toLowerCase();

        return (
          productName.includes(searchLower) ||
          productDescription.includes(searchLower) ||
          categoryName.includes(searchLower) ||
          String(p.id).includes(searchLower)
        );
      })
      .slice(0, 8); // Limit to 8 suggestions
  })();

  // --- API Handlers ---

  const handleAddProduct = async () => {
    // --- Basic validation ---
    if (!productForm.name.trim()) {
      alert('Product name is required.');
      return;
    }
    if (!productForm.category_id) {
      alert('Please select a category.');
      return;
    }
    if (productForm.price <= 0) {
      alert('Price must be greater than 0.');
      return;
    }

    setUploading(true);

    try {
      const payload = {
        category_id: parseInt(String(productForm.category_id)),
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        price: parseFloat(String(productForm.price)),
        cost: parseFloat(String(productForm.cost)) || 0,
        preparation_time: parseInt(String(productForm.preparation_time)) || 0,
        image_url: productForm.image_url || '',
        is_available: true,
        is_active: true,
      };

      const response = await apiClient.post('/api/products', payload);

      if (response.ok) {
        await fetchProducts();
        resetProductForm();
        setShowAddModal(false);
        alert('✅ Product added successfully!');
      } else {
        const errorData = await response.json();
        const errorMessage = errorData.message || 'An error occurred.';
        alert(`❌ Failed to add product: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Add product error:', error);
      alert(`An unexpected error occurred: ${(error as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!categoryForm.name.trim()) {
      alert('Category name is required.');
      return;
    }

    try {
      const payload = {
        name: categoryForm.name.trim(),
        description: categoryForm.description.trim(),
        is_active: true,
        display_order: parseInt(String(categoryForm.display_order)) || categories.length + 1,
      };

      console.log('Sending category payload:', payload);

      const response = await apiClient.post('/api/categories', payload);
      
      const responseText = await response.text();
      console.log('Response status:', response.status);
      console.log('Response text:', responseText);

      if (response.ok) {
        await fetchCategories();
        resetCategoryForm();
        setShowAddModal(false);
        alert('✅ Category added successfully!');
      } else {
        let errorMessage = 'Unknown error';
        try {
          const errorJson = JSON.parse(responseText);
          errorMessage = errorJson.message || errorJson.error || errorMessage;
        } catch {
          errorMessage = responseText;
        }
        console.error('Add category failed:', errorMessage);
        alert(`❌ Failed to add category: ${errorMessage}`);
      }
    } catch (error) {
      console.error('Add category error:', error);
      alert(`An unexpected error occurred: ${(error as Error).message}`);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingItem(product);
    setProductForm({
      category_id: product.category_id,
      name: product.name || '',
      description: product.description || '',
      price: product.price,
      cost: product.cost || 0,
      preparation_time: product.preparation_time || 0,
      image_url: product.image_url || ''
    });
    setImagePreview(product.image_url || '');
    setSelectedImageFile(null);
    setShowAddModal(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingItem(category);
    setCategoryForm({
      name: category.name,
      description: category.description,
      display_order: category.display_order
    });
    setShowAddModal(true);
  };

  const handleUpdateProduct = async () => {
    if (!editingItem || !('category_id' in editingItem)) return;

    setUploading(true);
    try {
      let imageUrl = productForm.image_url;

      if (selectedImageFile) {
        imageUrl = await uploadImage(editingItem.id, selectedImageFile);
      }
      
      const finalProductData = {
        category_id: parseInt(String(productForm.category_id)),
        name: (productForm.name || '').trim(),
        description: (productForm.description || '').trim(),
        price: parseFloat(String(productForm.price)),
        cost: parseFloat(String(productForm.cost)) || 0,
        preparation_time: parseInt(String(productForm.preparation_time)) || 0,
        image_url: imageUrl || '',
      };

      const response = await apiClient.put(`/api/products/${editingItem.id}`, finalProductData);

      if (response.ok) {
        fetchProducts();
        setEditingItem(null);
        resetProductForm();
        setShowAddModal(false);
        alert('✅ Product updated successfully!');
      } else {
        const errorText = await response.text();
        alert(`Failed to update product: ${errorText}`);
      }
    } catch (error) {
      alert('Failed to upload image or update product. Please try again.');
      console.error('Update product error:', error);
    }
    setUploading(false);
  };

  const handleUpdateCategory = async () => {
    if (!editingItem || !('display_order' in editingItem)) return;

    const payload = {
      name: categoryForm.name.trim(),
      description: categoryForm.description.trim(),
      display_order: parseInt(String(categoryForm.display_order)) || 0,
    };

    const response = await apiClient.put(`/api/categories/${editingItem.id}`, payload);

    if (response.ok) {
      fetchCategories();
      setEditingItem(null);
      resetCategoryForm();
      setShowAddModal(false);
      alert('✅ Category updated successfully!');
    } else {
      const errorText = await response.text();
      alert(`Failed to update category: ${errorText}`);
    }
  };

  const handleDeleteProduct = async (id: number) => {
    if (confirm('Are you sure you want to delete this product?')) {
      const response = await apiClient.delete(`/api/products/${id}`);
      if (response.ok) {
        fetchProducts();
        alert('✅ Product deleted successfully!');
      } else {
        const errorText = await response.text();
        alert(`Failed to delete product: ${errorText}`);
      }
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (confirm('Are you sure you want to delete this category? All products in this category will be reassigned.')) {
      const response = await apiClient.delete(`/api/categories/${id}`);

      if (response.ok) {
        const result = await response.json();
        await fetchCategories();
        await fetchProducts();
        setSelectedCategory(null);
        const countMessage = result?.reassignedProductCount ? ` ${result.reassignedProductCount} product(s) moved to Uncategorized.` : '';
        alert(`✅ Category deleted successfully!${countMessage}`);
      } else {
        const errorText = await response.text();
        alert(`Failed to delete category: ${errorText}`);
      }
    }
  };

  const toggleProductAvailability = async (product: Product) => {
    const updatedProduct = { 
      ...product, 
      is_available: !product.is_available 
    };
    
    const response = await apiClient.put(`/api/products/${product.id}`, updatedProduct);
    
    if (response.ok) {
      fetchProducts();
    } else {
      alert('Failed to toggle availability.');
    }
  };

  const toggleCategoryActive = async (category: Category) => {
    const updatedCategory = { 
      ...category, 
      is_active: !category.is_active 
    };
    
    const response = await apiClient.put(`/api/categories/${category.id}`, updatedCategory);
    
    if (response.ok) {
      fetchCategories();
    } else {
      alert('Failed to toggle category status.');
    }
  };

  const resetProductForm = () => {
    setProductForm({
      category_id: categories.length > 0 ? categories[0].id : 1,
      name: '',
      description: '',
      price: 0,
      cost: 0,
      preparation_time: 0,
      image_url: ''
    });
    setSelectedImageFile(null);
    setImagePreview('');
  };

  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      description: '',
      display_order: categories.length + 1
    });
  };

  const handleSuggestionClick = (product: Product) => {
    handleEditProduct(product);
    setSearchTerm('');
    setShowSuggestions(false);
  };

  const toggleProductSelection = (id: number) => {
    setSelectedProductIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAllProducts = () => {
    const allFilteredIds = filteredProducts.map(p => p.id);
    const allSelected = allFilteredIds.every(id => selectedProductIds.includes(id));

    if (allSelected) {
      setSelectedProductIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      const newSelection = new Set([...selectedProductIds, ...allFilteredIds]);
      setSelectedProductIds(Array.from(newSelection));
    }
  };

  const handleBulkDeleteProducts = async () => {
    if (!confirm(`Are you sure you want to delete ${selectedProductIds.length} products?`)) return;

    setUploading(true);
    try {
      await Promise.all(selectedProductIds.map(id => apiClient.delete(`/api/products/${id}`)));
      await fetchProducts();
      setSelectedProductIds([]);
      alert('Products deleted successfully');
    } catch (error) {
      alert('Failed to delete some products');
    } finally {
      setUploading(false);
    }
  };

  const handleBulkAvailability = async (status: boolean) => {
    setUploading(true);
    try {
      await Promise.all(selectedProductIds.map(id => {
        const product = products.find(p => p.id === id);
        if (!product) return Promise.resolve();
        return apiClient.put(`/api/products/${id}`, { ...product, is_available: status });
      }));
      await fetchProducts();
      setSelectedProductIds([]);
      alert('Products updated successfully');
    } catch (error) {
      alert('Failed to update products');
    } finally {
      setUploading(false);
    }
  };

  const profitMargin = (price: number, cost?: number) => {
    if (!cost || cost === 0 || price === 0) return 0;
    return ((price - cost) / price) * 100;
  };

  const uploadImage = async (productId: number, file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('image', file);

    const result = await apiClient.post(`/api/products/${productId}/image`, formData);
    return result.url;
  };

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid image file (JPEG, PNG, WebP, or GIF)');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File size too large. Maximum size is 5MB.');
      return;
    }

    setSelectedImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleExportProducts = async () => {
    try {
      setUploading(true);
      const response = await apiClient.get('/api/products/export', { responseType: 'arraybuffer' });
      
      const blob = new Blob([response], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `products_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      alert('✅ Products exported successfully!');
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export products');
    } finally {
      setUploading(false);
    }
  };

  const handleUploadProducts = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      const response = await apiClient.post('/api/products/upload', formData);
      
      alert(`✅ Import Successful! Processed ${response.processed_count} items.`);
      if (response.errors && response.errors.length > 0) {
        console.warn('Import warnings:', response.errors);
      }
      
      await fetchProducts();
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload products');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Menu Management</h2>
          <p className="text-gray-600">Manage products, categories, and pricing</p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'products' && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleUploadProducts}
                accept=".csv, .xlsx, .xls"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                disabled={uploading}
              >
                <Upload className="w-5 h-5" />
                Import
              </button>
              <button
                onClick={handleExportProducts}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                disabled={uploading}
              >
                <Download className="w-5 h-5" />
                Export
              </button>
            </>
          )}
          <button
            onClick={() => { 
              setEditingItem(null); 
              resetProductForm(); 
              resetCategoryForm(); 
              setShowAddModal(true); 
            }}
            className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add {activeTab === 'products' ? 'Product' : 'Category'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{products.length}</div>
          <div className="text-sm text-gray-600">Total Products</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-green-600">{products.filter(p => p.is_available).length}</div>
          <div className="text-sm text-gray-600">Available Products</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-purple-600">{categories.filter(c => c.is_active).length}</div>
          <div className="text-sm text-gray-600">Active Categories</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-orange-600">
            {products.length > 0 ? formatCurrency(products.reduce((sum, p) => sum + p.price, 0) / products.length) : formatCurrency(0)}
          </div>
          <div className="text-sm text-gray-600">Average Price</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('products')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'products'
                  ? 'text-yellow-600 border-b-2 border-yellow-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Products ({products.length})
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-6 py-3 text-sm font-medium ${
                activeTab === 'categories'
                  ? 'text-yellow-600 border-b-2 border-yellow-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Categories ({categories.length})
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'products' && (
            <div className="space-y-4">
              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    {showSuggestions && searchSuggestions.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                        {searchSuggestions.map(product => (
                          <button
                            type="button"
                            key={product.id}
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleSuggestionClick(product)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                          >
                            <p className="text-sm font-medium text-gray-900">{product.name}</p>
                            <p className="text-xs text-gray-500">
                              ID: {product.id} • {getCategoryName(product.category_id)} • {formatCurrency(product.price)}
                            </p>
                          </button>
                        ))}
                      </div>
                    )}
                    <input
                      type="text"
                      placeholder="Search products to edit..."
                      value={searchTerm}
                      onFocus={() => setShowSuggestions(true)}
                      onChange={(e) => {
                        e.preventDefault(); // Prevent any default browser behavior
                        setSearchTerm(e.target.value);
                      }}
                      onBlur={() => {
                        window.setTimeout(() => {
                          setShowSuggestions(false);
                        }, 150);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.preventDefault(); // Prevent form submission on Enter
                      }}
                      className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      autoComplete="off"
                    />
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Showing {filteredProducts.length} of {products.length} products</span>
                </div>
              </div>

              {/* Category Filter */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    selectedCategory === null
                      ? 'bg-yellow-400 text-yellow-900'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  All Products
                </button>
                {categories.filter(c => c.is_active).map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                      selectedCategory === category.id
                        ? 'bg-yellow-400 text-yellow-900'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              {/* Bulk Actions Bar */}
              {selectedProductIds.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex items-center justify-between">
                  <span className="text-yellow-800 font-medium">{selectedProductIds.length} products selected</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleBulkAvailability(true)}
                      className="px-3 py-1.5 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                    >
                      Mark Available
                    </button>
                    <button
                      onClick={() => handleBulkAvailability(false)}
                      className="px-3 py-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                    >
                      Mark Unavailable
                    </button>
                    <button
                      onClick={handleBulkDeleteProducts}
                      className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 text-sm flex items-center gap-1"
                    >
                      <Trash2 className="w-4 h-4" /> Delete
                    </button>
                  </div>
                </div>
              )}

              {/* Products Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input 
                          type="checkbox"
                          checked={filteredProducts.length > 0 && filteredProducts.every(p => selectedProductIds.includes(p.id))}
                          onChange={toggleSelectAllProducts}
                          className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pricing</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prep Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input 
                            type="checkbox"
                            checked={selectedProductIds.includes(product.id)}
                            onChange={() => toggleProductSelection(product.id)}
                            className="rounded border-gray-300 text-yellow-500 focus:ring-yellow-500"
                          />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt={product.name}
                                  className="w-10 h-10 object-cover rounded-lg"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                    e.currentTarget.parentElement!.innerHTML = '<div class="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center"><svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.5 14.33c.39-.44.47-1.09.2-1.61l-3.8-7.13c-.52-.97-1.69-.97-2.21 0l-3.8 7.13c-.27.52-.19 1.17.2 1.61l1.4 1.56c.58.65 1.58.65 2.16 0l1.4-1.56z"></path></svg></div>';
                                  }}
                                />
                              ) : (
                                <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-lg flex items-center justify-center">
                                  <UtensilsCrossed className="w-5 h-5 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{product.name}</div>
                              <div className="text-sm text-gray-500 max-w-xs truncate">{product.description}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getCategoryName(product.category_id)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            <div>Price: <span className="font-semibold">{formatCurrency(product.price)}</span></div>
                            <div>Cost: {formatCurrency(product.cost || 0)}</div>
                            <div className="text-xs text-green-600">
                              Margin: {profitMargin(product.price, product.cost).toFixed(1)}%
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {product.preparation_time} min
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleProductAvailability(product)}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                              product.is_available
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                            }`}
                          >
                            {product.is_available ? 'Available' : 'Unavailable'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditProduct(product)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="space-y-4">
              {/* Categories Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Products Count</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Display Order</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {categories.map((category) => (
                      <tr key={category.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{category.name}</div>
                            <div className="text-sm text-gray-500">{category.description}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {products.filter(p => p.category_id === category.id).length} products
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {category.display_order}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleCategoryActive(category)}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer ${
                              category.is_active
                                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                : 'bg-red-100 text-red-800 hover:bg-red-200'
                            }`}
                          >
                            {category.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEditCategory(category)}
                              className="text-blue-600 hover:text-blue-900"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(category.id)}
                              className="text-red-600 hover:text-red-900"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingItem
                ? `Edit ${activeTab === 'products' ? 'Product' : 'Category'}`
                : `Add New ${activeTab === 'products' ? 'Product' : 'Category'}`
              }
            </h3>

            {activeTab === 'products' ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={productForm.description}
                    onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={productForm.category_id}
                    onChange={(e) => setProductForm(prev => ({ ...prev, category_id: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  >
                    {categories.filter(c => c.is_active).map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price (KES)</label>
                    <input
                      type="number"
                      value={productForm.price}
                      onChange={(e) => setProductForm(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cost (KES)</label>
                    <input
                      type="number"
                      value={productForm.cost}
                      onChange={(e) => setProductForm(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Preparation Time (minutes)</label>
                  <input
                    type="number"
                    value={productForm.preparation_time}
                    onChange={(e) => setProductForm(prev => ({ ...prev, preparation_time: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
                  <div className="space-y-3">
                    {imagePreview && (
                      <div className="flex items-center gap-3">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="w-20 h-20 object-cover rounded-lg border border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setImagePreview('');
                            setSelectedImageFile(null);
                            setProductForm(prev => ({ ...prev, image_url: '' }));
                          }}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Remove Image
                        </button>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      onChange={handleImageSelect}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100"
                    />
                    <p className="text-xs text-gray-500">
                      Supported formats: JPEG, PNG, WebP, GIF. Maximum size: 5MB.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={categoryForm.description}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Order</label>
                  <input
                    type="number"
                    value={categoryForm.display_order}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, display_order: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    min="0"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setEditingItem(null);
                  setShowAddModal(false);
                  resetProductForm();
                  resetCategoryForm();
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (activeTab === 'products') {
                    editingItem ? handleUpdateProduct() : handleAddProduct();
                  } else {
                    editingItem ? handleUpdateCategory() : handleAddCategory();
                  }
                }}
                disabled={uploading}
                className="flex-1 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 disabled:bg-gray-300 disabled:cursor-not-allowed text-yellow-900 disabled:text-gray-500 rounded-lg font-medium transition-colors"
              >
                {uploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-yellow-900 border-t-transparent rounded-full animate-spin"></div>
                    Uploading...
                  </div>
                ) : (
                  `${editingItem ? 'Update' : 'Add'} ${activeTab === 'products' ? 'Product' : 'Category'}`
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}