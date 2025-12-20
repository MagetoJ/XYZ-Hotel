import { useState, useEffect } from 'react';
import { ClipboardList, Send, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { API_URL } from '../../config/api';

interface HandoverLog {
  id: number;
  message: string;
  shift_type: string;
  is_resolved: boolean;
  created_at: string;
  staff_name: string;
  staff_username: string;
}

export default function ShiftHandover() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<HandoverLog[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = localStorage.getItem('pos_token');

  const fetchLogs = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/handovers`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch handover logs');
      }

      const data = await response.json();
      setLogs(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load handover logs');
      console.error('Error fetching logs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      setError('Please enter a message');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const response = await fetch(`${API_URL}/api/handovers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: message.trim(), shift_type: 'Daily' })
      });

      if (!response.ok) {
        throw new Error('Failed to create handover log');
      }

      setMessage('');
      await fetchLogs();
    } catch (err: any) {
      setError(err.message || 'Failed to create handover log');
      console.error('Error submitting log:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this handover note?')) return;

    try {
      const response = await fetch(`${API_URL}/api/handovers/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to delete handover log');
      }

      await fetchLogs();
    } catch (err: any) {
      setError(err.message || 'Failed to delete handover log');
      console.error('Error deleting log:', err);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="glass-card p-6 border border-primary-100">
      <h2 className="text-xl font-bold flex items-center gap-2 mb-4 text-slate-900">
        <ClipboardList className="text-primary-600 w-6 h-6" />
        Shift Handover Notes
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="space-y-3 mb-6 max-h-80 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-8">No handover notes yet</p>
        ) : (
          logs.map(log => (
            <div 
              key={log.id} 
              className="p-3 bg-gradient-to-r from-primary-50 to-primary-100/50 rounded-lg border-l-4 border-primary-400 hover:shadow-sm transition-shadow"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex-1">
                  <p className="text-sm text-slate-800 font-medium">{log.message}</p>
                  <div className="flex gap-3 items-center mt-2">
                    <p className="text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{log.staff_name}</span>
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(log.created_at)} at {formatTime(log.created_at)}
                    </p>
                  </div>
                </div>
                {user?.id && (
                  <button
                    onClick={() => handleDelete(log.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input 
          value={message} 
          onChange={(e) => {
            setMessage(e.target.value);
            if (error) setError(null);
          }}
          placeholder="Leave a note for the next shift..."
          className="flex-1 p-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all text-sm"
          disabled={isSubmitting}
        />
        <button 
          type="submit"
          disabled={isSubmitting || !message.trim()}
          className="bg-primary-600 text-white p-2.5 rounded-lg hover:bg-primary-700 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>
    </div>
  );
}
