import { Request, Response } from 'express';
import db from '../db';

// Get all rooms
export const getRooms = async (req: Request, res: Response) => {
  try {
    // Check if rooms table exists
    const hasRoomsTable = await db.schema.hasTable('rooms');
    if (!hasRoomsTable) {
      return res.json([]); // Return empty array if table doesn't exist
    }

    const rooms = await db('rooms')
      .select('*')
      .orderBy('room_number', 'asc');

    res.json(rooms);
  } catch (err) {
    console.error('Error fetching rooms:', err);
    res.status(500).json({ message: 'Error fetching rooms' });
  }
};

// Update room details
export const updateRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, updated_at: new Date() };

    // Check if room exists
    const existingRoom = await db('rooms').where({ id }).first();
    if (!existingRoom) {
      return res.status(404).json({ message: 'Room not found' });
    }

    const [updatedRoom] = await db('rooms')
      .where({ id })
      .update(updateData)
      .returning('*');

    res.json(updatedRoom);
  } catch (err) {
    console.error('Error updating room:', err);
    res.status(500).json({ message: 'Error updating room' });
  }
};

// Get room by ID
export const getRoomById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const room = await db('rooms').where({ id }).first();

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.json(room);
  } catch (err) {
    console.error('Error fetching room:', err);
    res.status(500).json({ message: 'Error fetching room' });
  }
};

// Create new room
export const createRoom = async (req: Request, res: Response) => {
  try {
    const {
      room_number,
      room_type,
      status,
      rate_per_night,
      max_occupancy,
      amenities,
      floor
    } = req.body;

    // Validation
    if (!room_number || !room_type) {
      return res.status(400).json({ 
        message: 'Room number and room type are required' 
      });
    }

    // Check if room number already exists
    const existingRoom = await db('rooms').where({ room_number }).first();
    if (existingRoom) {
      return res.status(400).json({ 
        message: 'Room number already exists' 
      });
    }

    const [newRoom] = await db('rooms')
      .insert({
        room_number,
        room_type,
        status: status || 'available',
        rate_per_night: rate_per_night || 0,
        max_occupancy: max_occupancy || 1,
        amenities: amenities || '',
        floor: floor || 1,
        
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');

    res.status(201).json(newRoom);

  } catch (err) {
    console.error('Error creating room:', err);
    res.status(500).json({ message: 'Error creating room' });
  }
};

// Delete room
export const deleteRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if room exists
    const existingRoom = await db('rooms').where({ id }).first();
    if (!existingRoom) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Check if room has active bookings
    const activeBookings = await db('room_transactions')
      .where({ room_id: id, status: 'active' })
      .first();

    if (activeBookings) {
      return res.status(400).json({ 
        message: 'Cannot delete room with active bookings' 
      });
    }

    await db('rooms').where({ id }).del();
    res.json({ message: 'Room deleted successfully' });

  } catch (err) {
    console.error('Error deleting room:', err);
    res.status(500).json({ message: 'Error deleting room' });
  }
};

// Check-in guest to room
export const checkInRoom = async (req: Request, res: Response) => {
  const { roomId } = req.params;
  const { guest_name, guest_contact } = req.body;
  const staff_id = req.user!.id;
  
  if (!guest_name) {
    return res.status(400).json({ message: 'Guest name is required.' });
  }
  
  try {
    await db.transaction(async (trx) => {
      const [room] = await trx('rooms')
        .where({ id: roomId, status: 'vacant' })
        .update({ status: 'occupied' })
        .returning('*');
      
      if (!room) {
        throw new Error('Room is not vacant or available for check-in.');
      }
      
      await trx('room_transactions').insert({
        room_id: roomId,
        staff_id,
        guest_name,
        guest_contact,
        status: 'active',
        check_in_time: new Date()
      });
      
      res.json(room);
    });
  } catch (err) {
    res.status(500).json({ 
      message: (err as Error).message || 'Failed to check-in guest.' 
    });
  }
};

// Check-out guest from room
export const checkOutRoom = async (req: Request, res: Response) => {
  const { roomId } = req.params;
  
  try {
    await db.transaction(async (trx) => {
      const [room] = await trx('rooms')
        .where({ id: roomId, status: 'occupied' })
        .update({ status: 'cleaning' })
        .returning('*');
      
      if (!room) {
        throw new Error('Room is not occupied or does not exist.');
      }
      
      await trx('room_transactions')
        .where({ room_id: roomId, status: 'active' })
        .update({
          status: 'completed',
          check_out_time: new Date()
        });
      
      res.json(room);
    });
  } catch (err) {
    res.status(500).json({ 
      message: (err as Error).message || 'Failed to check-out guest.' 
    });
  }
};

// Get room statistics
export const getRoomStats = async (req: Request, res: Response) => {
  try {
    const stats = await Promise.all([
      // Total rooms
      db('rooms').count('* as count').first(),
      
      // Available rooms
      db('rooms').where('status', 'available').count('* as count').first(),
      
      // Occupied rooms
      db('rooms').where('status', 'occupied').count('* as count').first(),
      
      // Maintenance rooms
      db('rooms').where('status', 'maintenance').count('* as count').first(),
      
      // Average occupancy rate today
      db('room_transactions')
        .where('created_at', '>=', new Date(new Date().setHours(0, 0, 0, 0)))
        .where('status', 'active')
        .count('* as count')
        .first()
    ]);

    const [totalRooms, availableRooms, occupiedRooms, maintenanceRooms, activeBookings] = stats;

    const total = parseInt(totalRooms?.count as string) || 0;
    const occupied = parseInt(occupiedRooms?.count as string) || 0;
    const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

    res.json({
      totalRooms: total,
      availableRooms: parseInt(availableRooms?.count as string) || 0,
      occupiedRooms: occupied,
      maintenanceRooms: parseInt(maintenanceRooms?.count as string) || 0,
      occupancyRate,
      activeBookings: parseInt(activeBookings?.count as string) || 0
    });

  } catch (err) {
    console.error('Error fetching room stats:', err);
    res.status(500).json({ message: 'Error fetching room statistics' });
  }
};