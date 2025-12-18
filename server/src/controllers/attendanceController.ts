import { Request, Response } from 'express';
import db from '../db';

// Clock out employee
export const clockOut = async (req: Request, res: Response) => {
  try {
    const { id: staffId } = req.user!;

    const activeLog = await db('attendance_log')
      .where({ staff_id: staffId })
      .whereIn('status', ['clocked_in', 'on_break'])
      .orderBy('clock_in', 'desc')
      .first();

    if (!activeLog) {
      return res.status(400).json({ message: 'No active clock-in found' });
    }

    const clockOut = new Date();
    const clockIn = new Date(activeLog.clock_in);
    const totalHours = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60);

    const [updated] = await db('attendance_log')
      .where({ id: activeLog.id })
      .update({
        clock_out: clockOut.toISOString(),
        total_hours: totalHours.toFixed(2),
        status: 'clocked_out'
      })
      .returning('*');

    // Update shift if associated
    if (activeLog.shift_id) {
      await db('shifts')
        .where({ id: activeLog.shift_id })
        .update({
          actual_end_time: clockOut.toISOString(),
          status: 'completed'
        });
    }

    res.json(updated);
  } catch (err) {
    console.error('Error clocking out:', err);
    res.status(500).json({ message: 'Error clocking out' });
  }
};

// Clock in employee
export const clockIn = async (req: Request, res: Response) => {
  try {
    const { id: staffId } = req.user!;
    const { shift_id } = req.body;

    // Check if already clocked in
    const activeLog = await db('attendance_log')
      .where({ staff_id: staffId })
      .whereIn('status', ['clocked_in', 'on_break'])
      .first();

    if (activeLog) {
      return res.status(400).json({ message: 'Already clocked in' });
    }

    const clockIn = new Date();

    const [newLog] = await db('attendance_log')
      .insert({
        staff_id: staffId,
        shift_id: shift_id || null,
        clock_in: clockIn.toISOString(),
        status: 'clocked_in'
      })
      .returning('*');

    // Update shift if associated
    if (shift_id) {
      await db('shifts')
        .where({ id: shift_id })
        .update({
          actual_start_time: clockIn.toISOString(),
          status: 'in_progress'
        });
    }

    res.json(newLog);
  } catch (err) {
    console.error('Error clocking in:', err);
    res.status(500).json({ message: 'Error clocking in' });
  }
};

// Get attendance history
export const getAttendanceHistory = async (req: Request, res: Response) => {
  try {
    const { 
      staff_id, 
      start_date, 
      end_date,
      limit = 50,
      offset = 0 
    } = req.query;

    const userRole = req.user?.role;
    const userId = req.user?.id;

    // Authorization check
    if (userRole !== 'admin' && userRole !== 'manager' && 
        staff_id && parseInt(staff_id as string) !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    let query = db('attendance_log')
      .join('staff', 'attendance_log.staff_id', 'staff.id')
      .select(
        'attendance_log.*',
        'staff.name as staff_name',
        'staff.role as staff_role'
      )
      .orderBy('attendance_log.clock_in', 'desc')
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    // Apply filters
    if (staff_id) {
      query = query.where('attendance_log.staff_id', staff_id);
    } else if (userRole !== 'admin' && userRole !== 'manager') {
      // Non-admin users can only see their own records
      query = query.where('attendance_log.staff_id', userId);
    }

    if (start_date && end_date) {
      query = query.whereBetween('attendance_log.clock_in', [start_date, end_date]);
    }

    const attendance = await query;
    res.json(attendance);

  } catch (err) {
    console.error('Error fetching attendance history:', err);
    res.status(500).json({ message: 'Error fetching attendance history' });
  }
};

// Get current attendance status
export const getCurrentStatus = async (req: Request, res: Response) => {
  try {
    const { id: staffId } = req.user!;

    const activeLog = await db('attendance_log')
      .where({ staff_id: staffId })
      .whereIn('status', ['clocked_in', 'on_break'])
      .orderBy('clock_in', 'desc')
      .first();

    if (!activeLog) {
      return res.json({ status: 'clocked_out', activeLog: null });
    }

    res.json({ 
      status: activeLog.status, 
      activeLog,
      workedHours: activeLog.clock_in ? 
        ((new Date().getTime() - new Date(activeLog.clock_in).getTime()) / (1000 * 60 * 60)).toFixed(2) : 
        0
    });

  } catch (err) {
    console.error('Error fetching current status:', err);
    res.status(500).json({ message: 'Error fetching current status' });
  }
};