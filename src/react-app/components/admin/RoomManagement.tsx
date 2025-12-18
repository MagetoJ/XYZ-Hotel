import { useState, useEffect } from 'react';
import { Bed, Plus, Edit3, Trash2, User, DollarSign, Calendar } from 'lucide-react';
import { API_URL } from '@/config/api';  // ← ADD THIS

// ← ADD THIS FUNCTION
const formatCurrency = (amount: number): string => {
  return `KES ${amount.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};
// and only send the data the backend expects.
interface Room {
  id: number;
  room_number: string;
  room_type: string;
  status: 'vacant' | 'occupied' | 'reserved' | 'maintenance' | 'cleaning';
  guest_name?: string;
  check_in_date?: string;
  check_out_date?: string;
  rate: number;
  floor?: number;
  max_occupancy?: number;
  amenities?: string[];
}

export default function RoomManagement() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  const [roomForm, setRoomForm] = useState({
    room_number: '',
    room_type: 'Standard',
    rate: 5000,
    floor: 1,
    max_occupancy: 2,
    amenities: [] as string[]
  });

  const [guestForm, setGuestForm] = useState({
    guest_name: '',
    check_in_date: '',
    check_out_date: ''
  });

  const getToken = () => localStorage.getItem('pos_token');

  const fetchRooms = async () => {
    try {
      const response = await fetch('/api/rooms', {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      if (response.ok) {
        const data = await response.json();
        // Map backend rate_per_night to frontend rate, and add floor
        const roomsWithFloor = data.map((r: any) => ({
          ...r, 
          rate: Number(r.rate_per_night) || 0,
          floor: r.floor || parseInt(r.room_number?.toString()?.charAt(0) || '1') || 1
        }));
        setRooms(roomsWithFloor);
      } else {
        console.error("Failed to fetch rooms");
      }
    } catch (error) {
      console.error("Error fetching rooms:", error);
    }
  };

  useEffect(() => {
    fetchRooms();
  }, []);


  const roomTypes = [
    { value: 'Standard', label: 'Standard Room', baseRate: 5000 },
    { value: 'Deluxe', label: 'Deluxe Room', baseRate: 7500 },
    { value: 'Suite', label: 'Suite', baseRate: 12000 }
  ];

  const allAmenities = [
    'WiFi', 'AC', 'TV', 'Mini Bar', 'Coffee Maker', 'Safe',
    'Balcony', 'King Bed', 'Queen Bed', 'Double Bed', 'Sitting Area'
  ];

  const floors = Array.from(new Set((rooms || []).map(r => r.floor!).filter(Boolean))).sort();

  const filteredRooms = (rooms || []).filter(room => {
    const floorMatch = selectedFloor === null || room.floor === selectedFloor;
    const statusMatch = selectedStatus === 'all' || room.status === selectedStatus;
    // Also filter out rooms with invalid rate values
    return floorMatch && statusMatch && room && typeof room.rate !== 'undefined';
  });

  const handleAddRoom = async () => {
    // Map frontend 'rate' to backend 'rate_per_night'
    const { max_occupancy, amenities, rate, ...rest } = roomForm;
    
    const roomDataForApi = {
      ...rest,
      rate_per_night: rate,
      status: 'vacant'
    };

    try {
        const response = await fetch('/api/rooms', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(roomDataForApi)
        });
        if (response.ok) {
            fetchRooms();
            resetRoomForm();
            setShowAddModal(false);
        } else {
            const errorData = await response.json();
            alert(`Failed to add room: ${errorData.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error("Error adding room:", error);
        alert("Error adding room");
    }
  };

  const handleEditRoom = (room: Room) => {
    setEditingRoom(room);
    setRoomForm({
      room_number: room.room_number,
      room_type: room.room_type,
      rate: room.rate,
      floor: room.floor || 1,
      max_occupancy: room.max_occupancy || 2,
      amenities: room.amenities || []
    });
    setShowAddModal(true);
  };

  const handleUpdateRoom = async () => {
    if (!editingRoom) return;

    // Map frontend 'rate' to backend 'rate_per_night'
    const { max_occupancy, amenities, rate, ...rest } = roomForm;
    
    const roomDataForApi = {
      ...rest,
      rate_per_night: rate
    };

    try {
        const response = await fetch(`/api/rooms/${editingRoom.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(roomDataForApi)
        });
        if (response.ok) {
            fetchRooms();
            setEditingRoom(null);
            resetRoomForm();
            setShowAddModal(false);
        } else {
            const errorData = await response.json();
            alert(`Failed to update room: ${errorData.message || 'Unknown error'}`);
        }
    } catch (error) {
        console.error("Error updating room:", error);
        alert("Error updating room");
    }
  };

  const handleDeleteRoom = async (id: number) => {
    if (confirm('Are you sure you want to delete this room?')) {
        try {
            const response = await fetch(`/api/rooms/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            if (response.ok) {
                fetchRooms();
            } else {
                alert("Failed to delete room");
            }
        } catch (error) {
            console.error("Error deleting room:", error);
        }
    }
  };

 const handleCheckIn = async () => {
    if (!selectedRoom) return;

    // This is the data your 'checkInRoom' controller expects
    const checkInData = {
      guest_name: guestForm.guest_name,
      guest_contact: '' // Add guest_contact if your form collects it
    };

    try {
      // Call the correct check-in endpoint
      const response = await fetch(`/api/rooms/${selectedRoom.id}/check-in`, { // <-- FIXED endpoint
        method: 'POST', // <-- FIXED method
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getToken()}`
        },
        body: JSON.stringify(checkInData) // <-- FIXED data
      });

      if (response.ok) {
        fetchRooms();
        setShowGuestModal(false);
        setSelectedRoom(null);
        resetGuestForm();
      } else {
        const errorData = await response.json();
        alert(`Failed to check in guest: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("Error checking in guest:", error);
      alert("Error checking in guest");
    }
  };

 const handleCheckOut = async (roomId: number) => {
    if (confirm('Confirm check out for this room?')) {
      try {
        // Call the correct check-out endpoint
        const response = await fetch(`/api/rooms/${roomId}/check-out`, { // <-- FIXED endpoint
          method: 'POST', // <-- FIXED method
          headers: {
            'Authorization': `Bearer ${getToken()}`
          }
          // No body is needed, the backend controller handles the logic
        });

        if (response.ok) {
          fetchRooms();
        } else {
          const errorData = await response.json();
          alert(`Failed to check out guest: ${errorData.message || 'Unknown error'}`);
        }
      } catch (error) {
        console.error("Error checking out guest:", error);
        alert("Error checking out guest");
      }
    }
  };

  const updateRoomStatus = async (roomId: number, newStatus: Room['status']) => {
    const updatedRoomData = { status: newStatus };
     try {
        const response = await fetch(`/api/rooms/${roomId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(updatedRoomData)
        });
        if (response.ok) {
            fetchRooms();
        } else {
            alert("Failed to update room status");
        }
    } catch (error) {
        console.error("Error updating room status:", error);
    }
  };

  const resetRoomForm = () => {
    setRoomForm({
      room_number: '',
      room_type: 'Standard',
      rate: 5000,
      floor: 1,
      max_occupancy: 2,
      amenities: []
    });
  };

  const resetGuestForm = () => {
    setGuestForm({
      guest_name: '',
      check_in_date: '',
      check_out_date: ''
    });
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      vacant: 'bg-green-100 text-green-800',
      occupied: 'bg-blue-100 text-blue-800',
      reserved: 'bg-yellow-100 text-yellow-800',
      maintenance: 'bg-red-100 text-red-800',
      cleaning: 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getRoomTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      Standard: 'bg-blue-100 text-blue-800',
      Deluxe: 'bg-purple-100 text-purple-800',
      Suite: 'bg-orange-100 text-orange-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const totalRevenue = (rooms || [])
    .filter(r => r && r.status === 'occupied' && typeof r.rate !== 'undefined')
    .reduce((sum, r) => sum + (Number(r.rate) || 0), 0);

  const occupancyRate = (rooms || []).length > 0 ? (((rooms || []).filter(r => r && r.status === 'occupied').length / (rooms || []).length) * 100).toFixed(1) : "0.0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>2
          <h2 className="text-2xl font-bold text-gray-900">Room Management</h2>
          <p className="text-gray-600">Manage rooms, reservations, and guest information</p>
        </div>
        <button
          onClick={() => { setEditingRoom(null); resetRoomForm(); setShowAddModal(true);}}
          className="flex items-center gap-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Room
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{rooms.length}</div>
          <div className="text-sm text-gray-600">Total Rooms</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-green-600">{rooms.filter(r => r.status === 'occupied').length}</div>
          <div className="text-sm text-gray-600">Occupied Rooms</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-purple-600">{occupancyRate}%</div>
          <div className="text-sm text-gray-600">Occupancy Rate</div>
        </div>
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalRevenue)}</div>
          <div className="text-sm text-gray-600">Daily Revenue</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <div className="flex gap-4 flex-wrap">
          <div className="flex gap-2">
            <span className="text-sm font-medium text-gray-700 py-2">Floor:</span>
            <button
              onClick={() => setSelectedFloor(null)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedFloor === null
                  ? 'bg-yellow-400 text-yellow-900'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {floors.map(floor => (
              <button
                key={floor}
                onClick={() => setSelectedFloor(floor)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  selectedFloor === floor
                    ? 'bg-yellow-400 text-yellow-900'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Floor {floor}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <span className="text-sm font-medium text-gray-700 py-2">Status:</span>
            {['all', 'vacant', 'occupied', 'reserved', 'maintenance', 'cleaning'].map(status => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors capitalize ${
                  selectedStatus === status
                    ? 'bg-yellow-400 text-yellow-900'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Rooms Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest Info</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredRooms.map((room) => (
                <tr key={room.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                        <Bed className="w-5 h-5 text-white" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">Room {room.room_number}</div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getRoomTypeColor(room.room_type)}`}>
                            {room.room_type}
                          </span>
                          <span className="text-xs text-gray-500">Floor {room.floor}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {room.guest_name ? (
                      <div className="flex items-center">
                        <User className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{room.guest_name}</div>
                          <div className="text-xs text-gray-500">Max {room.max_occupancy} guests</div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">No guest</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {room.check_in_date && room.check_out_date ? (
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                        <div>
                          <div>Check-in: {new Date(room.check_in_date).toLocaleDateString()}</div>
                          <div>Check-out: {new Date(room.check_out_date).toLocaleDateString()}</div>
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-500">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 text-gray-400 mr-1" />
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(room?.rate ?? 0)}</span>
                    </div>
                    <div className="text-xs text-gray-500">per night</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={room.status}
                      onChange={(e) => updateRoomStatus(room.id, e.target.value as Room['status'])}
                      className={`text-xs px-2 py-1 rounded-md border-none ${getStatusColor(room.status)}`}
                    >
                      <option value="vacant">Vacant</option>
                      <option value="occupied">Occupied</option>
                      <option value="reserved">Reserved</option>
                      <option value="maintenance">Maintenance</option>
                      <option value="cleaning">Cleaning</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      {room.status === 'vacant' && (
                        <button
                          onClick={() => {
                            setSelectedRoom(room);
                            setShowGuestModal(true);
                          }}
                          className="text-green-600 hover:text-green-900 text-xs bg-green-100 px-2 py-1 rounded"
                        >
                          Check In
                        </button>
                      )}
                      {room.status === 'occupied' && (
                        <button
                          onClick={() => handleCheckOut(room.id)}
                          className="text-blue-600 hover:text-blue-900 text-xs bg-blue-100 px-2 py-1 rounded"
                        >
                          Check Out
                        </button>
                      )}
                      <button
                        onClick={() => handleEditRoom(room)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteRoom(room.id)}
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

      {/* Add/Edit Room Modal */}
      {(showAddModal || editingRoom) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {editingRoom ? 'Edit Room' : 'Add New Room'}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
                  <input
                    type="text"
                    value={roomForm.room_number}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, room_number: e.target.value, floor: parseInt(e.target.value.charAt(0)) || 1 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
                  <input
                    type="number"
                    value={roomForm.floor}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent bg-gray-100"
                    min="1"
                    max="10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
                <select
                  value={roomForm.room_type}
                  onChange={(e) => {
                    const type = roomTypes.find(t => t.value === e.target.value);
                    setRoomForm(prev => ({
                      ...prev,
                      room_type: e.target.value,
                      rate: type?.baseRate || 5000,
                      max_occupancy: type?.value === 'Suite' ? 4 : type?.value === 'Deluxe' ? 3 : 2
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                >
                  {roomTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate per Night (KES)</label>
                  <input
                    type="number"
                    value={roomForm.rate}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, rate: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    min="0"
                    step="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Occupancy</label>
                  <input
                    type="number"
                    value={roomForm.max_occupancy}
                    onChange={(e) => setRoomForm(prev => ({ ...prev, max_occupancy: parseInt(e.target.value) || 2 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    min="1"
                    max="6"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amenities</label>
                <div className="grid grid-cols-2 gap-2">
                  {allAmenities.map(amenity => (
                    <label key={amenity} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={roomForm.amenities.includes(amenity)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setRoomForm(prev => ({ ...prev, amenities: [...prev.amenities, amenity] }));
                          } else {
                            setRoomForm(prev => ({ ...prev, amenities: prev.amenities.filter(a => a !== amenity) }));
                          }
                        }}
                        className="rounded text-yellow-600 focus:ring-yellow-500 mr-2"
                      />
                      <span className="text-sm text-gray-700">{amenity}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setEditingRoom(null);
                  setShowAddModal(false);
                  resetRoomForm();
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={editingRoom ? handleUpdateRoom : handleAddRoom}
                disabled={!roomForm.room_number}
                className="flex-1 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingRoom ? 'Update' : 'Add'} Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Guest Check-in Modal */}
      {showGuestModal && selectedRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Check In - Room {selectedRoom.room_number}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Guest Name</label>
                <input
                  type="text"
                  value={guestForm.guest_name}
                  onChange={(e) => setGuestForm(prev => ({ ...prev, guest_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check-in Date</label>
                  <input
                    type="date"
                    value={guestForm.check_in_date}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, check_in_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check-out Date</label>
                  <input
                    type="date"
                    value={guestForm.check_out_date}
                    onChange={(e) => setGuestForm(prev => ({ ...prev, check_out_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    min={guestForm.check_in_date}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowGuestModal(false);
                  setSelectedRoom(null);
                  resetGuestForm();
                }}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCheckIn}
                disabled={!guestForm.guest_name || !guestForm.check_in_date || !guestForm.check_out_date}
                className="flex-1 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Check In Guest
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}