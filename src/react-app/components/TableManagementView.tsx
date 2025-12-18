import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Plus, Edit, Trash2 } from 'lucide-react';
import { API_URL } from '../config/api';
import { useAuth } from '../contexts/AuthContext';

interface Table {
  id: number;
  table_number: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved';
}

export default function TableManagementView() {
  const { user } = useAuth();
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [formData, setFormData] = useState({ table_number: '', capacity: '' });

  const fetchTables = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('pos_token');
    try {
      const response = await fetch(`${API_URL}/api/tables`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch tables');
      const data = await response.json();
      setTables(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  const handleOpenModal = (table: Table | null = null) => {
    setEditingTable(table);
    setFormData({
      table_number: table ? table.table_number : '',
      capacity: table ? String(table.capacity) : '',
    });
    setModalOpen(true);
  };

  const handleSaveTable = async () => {
    const token = localStorage.getItem('pos_token');
    const url = editingTable ? `${API_URL}/api/tables/${editingTable.id}` : `${API_URL}/api/tables`;
    const method = editingTable ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            table_number: formData.table_number,
            capacity: parseInt(formData.capacity, 10),
            // Set default status when creating
            ...(!editingTable && { status: 'available' })
        }),
      });
      if (!response.ok) throw new Error('Failed to save table');
      setModalOpen(false);
      fetchTables();
    } catch (err) {
      alert((err as Error).message);
    }
  };
  
  const handleUpdateStatus = async (table: Table, status: Table['status']) => {
    const token = localStorage.getItem('pos_token');
    try {
        const response = await fetch(`${API_URL}/api/tables/${table.id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status }),
        });
        if (!response.ok) throw new Error('Failed to update status');
        fetchTables();
    } catch (err) {
        alert((err as Error).message);
    }
  };


  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-yellow-500" /></div>;
  }
  if (error) {
    return <div className="text-center text-red-500 p-4">{error}</div>;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Manage Tables</h2>
        <button onClick={() => handleOpenModal()} className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold py-2 px-4 rounded flex items-center gap-2">
          <Plus size={18} /> Add Table
        </button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {tables.map((table) => (
          <div key={table.id} className="border rounded-lg p-4 shadow-sm bg-white">
            <h3 className="font-bold text-lg">Table {table.table_number}</h3>
            <p className="text-sm text-gray-600">Capacity: {table.capacity}</p>
            <p className="text-sm text-gray-600 capitalize">Status: <span className="font-semibold">{table.status}</span></p>
            <div className="mt-4 space-y-2">
                 <select 
                    value={table.status}
                    onChange={(e) => handleUpdateStatus(table, e.target.value as Table['status'])}
                    className="w-full p-2 border rounded-md text-sm"
                 >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="reserved">Reserved</option>
                 </select>
                <button onClick={() => handleOpenModal(table)} className="w-full text-xs text-blue-600 hover:text-blue-800 flex items-center justify-center gap-1">
                    <Edit size={14} /> Edit
                </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">{editingTable ? 'Edit Table' : 'Add New Table'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Table Number</label>
                <input type="text" value={formData.table_number} onChange={(e) => setFormData({...formData, table_number: e.target.value})} className="w-full p-2 border rounded-md" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Capacity</label>
                <input type="number" value={formData.capacity} onChange={(e) => setFormData({...formData, capacity: e.target.value})} className="w-full p-2 border rounded-md" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded-lg">Cancel</button>
              <button onClick={handleSaveTable} className="px-4 py-2 bg-yellow-400 text-yellow-900 rounded-lg">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
