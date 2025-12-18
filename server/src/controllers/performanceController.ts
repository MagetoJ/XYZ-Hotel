import { Request, Response } from 'express';
import db from '../db';

// Get individual staff performance
export const getStaffPerformance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { start_date, end_date } = req.query;
    const requestingUserId = req.user?.id;

    // Users can only view their own performance unless they're admin/manager
    if (Number(id) !== requestingUserId && 
        !['admin', 'manager'].includes(req.user?.role || '')) {
      return res.status(403).json({ message: 'Unauthorized to view this performance data' });
    }

    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    // Get basic staff info
    const staff = await db('staff').where('id', id).first();
    if (!staff) {
      return res.status(404).json({ message: 'Staff member not found' });
    }

    // Get order statistics
    const orderStats = await db('orders')
      .where('staff_id', id)
      .whereBetween('created_at', [`${startDate} 00:00:00`, `${endDate} 23:59:59`])
      .select(
        db.raw('COUNT(*) as total'),
        db.raw('COUNT(CASE WHEN status = \'completed\' THEN 1 END) as completed'),
        db.raw('COUNT(CASE WHEN status = \'cancelled\' THEN 1 END) as cancelled'),
        db.raw('COALESCE(SUM(total_amount), 0) as total_sales'),
        db.raw('COALESCE(AVG(total_amount), 0) as avg_order_value'),
        db.raw('COALESCE(SUM(service_charge), 0) as total_tips')
      )
      .first();

    // Calculate completion rate
    const completionRate = orderStats.total > 0 
      ? ((orderStats.completed / orderStats.total) * 100).toFixed(1)
      : '0.0';

    // Get shift statistics (if shifts table exists)
    let shiftStats = {
      totalShifts: 0,
      totalHours: '0.0',
      punctualityScore: 100
    };

    try {
      const hasShiftsTable = await db.schema.hasTable('shifts');
      if (hasShiftsTable) {
        const shifts = await db('shifts')
          .where('staff_id', id)
          .whereBetween('shift_date', [startDate, endDate])
          .select('*');

        shiftStats.totalShifts = shifts.length;
        
        // Calculate total hours worked (simplified calculation)
        let totalMinutes = 0;
        shifts.forEach(shift => {
          if (shift.start_time && shift.end_time) {
            const start = new Date(`2000-01-01 ${shift.start_time}`);
            const end = new Date(`2000-01-01 ${shift.end_time}`);
            const diffMs = end.getTime() - start.getTime();
            totalMinutes += diffMs / (1000 * 60);
          }
        });
        
        shiftStats.totalHours = (totalMinutes / 60).toFixed(1);
      }
    } catch (error) {
      console.warn('Could not fetch shift statistics:', error);
    }

    const performanceData = {
      period: { start: startDate, end: endDate },
      orders: {
        total: Number(orderStats.total) || 0,
        completed: Number(orderStats.completed) || 0,
        cancelled: Number(orderStats.cancelled) || 0,
        completionRate: completionRate
      },
      financial: {
        totalSales: Number(orderStats.total_sales) || 0,
        avgOrderValue: Number(orderStats.avg_order_value) || 0,
        totalTips: Number(orderStats.total_tips) || 0
      },
      service: {
        avgRating: '4.5', // Placeholder - would need rating system
        avgServiceTime: '15 min' // Placeholder - would need timing data
      },
      attendance: shiftStats
    };

    res.json(performanceData);
  } catch (error) {
    console.error('Staff performance error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get all staff performance (admin/manager only)
export const getAllStaffPerformance = async (req: Request, res: Response) => {
  try {
    const { start_date, end_date, role } = req.query;
    
    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    let staffQuery = db('staff')
      .where('is_active', true)
      .select('id', 'name', 'role', 'employee_id');

    if (role && role !== 'all') {
      staffQuery = staffQuery.where('role', role as string);
    }

    const allStaff = await staffQuery;
    
    const performanceData = await Promise.all(
      allStaff.map(async (staff) => {
        const orderStats = await db('orders')
          .where('staff_id', staff.id)
          .whereBetween('created_at', [`${startDate} 00:00:00`, `${endDate} 23:59:59`])
          .select(
            db.raw('COUNT(*) as total_orders'),
            db.raw('COUNT(CASE WHEN status = \'completed\' THEN 1 END) as completed_orders'),
            db.raw('COALESCE(SUM(total_amount), 0) as total_sales'),
            db.raw('COALESCE(AVG(total_amount), 0) as avg_order_value')
          )
          .first();

        return {
          staffId: staff.id,
          name: staff.name,
          role: staff.role,
          employeeId: staff.employee_id || '',
          totalOrders: Number(orderStats.total_orders) || 0,
          completedOrders: Number(orderStats.completed_orders) || 0,
          totalSales: Number(orderStats.total_sales) || 0,
          avgOrderValue: Number(orderStats.avg_order_value) || 0,
          avgRating: '4.5' // Placeholder
        };
      })
    );

    res.json(performanceData);
  } catch (error) {
    console.error('All staff performance error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get waiter performance (receptionist, admin, manager)
export const getWaiterPerformance = async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    
    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = end_date || new Date().toISOString().split('T')[0];

    const waiters = await db('staff')
      .where({ role: 'waiter', is_active: true })
      .select('id', 'name', 'employee_id');
    
    const performanceData = await Promise.all(
      waiters.map(async (waiter) => {
        const orderStats = await db('orders')
          .where('staff_id', waiter.id)
          .whereBetween('created_at', [`${startDate} 00:00:00`, `${endDate} 23:59:59`])
          .select(
            db.raw('COUNT(*) as total_orders'),
            db.raw('COUNT(CASE WHEN status = \'completed\' THEN 1 END) as completed_orders'),
            db.raw('COALESCE(SUM(total_amount), 0) as total_sales')
          )
          .first();

        return {
          staffId: waiter.id,
          name: waiter.name,
          employeeId: waiter.employee_id || '',
          totalOrders: Number(orderStats.total_orders) || 0,
          completedOrders: Number(orderStats.completed_orders) || 0,
          totalSales: Number(orderStats.total_sales) || 0,
          avgRating: '4.5' // Placeholder
        };
      })
    );

    res.json(performanceData);
  } catch (error) {
    console.error('Waiter performance error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};