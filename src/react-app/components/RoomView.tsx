import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext'; // <-- ADD THIS LINE
import { Bed, Wifi, Tv, Wind, Loader2, AlertCircle, LogIn, LogOut, User, Phone } from 'lucide-react';
import { API_URL } from '../config/api';

interface Room {
  id: number;
  room_number: string;
  room_type: string;
  status: 'available' | 'occupied' | 'dirty' | 'maintenance';
  price_per_night: number | null;
}

export default function RoomView() {
  const { user } = useAuth(); // <-- ADD THIS LINE
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Debug logging
  console.log('RoomView - Current user:', user);
  console.log('RoomView - User role:', user?.role);

  // State for modals
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isCheckInModalOpen, setCheckInModalOpen] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestContact, setGuestContact] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchRooms = async () => {
    setIsLoading(true);
    setError(null);
    const token = localStorage.getItem('pos_token');

    try {
      const response = await fetch(`${API_URL}/api/rooms`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Failed to fetch rooms');
      const data = await response.json();
      setRooms(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleOpenCheckIn = (room: Room) => {
    setSelectedRoom(room);
    setGuestName('');
    setGuestContact('');
    setCheckInModalOpen(true);
  };

  const handleCheckIn = async () => {
    if (!selectedRoom || !guestName) return;
    setIsProcessing(true);
    const token = localStorage.getItem('pos_token');
    try {
      const response = await fetch(`${API_URL}/api/rooms/${selectedRoom.id}/check-in`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ guest_name: guestName, guest_contact: guestContact }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Check-in failed');
      }
      setCheckInModalOpen(false);
      await fetchRooms(); // Refresh the room list
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCheckOut = async (room: Room) => {
    if (window.confirm(`Are you sure you want to check out Room ${room.room_number}?`)) {
        setIsProcessing(true);
        const token = localStorage.getItem('pos_token');
        try {
          const response = await fetch(`${API_URL}/api/rooms/${room.id}/check-out`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Check-out failed');
          }
          await fetchRooms(); // Refresh the room list
        } catch (err) {
          alert((err as Error).message);
        } finally {
          setIsProcessing(false);
        }
    }
  };

  const getStatusColor = (status: Room['status']) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800 border-green-300';
      case 'occupied': return 'bg-red-100 text-red-800 border-red-300';
      case 'dirty': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'maintenance': return 'bg-gray-100 text-gray-800 border-gray-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-yellow-500" /></div>;
  }
  if (error) {
    return <div className="text-center text-red-500 p-4">{error}</div>;
  }

  return (
    <>
      <div className="p-4 sm:p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Room Status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {rooms.map((room) => (
            <div key={room.id} className={`rounded-lg border shadow-sm p-4 flex flex-col ${getStatusColor(room.status)}`}>
              <div className="flex-grow">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-bold flex items-center"><Bed className="w-5 h-5 mr-2" />Room {room.room_number}</h3>
                  <span className="text-xs font-semibold px-2 py-1 rounded-full uppercase">{room.status}</span>
                </div>
                <p className="text-sm font-medium capitalize">{room.room_type}</p>
                <p className="text-lg font-bold mt-1">
                  {typeof room.price_per_night === 'number' ? `KES ${room.price_per_night.toLocaleString()}` : 'Price not set'}
                </p>
              </div>
              <div className="flex items-center gap-3 mt-4 text-xs border-t pt-3">
                <span className="flex items-center gap-1"><Wifi size={14} /> WiFi</span>
                <span className="flex items-center gap-1"><Tv size={14} /> TV</span>
                <span className="flex items-center gap-1"><Wind size={14} /> AC</span>
              </div>
              {/* Room Action Buttons */}
              <div className="mt-4">
                {/* Debug info for development */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mb-2 text-xs text-gray-500">
                    User: {user?.name || 'No user'} | Role: {user?.role || 'No role'}
                  </div>
                )}
                
                {/* Show buttons for authorized roles */}
                {(user?.role === 'admin' || user?.role === 'manager' || user?.role === 'receptionist') ? (
                  <>
                    {room.status === 'available' && (
                      <button 
                        onClick={() => handleOpenCheckIn(room)} 
                        className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors"
                      >
                        <LogIn size={16} /> Check-In Guest
                      </button>
                    )}
                    {room.status === 'occupied' && (
                      <button 
                        onClick={() => handleCheckOut(room)} 
                        disabled={isProcessing} 
                        className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                      >
                         {isProcessing ? (
                           <Loader2 className="w-5 h-5 animate-spin"/>
                         ) : (
                           <>
                             <LogOut size={16} /> Check-Out Guest
                           </>
                         )}
                      </button>
                    )}
                    {(room.status === 'dirty' || room.status === 'maintenance') && (
                      <div className="w-full text-center py-2 px-4 rounded bg-gray-200 text-gray-600 text-sm">
                        {room.status === 'dirty' ? 'Needs Cleaning' : 'Under Maintenance'}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full text-center py-2 px-4 rounded bg-gray-100 text-gray-500 text-sm">
                    {user ? `Access Denied (${user.role})` : 'Login Required'}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Check-In Modal */}
      {isCheckInModalOpen && selectedRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Check-In to Room {selectedRoom.room_number}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Guest Name *</label>
                <div className="relative"><User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="text" value={guestName} onChange={(e) => setGuestName(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" required /></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Guest Contact (Optional)</label>
                <div className="relative"><Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" /><input type="text" value={guestContact} onChange={(e) => setGuestContact(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg" /></div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setCheckInModalOpen(false)} className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">Cancel</button>
              <button onClick={handleCheckIn} disabled={!guestName || isProcessing} className="flex-1 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Confirm Check-In'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}