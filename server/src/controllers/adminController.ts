import { Request, Response } from 'express';
import db from '../db';

// Get active users (logged in within last 24 hours)
export const getActiveUsers = async (req: Request, res: Response) => {
  try {
    const activeUsers = await db('user_sessions as us')
      .join('staff as s', 'us.user_id', 's.id')
      .select(
        's.id',
        's.name',
        's.role',
        'us.login_time'
      )
      .where('us.is_active', true)
      .where('us.login_time', '>', new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
      .orderBy('us.login_time', 'desc');

    res.json(activeUsers);
  } catch (error) {
    console.error('Get active users error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get user sessions (both active and recent inactive)
export const getUserSessions = async (req: Request, res: Response) => {
  try {
    // First, clean up stale sessions (older than 8 hours with no logout)
    const staleSessionCutoff = new Date(Date.now() - 8 * 60 * 60 * 1000); // 8 hours ago
    await db('user_sessions')
      .where('is_active', true)
      .where('login_time', '<', staleSessionCutoff)
      .whereNull('logout_time')
      .update({
        is_active: false,
        logout_time: new Date(),
        updated_at: new Date()
      });

    // Get latest session for each user within the last 24 hours
    const userSessions = await db('user_sessions as us')
      .join('staff as s', 'us.user_id', 's.id')
      .select(
        's.id as staff_id',
        's.name',
        's.role',
        'us.login_time',
        'us.logout_time',
        'us.is_active'
      )
      .where('us.login_time', '>', new Date(Date.now() - 24 * 60 * 60 * 1000)) // Last 24 hours
      .whereIn('us.id', function() {
        this.select(db.raw('MAX(id)'))
          .from('user_sessions')
          .where('login_time', '>', new Date(Date.now() - 24 * 60 * 60 * 1000))
          .groupBy('user_id');
      })
      .orderBy('us.login_time', 'desc');

    res.json(userSessions);
  } catch (error) {
    console.error('Get user sessions error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get low stock alerts
export const getLowStockAlerts = async (req: Request, res: Response) => {
  try {
    const lowStockItems = await db('inventory_items')
      .select('id', 'name', 'current_stock', 'minimum_stock', 'inventory_type', 'unit')
      .whereRaw('current_stock <= minimum_stock')
      .where('is_active', true)
      .orderBy('inventory_type')
      .orderBy('name');

    res.json(lowStockItems);
  } catch (error) {
    console.error('Get low stock alerts error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get user session history (optional - for more detailed session tracking)
export const getUserSessionHistory = async (req: Request, res: Response) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    
    const sessions = await db('user_sessions as us')
      .join('staff as s', 'us.user_id', 's.id')
      .select(
        'us.id',
        's.name',
        's.username',
        's.role',
        'us.login_time',
        'us.logout_time',
        'us.is_active'
      )
      .orderBy('us.login_time', 'desc')
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    const totalCount = await db('user_sessions').count('id as count').first();

    res.json({
      sessions,
      totalCount: parseInt(totalCount?.count as string) || 0,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string)
    });
  } catch (error) {
    console.error('Get user session history error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};