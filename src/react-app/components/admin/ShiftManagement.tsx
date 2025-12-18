import { useState, useEffect } from 'react';
import { Calendar, Clock, Plus, Edit3, Trash2, User, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { API_URL } from '../../config/api';

interface Shift {
  id: number;
  staff_id: number;
  staff_name: string;
  staff_role: string;
  employee_id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  actual_start_time?: string;
  actual_end_time?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'missed' | 'cancelled';
  break_duration?: number;
  notes?: string;
}

interface Staff {
  id: number;
  name: string;
  employee_id: string;
  role: string;
}

export default function ShiftManagement() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');

  const [formData, setFormData] = useState({
    staff_id: '',
    shift_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '17:00',
    break_duration: 30,
    notes: ''
  });

  useEffect(() => {
    fetchShifts();
    fetchStaff();
  }, [selectedDate, viewMode]);

  const fetchShifts = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('pos_token');
      const endDate = viewMode === 'week' 
        ? new Date(new Date(selectedDate).getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : selectedDate;

      const response = await fetch(
        `${API_URL}/api/shifts?start_date=${selectedDate}&end_date=${endDate}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.ok) {
        const data = await response.json();
        setShifts(data);
      }
    } catch (error) {
      console.error('Error fetching shifts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const token = localStorage.getItem('pos_token');
      const response = await fetch(`${API_URL}/api/staff`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setStaff(data.filter((s: Staff) => s.role !== 'admin'));
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('pos_token');
      const url = editingShift 
        ? `${API_URL}/api/shifts/${editingShift.id}`
        : `${API_URL}/api/shifts`;

      const response = await fetch(url, {
        method: editingShift ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        fetchShifts();
        resetForm();
        setShowAddModal(false);
        setEditingShift(null);
      } else {
        alert('Failed to save shift');
      }
    } catch (error) {
      console.error('Error saving shift:', error);
      alert('Error saving shift');
    }
  };

  const handleEdit = (shift: Shift) => {
    setEditingShift(shift);
    setFormData({
      staff_id: shift.staff_id.toString(),
      shift_date: shift.shift_date,
      start_time: shift.start_time,
      end_time: shift.end_time,
      break_duration: shift.break_duration || 30,
      notes: shift.notes || ''
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this shift?')) return;

    try {
      const token = localStorage.getItem('pos_token');
      const response = await fetch(`${API_URL}/api/shifts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        fetchShifts();
      }
    } catch (error) {
      console.error('Error deleting shift:', error);
    }
  };

  const updateShiftStatus = async (id: number, status: string) => {
    try {
      const token = localStorage.getItem('pos_token');
      const response = await fetch(`${API_URL}/api/shifts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        fetchShifts();
      }
    } catch (error) {
      console.error('Error updating shift status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      staff_id: '',
      shift_date: selectedDate,
      start_time: '09:00',
      end_time: '17:00',
      break_duration: 30,
      notes: ''
    });
  };

  const getStatusBadge = (status: string) => {
    const badges: { [key: string]: { bg: string; text: string; icon: JSX.Element } } = {
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-800', icon: <Clock className="w-3 h-3" /> },
      in_progress: { bg: 'bg-green-100', text: 'text-green-800', icon: <CheckCircle className="w-3 h-3" /> },
      completed: { bg: 'bg-gray-100', text: 'text-gray-800', icon: <CheckCircle className="w-3 h-3" /> },
      missed: { bg: 'bg-red-100', text: 'text-red-800', icon: <XCircle className="w-3 h-3" /> },
      cancelled: { bg: 'bg-orange-100', text: 'text-orange-800', icon: <XCircle className="w-3 h-3" /> }
    };

    const badge = badges[status] || badges.scheduled;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.icon}
        {status.replace('_', ' ')}
      </span>
    );
  };

  const groupShiftsByStaff = () => {
    const grouped: { [key: string]: Shift[] } = {};
    shifts.forEach(shift => {
      const key = `${shift.staff_id}-${shift.staff_name}`;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(shift);
    });
    return grouped;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Shift Management</h2>
          <p className="text-gray-600">Schedule and manage staff shifts</p>
        </div>
        <button
          onClick={() => {
            setEditingShift(null);
            resetForm();
            setShowAddModal(true);
          }}
          className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Shift
        </button>
      </div>

      {/* Date Controls */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('day')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'day'
                  ? 'bg-yellow-400 text-yellow-900'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Day View
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'week'
                  ? 'bg-yellow-400 text-yellow-900'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Week View
            </button>
          </div>

          <button
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="ml-auto px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Shifts Display */}
      {viewMode === 'day' ? (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Break</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {shifts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                      No shifts scheduled for this date
                    </td>
                  </tr>
                ) : (
                  shifts.map((shift) => (
                    <tr key={shift.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">{shift.staff_name}</div>
                            <div className="text-xs text-gray-500">{shift.employee_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 capitalize">
                        {shift.staff_role.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {shift.start_time} - {shift.end_time}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {shift.break_duration || 0} min
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(shift.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEdit(shift)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(shift.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          {shift.status === 'scheduled' && (
                            <button
                              onClick={() => updateShiftStatus(shift.id, 'cancelled')}
                              className="text-orange-600 hover:text-orange-900 text-xs"
                            >
                              Cancel
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="space-y-4">
            {Object.entries(groupShiftsByStaff()).map(([key, staffShifts]) => (
              <div key={key} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{staffShifts[0].staff_name}</div>
                      <div className="text-xs text-gray-500">{staffShifts[0].staff_role}</div>
                    </div>
                  </div>
                  <span className="text-sm text-gray-600">{staffShifts.length} shifts</span>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {staffShifts.map((shift) => (
                    <div
                      key={shift.id}
                      className="bg-gray-50 rounded p-2 text-xs border border-gray-200"
                    >
                      <div className="font-medium text-gray-900">
                        {new Date(shift.shift_date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className="text-gray-600 mt-1">
                        {shift.start_time} - {shift.end_time}
                      </div>
                      <div className="mt-1">{getStatusBadge(shift.status)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingShift ? 'Edit Shift' : 'Create New Shift'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Staff Member</label>
                <select
                  value={formData.staff_id}
                  onChange={(e) => setFormData(prev => ({ ...prev, staff_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                >
                  <option value="">Select staff member</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} - {s.role} ({s.employee_id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shift Date</label>
                <input
                  type="date"
                  value={formData.shift_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, shift_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Break Duration (minutes)</label>
                <input
                  type="number"
                  value={formData.break_duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, break_duration: parseInt(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  min="0"
                  step="15"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                  placeholder="Any special instructions..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingShift(null);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!formData.staff_id || !formData.shift_date}
                className="flex-1 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingShift ? 'Update' : 'Create'} Shift
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}