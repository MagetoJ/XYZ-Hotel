import { useState, useEffect } from 'react';
import { apiClient } from '../../config/api';
import { Plus, Trash2, Edit2, Loader2, AlertCircle } from 'lucide-react';

interface Expense {
  id: number;
  date: string;
  category: string;
  description: string;
  amount: number;
  vendor?: string;
  payment_method: string;
  receipt_number?: string;
  notes?: string;
  created_by?: number;
  created_at: string;
}

export default function ExpensesManagement() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'supplies',
    description: '',
    amount: '',
    vendor: '',
    payment_method: 'cash',
    receipt_number: '',
    notes: '',
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setIsLoading(true);
    setError(null);
    try {
      console.log('📦 Fetching expenses data...');
      const response = await apiClient.get('/api/expenses');
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to fetch expenses. Status:', response.status, 'Response:', errorText);
        
        // Provide specific error messages based on status code
        if (response.status === 401) {
          throw new Error('Unauthorized. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to view expenses.');
        } else if (response.status === 500) {
          throw new Error('Server error. The database may not be properly configured.');
        } else {
          throw new Error(`Failed to fetch expenses (Status: ${response.status})`);
        }
      }
      
      const data = await response.json();
      console.log('✅ Expenses data fetched successfully:', data.length, 'items');
      setExpenses(data);
    } catch (err) {
      const errorMessage = (err as Error).message || 'Unknown error occurred';
      console.error('❌ Error fetching expenses:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
      };

      const operation = editingId ? 'update' : 'create';
      console.log(`📝 ${operation === 'create' ? 'Creating' : 'Updating'} expense...`, payload);

      const response = editingId
        ? await apiClient.put(`/api/expenses/${editingId}`, payload)
        : await apiClient.post('/api/expenses', payload);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to submit expense. Status:', response.status, 'Response:', errorText);
        
        if (response.status === 401) {
          throw new Error('Unauthorized. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to manage expenses.');
        } else if (response.status === 400) {
          throw new Error('Invalid data. Please check all required fields.');
        } else if (response.status === 500) {
          throw new Error('Server error. Could not save expense.');
        } else {
          throw new Error(editingId ? 'Failed to update expense' : 'Failed to create expense');
        }
      }

      console.log(`✅ Expense ${operation === 'create' ? 'created' : 'updated'} successfully`);
      await fetchExpenses();
      setShowForm(false);
      setEditingId(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        category: 'supplies',
        description: '',
        amount: '',
        vendor: '',
        payment_method: 'cash',
        receipt_number: '',
        notes: '',
      });
    } catch (err) {
      const errorMessage = (err as Error).message || 'Unknown error occurred';
      console.error('❌ Error submitting expense:', errorMessage);
      setError(errorMessage);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setFormData({
      date: expense.date,
      category: expense.category,
      description: expense.description,
      amount: expense.amount.toString(),
      vendor: expense.vendor || '',
      payment_method: expense.payment_method,
      receipt_number: expense.receipt_number || '',
      notes: expense.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;
    try {
      console.log('🗑️  Deleting expense:', id);
      const response = await apiClient.delete(`/api/expenses/${id}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Failed to delete expense. Status:', response.status, 'Response:', errorText);
        
        if (response.status === 401) {
          throw new Error('Unauthorized. Please log in again.');
        } else if (response.status === 403) {
          throw new Error('You do not have permission to delete expenses.');
        } else if (response.status === 404) {
          throw new Error('Expense not found.');
        } else {
          throw new Error('Failed to delete expense');
        }
      }
      
      console.log('✅ Expense deleted successfully');
      await fetchExpenses();
    } catch (err) {
      const errorMessage = (err as Error).message || 'Unknown error occurred';
      console.error('❌ Error deleting expense:', errorMessage);
      setError(errorMessage);
    }
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  const categoryTotals = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {} as Record<string, number>);

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
        <h2 className="text-2xl font-bold text-gray-900">Expenses Management</h2>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingId(null);
            setFormData({
              date: new Date().toISOString().split('T')[0],
              category: 'supplies',
              description: '',
              amount: '',
              vendor: '',
              payment_method: 'cash',
              receipt_number: '',
              notes: '',
            });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Expense
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-800">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <p className="text-gray-600 text-sm font-medium">Total Expenses</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            KES {totalExpenses.toLocaleString('en-KE', { maximumFractionDigits: 0 })}
          </p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <p className="text-gray-600 text-sm font-medium">Total Entries</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{expenses.length}</p>
        </div>
      </div>

      {/* Category Breakdown */}
      {Object.keys(categoryTotals).length > 0 && (
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">By Category</h3>
          <div className="space-y-3">
            {Object.entries(categoryTotals).map(([category, amount]) => (
              <div key={category} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700 capitalize">{category.replace('_', ' ')}</span>
                <span className="text-sm font-bold text-gray-900">
                  KES {amount.toLocaleString('en-KE', { maximumFractionDigits: 0 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {editingId ? 'Edit Expense' : 'Add New Expense'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="supplies">Supplies</option>
                  <option value="utilities">Utilities</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="salaries">Salaries</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (KES) *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vendor</label>
                <input
                  type="text"
                  value={formData.vendor}
                  onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Receipt Number</label>
                <input
                  type="text"
                  value={formData.receipt_number}
                  onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
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
                {editingId ? 'Update' : 'Create'} Expense
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Expenses Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Method</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No expenses recorded yet
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-900">{new Date(expense.date).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-medium capitalize">
                        {expense.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{expense.description}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      KES {expense.amount.toLocaleString('en-KE', { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{expense.vendor || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">{expense.payment_method.replace('_', ' ')}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
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