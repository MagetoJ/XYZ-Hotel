import { Request, Response } from 'express';
import db from '../db';

// Get user's shifts
export const getMyShifts = async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Check if shifts table exists
    const hasShiftsTable = await db.schema.hasTable('shifts');
    if (!hasShiftsTable) {
      return res.json([]); // Return empty array if table doesn't exist
    }

    let query = db('shifts').where({ staff_id: userId });

    if (start_date && end_date) {
      query = query.whereBetween('shift_date', [start_date as string, end_date as string]);
    }

    const shifts = await query
      .orderBy('shift_date', 'asc')
      .orderBy('start_time', 'asc');

    res.json(shifts);
  } catch (err) {
    console.error('Error fetching shifts:', err);
    res.status(500).json({ 
      message: 'Error fetching shifts', 
      error: (err as Error).message 
    });
  }
};

// Get all shifts (admin/manager only)
export const getAllShifts = async (req: Request, res: Response) => {
  try {
    // Check if shifts table exists
    const hasShiftsTable = await db.schema.hasTable('shifts');
    if (!hasShiftsTable) {
      return res.json([]); // Return empty array if table doesn't exist
    }

    const { start_date, end_date, staff_id } = req.query;
    
    let query = db('shifts')
      .join('staff', 'shifts.staff_id', 'staff.id')
      .select('shifts.*', 'staff.name as staff_name', 'staff.role as staff_role');

    if (start_date && end_date) {
      query = query.whereBetween('shift_date', [start_date as string, end_date as string]);
    }

    if (staff_id) {
      query = query.where('shifts.staff_id', staff_id);
    }

    const shifts = await query
      .orderBy('shift_date', 'asc')
      .orderBy('start_time', 'asc');

    res.json(shifts);
  } catch (err) {
    console.error('Error fetching shifts:', err);
    res.status(500).json({ 
      message: 'Error fetching shifts', 
      error: (err as Error).message 
    });
  }
};

// Create new shift
export const createShift = async (req: Request, res: Response) => {
  try {
    const {
      staff_id,
      shift_date,
      start_time,
      end_time,
      shift_type,
      notes
    } = req.body;

    // Validation
    if (!staff_id || !shift_date || !start_time || !end_time) {
      return res.status(400).json({ 
        message: 'Staff ID, shift date, start time, and end time are required' 
      });
    }

    // Check for overlapping shifts
    const overlappingShift = await db('shifts')
      .where({ staff_id, shift_date })
      .where(function() {
        this.whereBetween('start_time', [start_time, end_time])
          .orWhereBetween('end_time', [start_time, end_time])
          .orWhere(function() {
            this.where('start_time', '<=', start_time)
              .andWhere('end_time', '>=', end_time);
          });
      })
      .first();

    if (overlappingShift) {
      return res.status(400).json({ 
        message: 'Staff member already has a shift during this time period' 
      });
    }

    const [newShift] = await db('shifts')
      .insert({
        staff_id,
        shift_date,
        start_time,
        end_time,
        shift_type: shift_type || 'regular',
        notes: notes || '',
        status: 'scheduled',
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');

    res.status(201).json(newShift);
  } catch (err) {
    console.error('Error creating shift:', err);
    res.status(500).json({ 
      message: 'Error creating shift', 
      error: (err as Error).message 
    });
  }
};

// Update shift
export const updateShift = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, updated_at: new Date() };

    // Check if shift exists
    const existingShift = await db('shifts').where({ id }).first();
    if (!existingShift) {
      return res.status(404).json({ message: 'Shift not found' });
    }

    // If updating times or date, check for overlaps
    if (updateData.shift_date || updateData.start_time || updateData.end_time) {
      const shiftDate = updateData.shift_date || existingShift.shift_date;
      const startTime = updateData.start_time || existingShift.start_time;
      const endTime = updateData.end_time || existingShift.end_time;
      const staffId = updateData.staff_id || existingShift.staff_id;

      const overlappingShift = await db('shifts')
        .where({ staff_id: staffId, shift_date: shiftDate })
        .whereNot({ id })
        .where(function() {
          this.whereBetween('start_time', [startTime, endTime])
            .orWhereBetween('end_time', [startTime, endTime])
            .orWhere(function() {
              this.where('start_time', '<=', startTime)
                .andWhere('end_time', '>=', endTime);
            });
        })
        .first();

      if (overlappingShift) {
        return res.status(400).json({ 
          message: 'Staff member already has a shift during this time period' 
        });
      }
    }

    const [updatedShift] = await db('shifts')
      .where({ id })
      .update(updateData)
      .returning('*');

    res.json(updatedShift);
  } catch (err) {
    console.error('Error updating shift:', err);
    res.status(500).json({ 
      message: 'Error updating shift', 
      error: (err as Error).message 
    });
  }
};

// Delete shift
export const deleteShift = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if shift exists
    const existingShift = await db('shifts').where({ id }).first();
    if (!existingShift) {
      return res.status(404).json({ message: 'Shift not found' });
    }

    // Check if shift has associated attendance records
    const attendanceRecords = await db('attendance_log')
      .where({ shift_id: id })
      .first();

    if (attendanceRecords) {
      return res.status(400).json({ 
        message: 'Cannot delete shift with attendance records' 
      });
    }

    await db('shifts').where({ id }).del();
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting shift:', err);
    res.status(500).json({ 
      message: 'Error deleting shift', 
      error: (err as Error).message 
    });
  }
};