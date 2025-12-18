import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  Bed, 
  Wifi, 
  Tv, 
  Wind, 
  Loader2, 
  AlertCircle, 
  LogIn, 
  LogOut, 
  User, 
  Phone,
  UserPlus,
  Calendar,
  Clock,
  RefreshCw
} from 'lucide-react';
import { API_URL } from '../../config/api';

interface Room {
  id: number;
  room_number: string;
  room_type: string;
  status: 'vacant' | 'occupied' | 'cleaning' | 'maintenance' | 'reserved';
  rate: number | null;
  // Legacy fields (if they exist)
  price_per_night?: number | null;
}

export default function ReceptionistCheckIn() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // State for modals
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [isCheckInModalOpen, setCheckInModalOpen] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestContact, setGuestContact] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Statistics
  const availableRooms = rooms.filter(room => room.status === 'vacant');
  const occupiedRooms = rooms.filter(room => room.status === 'occupied');

  const fetchRooms = async () => {
    setIsLoading(true);
    setError(null);
    const token = localStorage.getItem('pos_token');

    try {
      const response = await fetch(`${API_URL}/api/rooms?t=${Date.now()}`, {
        headers: { 
          'Authorization': `Bearer ${token}`
        },
      });

      if (!response.ok) throw new Error('Failed to fetch rooms');
      const data = await response.json();
      
      // Ensure rate is properly typed as number or null
      const processedData = data.map((room: any) => ({
        ...room,
        rate: room.rate !== null && room.rate !== undefined ? Number(room.rate) : null
      }));
      
      setRooms(processedData);
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
    if (!selectedRoom || !guestName.trim()) {
      alert('Guest name is required');
      return;
    }
    
    setIsProcessing(true);
    const token = localStorage.getItem('pos_token');
    
    try {
      const response = await fetch(`${API_URL}/api/rooms/${selectedRoom.id}/check-in`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          guest_name: guestName.trim(), 
          guest_contact: guestContact.trim() || null 
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Check-in failed');
      }
      
      setCheckInModalOpen(false);
      setGuestName('');
      setGuestContact('');
      await fetchRooms(); // Refresh the room list to get latest data from room management
      alert(`✅ Guest ${guestName} successfully checked into Room ${selectedRoom.room_number}`);
    } catch (err) {
      alert(`❌ Check-in failed: ${(err as Error).message}`);
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
        
        await fetchRooms(); // Refresh the room list to get latest data from room management
        alert(`✅ Room ${room.room_number} successfully checked out`);
      } catch (err) {
        alert(`❌ Check-out failed: ${(err as Error).message}`);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const getStatusColor = (status: Room['status']) => {
    switch (status) {
      case 'vacant': return 'bg-green-100 text-green-800 border-green-300';
      case 'occupied': return 'bg-red-100 text-red-800 border-red-300';
      case 'cleaning': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'maintenance': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'reserved': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusBadge = (status: Room['status']) => {
    const colors = {
      vacant: 'bg-green-500 text-white',
      occupied: 'bg-red-500 text-white',
      cleaning: 'bg-yellow-500 text-white',
      maintenance: 'bg-gray-500 text-white',
      reserved: 'bg-blue-500 text-white'
    };
    
    return colors[status] || colors.maintenance;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading rooms...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Rooms</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button 
          onClick={fetchRooms}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="p-4 sm:p-6 space-y-6">
        {/* Header with Statistics */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <UserPlus className="w-8 h-8 text-blue-600" />
              Guest Check-In/Out
            </h2>
            <p className="text-gray-600 mt-1">Manage guest room assignments</p>
          </div>
          
          <div className="flex gap-4 items-center">
            {/* Refresh Button */}
            <button 
              onClick={fetchRooms}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
              title="Refresh room prices and status"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            
            {/* Quick Stats */}
            <div className="flex gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-center">
                <div className="text-2xl font-bold text-green-600">{availableRooms.length}</div>
                <div className="text-sm text-green-800">Available</div>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-center">
                <div className="text-2xl font-bold text-red-600">{occupiedRooms.length}</div>
                <div className="text-sm text-red-800">Occupied</div>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-center">
                <div className="text-2xl font-bold text-gray-600">{rooms.length}</div>
                <div className="text-sm text-gray-800">Total Rooms</div>
              </div>
            </div>
          </div>
        </div>

        {/* Available Rooms Section */}
        {availableRooms.length > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-xl font-semibold text-green-800 mb-3 flex items-center gap-2">
              <LogIn className="w-5 h-5" />
              Available for Check-In ({availableRooms.length} rooms)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {availableRooms.map((room) => (
                <div key={room.id} className="bg-white border border-green-300 rounded-lg p-3 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-lg">Room {room.room_number}</h4>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full uppercase ${getStatusBadge(room.status)}`}>
                      {room.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 capitalize mb-1">{room.room_type}</p>
                  <p className="text-sm font-medium text-green-600 mb-3">
                    {room.rate && room.rate > 0
                      ? `KES ${Number(room.rate).toLocaleString()}/night` 
                      : <span className="text-red-600">Price not set</span>}
                  </p>
                  <button 
                    onClick={() => handleOpenCheckIn(room)} 
                    className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                  >
                    <LogIn size={16} /> Check-In Guest
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Occupied Rooms Section */}
        {occupiedRooms.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-xl font-semibold text-red-800 mb-3 flex items-center gap-2">
              <LogOut className="w-5 h-5" />
              Occupied Rooms ({occupiedRooms.length} rooms)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {occupiedRooms.map((room) => (
                <div key={room.id} className="bg-white border border-red-300 rounded-lg p-3 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-semibold text-lg">Room {room.room_number}</h4>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full uppercase ${getStatusBadge(room.status)}`}>
                      {room.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 capitalize mb-1">{room.room_type}</p>
                  <p className="text-sm font-medium text-red-600 mb-3">
                    {room.rate && room.rate > 0
                      ? `KES ${Number(room.rate).toLocaleString()}/night` 
                      : <span className="text-red-600">Price not set</span>}
                  </p>
                  <button 
                    onClick={() => handleCheckOut(room)} 
                    disabled={isProcessing}
                    className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <LogOut size={16} /> Check-Out Guest
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Rooms Grid */}
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Bed className="w-5 h-5" />
            All Rooms Overview
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {rooms.map((room) => (
              <div key={room.id} className={`rounded-lg border shadow-sm p-4 flex flex-col ${getStatusColor(room.status)}`}>
                <div className="flex-grow">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold flex items-center">
                      <Bed className="w-5 h-5 mr-2" />
                      Room {room.room_number}
                    </h3>
                    <span className="text-xs font-semibold px-2 py-1 rounded-full uppercase">
                      {room.status}
                    </span>
                  </div>
                  <p className="text-sm font-medium capitalize">{room.room_type}</p>
                  <p className="text-lg font-bold mt-1">
                    {room.rate && room.rate > 0
                      ? `KES ${Number(room.rate).toLocaleString()}` 
                      : <span className="text-red-600">Price not set</span>}
                  </p>
                </div>
                
                <div className="flex items-center gap-3 mt-4 text-xs border-t pt-3">
                  <span className="flex items-center gap-1"><Wifi size={14} /> WiFi</span>
                  <span className="flex items-center gap-1"><Tv size={14} /> TV</span>
                  <span className="flex items-center gap-1"><Wind size={14} /> AC</span>
                </div>
                
                <div className="mt-4">
                  {room.status === 'vacant' && (
                    <button 
                      onClick={() => handleOpenCheckIn(room)} 
                      className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded flex items-center justify-center gap-2 transition-colors"
                    >
                      <LogIn size={16} /> Check-In
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
                          <LogOut size={16} /> Check-Out
                        </>
                      )}
                    </button>
                  )}
                  {room.status === 'cleaning' && (
                    <div className="w-full text-center py-2 px-4 rounded bg-yellow-200 text-yellow-800 text-sm font-medium">
                      Needs Cleaning
                    </div>
                  )}
                  {room.status === 'maintenance' && (
                    <div className="w-full text-center py-2 px-4 rounded bg-gray-200 text-gray-600 text-sm font-medium">
                      Under Maintenance
                    </div>
                  )}
                  {room.status === 'reserved' && (
                    <div className="w-full text-center py-2 px-4 rounded bg-blue-200 text-blue-800 text-sm font-medium">
                      Reserved
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Empty State */}
        {rooms.length === 0 && (
          <div className="text-center py-12">
            <Bed className="w-24 h-24 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Rooms Found</h3>
            <p className="text-gray-500 mb-4">No rooms are currently configured in the system.</p>
            <button 
              onClick={fetchRooms}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
            >
              Refresh
            </button>
          </div>
        )}
      </div>

      {/* Enhanced Check-In Modal */}
      {isCheckInModalOpen && selectedRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <UserPlus className="w-6 h-6 text-blue-600" />
                Check-In to Room {selectedRoom.room_number}
              </h3>
            </div>
            
            {/* Room Details */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Room Type:</span>
                <span className="font-medium capitalize">{selectedRoom.room_type}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-gray-600">Rate:</span>
                <span className="font-medium">
                  {typeof selectedRoom.rate === 'number' && selectedRoom.rate > 0
                    ? `KES ${selectedRoom.rate.toLocaleString()}/night` 
                    : 'Price not set'}
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Guest Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="text" 
                    value={guestName} 
                    onChange={(e) => setGuestName(e.target.value)} 
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    placeholder="Enter guest full name"
                    required 
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Guest Contact (Optional)
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="text" 
                    value={guestContact} 
                    onChange={(e) => setGuestContact(e.target.value)} 
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" 
                    placeholder="Phone number or email"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setCheckInModalOpen(false)} 
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button 
                onClick={handleCheckIn} 
                disabled={!guestName.trim() || isProcessing} 
                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isProcessing ? (
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Checking In...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <LogIn className="w-5 h-5" />
                    Confirm Check-In
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}