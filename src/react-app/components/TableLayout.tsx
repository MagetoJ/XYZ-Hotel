import { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { API_URL } from '../config/api';

interface Table {
  id: number;
  table_number: string;
  capacity: number;
  status: 'available' | 'occupied' | 'reserved';
}

export default function TableLayout() {
  const [tables, setTables] = useState<Table[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTables = async () => {
      setIsLoading(true);
      setError(null);
      // Retrieve the token from local storage
      const token = localStorage.getItem('pos_token');

      try {
        const response = await fetch(`${API_URL}/api/tables`, {
          headers: {
            // Add the Authorization header
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch tables');
        }
        const data = await response.json();
        setTables(data);
      } catch (err) {
        const errorMessage = (err as Error).message;
        setError(errorMessage);
        console.error('Error fetching tables:', new Error(errorMessage));
      } finally {
        setIsLoading(false);
      }
    };

    fetchTables();
  }, []);

  const getStatusColor = (status: Table['status']) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 border-green-300';
      case 'occupied': return 'bg-red-100 text-red-800 border-red-300';
      case 'reserved': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-red-50 text-red-700 rounded-lg">
        <AlertCircle className="w-12 h-12 mb-4" />
        <h3 className="text-xl font-semibold">Error Loading Tables</h3>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-4">Table Layout</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {tables.map((table) => (
          <div
            key={table.id}
            className={`rounded-lg border shadow-sm p-4 text-center flex flex-col items-center justify-center aspect-square ${getStatusColor(table.status)}`}
          >
            <h3 className="text-lg font-bold">Table {table.table_number}</h3>
            <p className="text-sm">Capacity: {table.capacity}</p>
            <span className="mt-2 text-xs font-semibold px-2 py-1 rounded-full uppercase">
              {table.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}