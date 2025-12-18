import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Header from '../components/Header';
import {
  Bed,
  CheckCircle,
  User,
  Wrench,
  Sparkles,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import { Room } from '../contexts/POSContext';


// --- Helper Function ---
// This function formats numbers as currency.
export const formatCurrency = (amount: number) => {
  if (typeof amount !== 'number') {
    return 'KES 0';
  }
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
  }).format(amount);
};

interface MaintenanceRequest {
  id: number;
  room_id: number;
  room_number: string;
  issue: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  reported_at: string;
  reported_by: string;
}

export default function HousekeepingDashboard() {
  useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const getToken = () => localStorage.getItem('pos_token');

  const fetchData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [roomsRes, maintenanceRes] = await Promise.all([
        fetch('/api/rooms', { headers: { 'Authorization': `Bearer ${getToken()}` } }),
        fetch('/api/maintenance-requests', { headers: { 'Authorization': `Bearer ${getToken()}` } })
      ]);

      if (!roomsRes.ok || !maintenanceRes.ok) {
        throw new Error('Failed to fetch data.');
      }

      const roomsData = await roomsRes.json();
      const maintenanceData = await maintenanceRes.json();

      setRooms(roomsData);
      setMaintenanceRequests(maintenanceData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateRoomStatus = async (roomId: number, newStatus: Room['status']) => {
    try {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        setRooms(prev => prev.map(room =>
          room.id === roomId ? { ...room, status: newStatus } : room
        ));
        if (selectedRoom?.id === roomId) {
          setSelectedRoom(null);
        }
      } else {
        alert('Failed to update room status.');
      }
    } catch (error) {
      console.error('Error updating room status:', error);
    }
  };

  const updateMaintenanceStatus = async (requestId: number, newStatus: MaintenanceRequest['status']) => {
    try {
        const response = await fetch(`/api/maintenance-requests/${requestId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ status: newStatus })
        });
        if (response.ok) {
            // If completed, remove from list, otherwise update it
            if (newStatus === 'completed') {
                setMaintenanceRequests(prev => prev.filter(req => req.id !== requestId));
            } else {
                setMaintenanceRequests(prev => prev.map(request =>
                    request.id === requestId ? { ...request, status: newStatus } : request
                ));
            }
        } else {
            alert('Failed to update maintenance status.');
        }
    } catch (error) {
        console.error('Error updating maintenance status:', error);
    }
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'vacant':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'occupied':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      case 'reserved':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'maintenance':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'cleaning':
        return 'bg-purple-100 border-purple-300 text-purple-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMaintenanceStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
        <div className="flex h-screen items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
            <p className="ml-4 text-gray-600">Loading Housekeeping Data...</p>
        </div>
    );
  }

  if (error) {
     return (
        <div className="flex h-screen items-center justify-center bg-red-50">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            <p className="ml-4 font-semibold text-red-700">Failed to load data: {error}</p>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <Header />

      <div className="flex-1 p-6 overflow-y-auto">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-purple-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Housekeeping Dashboard</h1>
              <p className="text-gray-600">Room management and maintenance tracking</p>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-green-600">
              {rooms.filter(r => r.status === 'vacant').length}
            </div>
            <div className="text-sm text-gray-600">Clean & Ready</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-purple-600">
              {rooms.filter(r => r.status === 'cleaning').length}
            </div>
            <div className="text-sm text-gray-600">Being Cleaned</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-red-600">
              {rooms.filter(r => r.status === 'maintenance').length}
            </div>
            <div className="text-sm text-gray-600">Maintenance</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-blue-600">
              {rooms.filter(r => r.status === 'occupied').length}
            </div>
            <div className="text-sm text-gray-600">Occupied</div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <div className="text-2xl font-bold text-orange-600">
              {maintenanceRequests.length}
            </div>
            <div className="text-sm text-gray-600">Pending Requests</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Rooms Grid */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Room Status</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {rooms.map((room) => (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoom(room)}
                    className={`
                      p-3 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md
                      ${getStatusColor(room.status)}
                    `}
                  >
                    <div className="text-center">
                      <Bed className="w-6 h-6 mx-auto mb-2" />
                      <div className="font-bold">{room.room_number}</div>
                      <div className="text-xs mt-1 capitalize">
                        {room.status.replace('_', ' ')}
                      </div>
                      {room.guest_name && (
                        <div className="text-xs mt-1 truncate">
                          {room.guest_name}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Maintenance Requests */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Maintenance Requests</h2>
              <div className="space-y-3">
                {maintenanceRequests.map((request) => (
                  <div key={request.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="font-medium text-gray-900">
                        Room {request.room_number}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(request.priority)}`}>
                        {request.priority}
                      </span>
                    </div>

                    <p className="text-sm text-gray-600 mb-3">{request.issue}</p>

                    <div className="flex items-center justify-between">
                      <div className="text-xs text-gray-500">
                        {new Date(request.reported_at).toLocaleDateString()}
                      </div>
                      <select
                        value={request.status}
                        onChange={(e) => updateMaintenanceStatus(request.id, e.target.value as MaintenanceRequest['status'])}
                        className={`text-xs px-2 py-1 rounded-md ${getMaintenanceStatusColor(request.status)}`}
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>
                ))}

                {maintenanceRequests.length === 0 && (
                  <div className="text-center py-6 text-gray-500">
                    <Wrench className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p>No active maintenance requests</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Room Status Modal */}
        {selectedRoom && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Room {selectedRoom.room_number}
                </h3>
                <button
                  onClick={() => setSelectedRoom(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Room Type: {selectedRoom.room_type}
                  </label>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rate: {formatCurrency(selectedRoom.rate)}/night
                  </label>
                  {selectedRoom.guest_name && (
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Guest: {selectedRoom.guest_name}
                    </label>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Update Status:
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => updateRoomStatus(selectedRoom.id, 'cleaning')}
                      className="p-3 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
                      disabled={selectedRoom.status === 'cleaning'}
                    >
                      <Sparkles className="w-5 h-5 mx-auto mb-1 text-purple-600" />
                      <span className="text-sm font-medium text-purple-700">Cleaning</span>
                    </button>

                    <button
                      onClick={() => updateRoomStatus(selectedRoom.id, 'vacant')}
                      className="p-3 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
                      disabled={selectedRoom.status === 'vacant'}
                    >
                      <CheckCircle className="w-5 h-5 mx-auto mb-1 text-green-600" />
                      <span className="text-sm font-medium text-green-700">Clean</span>
                    </button>

                    <button
                      onClick={() => updateRoomStatus(selectedRoom.id, 'maintenance')}
                      className="p-3 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
                      disabled={selectedRoom.status === 'maintenance'}
                    >
                      <Wrench className="w-5 h-5 mx-auto mb-1 text-red-600" />
                      <span className="text-sm font-medium text-red-700">Maintenance</span>
                    </button>

                    <button
                      onClick={() => updateRoomStatus(selectedRoom.id, 'occupied')}
                      className="p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                      disabled={selectedRoom.status === 'occupied'}
                    >
                      <User className="w-5 h-5 mx-auto mb-1 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700">Occupied</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedRoom(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}