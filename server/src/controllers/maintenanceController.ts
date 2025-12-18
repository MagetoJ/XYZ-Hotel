import { Request, Response } from 'express';
import db from '../db';

export interface MaintenanceRequest {
  id: number;
  room_id: number;
  room_number: string;
  issue: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  reported_by: string;
  reported_at: Date;
  completed_at?: Date;
}

// Get all maintenance requests
export const getMaintenanceRequests = async (req: Request, res: Response) => {
  try {
    const requests = await db('maintenance_requests')
      .leftJoin('rooms', 'maintenance_requests.room_id', 'rooms.id')
      .select(
        'maintenance_requests.*',
        'rooms.room_type'
      )
      .orderBy('maintenance_requests.reported_at', 'desc');

    res.json(requests);
  } catch (error) {
    console.error('Error fetching maintenance requests:', error);
    res.status(500).json({ 
      message: 'Error fetching maintenance requests',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get maintenance request by ID
export const getMaintenanceRequestById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const request = await db('maintenance_requests')
      .leftJoin('rooms', 'maintenance_requests.room_id', 'rooms.id')
      .select(
        'maintenance_requests.*',
        'rooms.room_type'
      )
      .where('maintenance_requests.id', id)
      .first();

    if (!request) {
      return res.status(404).json({ message: 'Maintenance request not found' });
    }

    res.json(request);
  } catch (error) {
    console.error('Error fetching maintenance request:', error);
    res.status(500).json({ 
      message: 'Error fetching maintenance request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Create new maintenance request
export const createMaintenanceRequest = async (req: Request, res: Response) => {
  try {
    const { room_id, room_number, issue, priority = 'medium' } = req.body;
    const reported_by = (req as any).user?.username || 'system';

    if (!room_id || !room_number || !issue) {
      return res.status(400).json({ 
        message: 'Room ID, room number, and issue are required' 
      });
    }

    const [request] = await db('maintenance_requests')
      .insert({
        room_id,
        room_number,
        issue,
        priority,
        status: 'pending',
        reported_by,
        reported_at: new Date()
      })
      .returning('*');

    res.status(201).json({ 
      message: 'Maintenance request created successfully',
      request
    });
  } catch (error) {
    console.error('Error creating maintenance request:', error);
    res.status(500).json({ 
      message: 'Error creating maintenance request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Update maintenance request
export const updateMaintenanceRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    // Don't allow updating certain fields
    delete updates.id;
    delete updates.reported_by;
    delete updates.reported_at;

    // If status is being updated to completed, set completed_at
    if (updates.status === 'completed' && !updates.completed_at) {
      updates.completed_at = new Date();
    }

    const [updatedRequest] = await db('maintenance_requests')
      .where('id', id)
      .update(updates)
      .returning('*');

    if (!updatedRequest) {
      return res.status(404).json({ message: 'Maintenance request not found' });
    }

    res.json({ 
      message: 'Maintenance request updated successfully',
      request: updatedRequest
    });
  } catch (error) {
    console.error('Error updating maintenance request:', error);
    res.status(500).json({ 
      message: 'Error updating maintenance request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Delete maintenance request
export const deleteMaintenanceRequest = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const deletedCount = await db('maintenance_requests')
      .where('id', id)
      .del();

    if (deletedCount === 0) {
      return res.status(404).json({ message: 'Maintenance request not found' });
    }

    res.json({ message: 'Maintenance request deleted successfully' });
  } catch (error) {
    console.error('Error deleting maintenance request:', error);
    res.status(500).json({ 
      message: 'Error deleting maintenance request',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};