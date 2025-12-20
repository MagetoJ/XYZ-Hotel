import { Request, Response } from 'express';
import db from '../db';

interface AuthRequest extends Request {
  user?: { id: number; username: string; role: string };
}

export const getLogs = async (req: AuthRequest, res: Response) => {
  try {
    const logs = await db('handover_logs')
      .join('staff', 'handover_logs.staff_id', 'staff.id')
      .select(
        'handover_logs.id',
        'handover_logs.message',
        'handover_logs.shift_type',
        'handover_logs.is_resolved',
        'handover_logs.created_at',
        'staff.name as staff_name',
        'staff.username as staff_username'
      )
      .orderBy('handover_logs.created_at', 'desc')
      .limit(20);

    res.json(logs);
  } catch (error: any) {
    console.error('Error fetching handover logs:', error);
    res.status(500).json({ message: 'Failed to fetch handover logs', error: error.message });
  }
};

export const createLog = async (req: AuthRequest, res: Response) => {
  try {
    const { message, shift_type = 'Daily' } = req.body;
    const staff_id = req.user?.id;

    if (!staff_id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'Message cannot be empty' });
    }

    const [newLog] = await db('handover_logs')
      .insert({
        staff_id,
        message: message.trim(),
        shift_type,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('*');

    const logWithStaff = await db('handover_logs')
      .join('staff', 'handover_logs.staff_id', 'staff.id')
      .select(
        'handover_logs.id',
        'handover_logs.message',
        'handover_logs.shift_type',
        'handover_logs.is_resolved',
        'handover_logs.created_at',
        'staff.name as staff_name',
        'staff.username as staff_username'
      )
      .where('handover_logs.id', newLog.id)
      .first();

    res.status(201).json(logWithStaff);
  } catch (error: any) {
    console.error('Error creating handover log:', error);
    res.status(500).json({ message: 'Failed to create handover log', error: error.message });
  }
};

export const markResolved = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: 'Log ID is required' });
    }

    const [updated] = await db('handover_logs')
      .where('id', id)
      .update({
        is_resolved: true,
        updated_at: new Date(),
      })
      .returning('*');

    if (!updated) {
      return res.status(404).json({ message: 'Handover log not found' });
    }

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating handover log:', error);
    res.status(500).json({ message: 'Failed to update handover log', error: error.message });
  }
};

export const deleteLog = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const staff_id = req.user?.id;

    if (!id) {
      return res.status(400).json({ message: 'Log ID is required' });
    }

    const log = await db('handover_logs').where('id', id).first();

    if (!log) {
      return res.status(404).json({ message: 'Handover log not found' });
    }

    if (log.staff_id !== staff_id) {
      return res.status(403).json({ message: 'Cannot delete another user\'s handover log' });
    }

    await db('handover_logs').where('id', id).delete();

    res.json({ message: 'Handover log deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting handover log:', error);
    res.status(500).json({ message: 'Failed to delete handover log', error: error.message });
  }
};
