import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_URL } from '../config/api';
import { Calendar, Clock, Loader2 } from 'lucide-react';

interface Shift {
  id: number;
  shift_date: string;
  start_time: string;
  end_time: string;
  status: string;
  notes?: string;
}

export default function MyShiftsView() {
  const { user } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0]
  });

  useEffect(() => {
    const fetchMyShifts = async () => {
      if (!user) return;
      setIsLoading(true);
      const token = localStorage.getItem('pos_token');
      try {
        const response = await fetch(
          `${API_URL}/api/shifts/my-shifts?start_date=${dateRange.start}&end_date=${dateRange.end}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (response.ok) {
          const data = await response.json();
          setShifts(data);
        }
      } catch (error) {
        console.error('Error fetching my shifts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMyShifts();
  }, [user, dateRange]);

  const getStatusBadge = (status: string) => {
    const baseClasses = "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case 'scheduled': return `${baseClasses} bg-blue-100 text-blue-800`;
      case 'in_progress': return `${baseClasses} bg-green-100 text-green-800`;
      case 'completed': return `${baseClasses} bg-gray-100 text-gray-800`;
      default: return `${baseClasses} bg-yellow-100 text-yellow-800`;
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-gray-500" />
        Your Upcoming Shifts
      </h3>
      <div className="space-y-3">
        {shifts.length > 0 ? (
          shifts.map((shift) => (
            <div key={shift.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-800">{new Date(shift.shift_date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                    <Clock className="w-4 h-4" />
                    {shift.start_time} - {shift.end_time}
                  </p>
                </div>
                <span className={getStatusBadge(shift.status)}>{shift.status}</span>
              </div>
              {shift.notes && <p className="text-xs text-gray-500 mt-2 pt-2 border-t border-gray-200">Notes: {shift.notes}</p>}
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">You have no shifts scheduled for the next 7 days.</p>
        )}
      </div>
    </div>
  );
}