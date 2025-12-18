import { Request, Response } from 'express';
import db from '../db';

// Get dashboard overview statistics
export const getOverviewStats = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's orders and revenue
    const todaysOrders = await db('orders')
      .where('created_at', '>=', today)
      .select('*');

    const todaysRevenue = todaysOrders.reduce(
      (sum, order) => sum + (order.total_amount || 0), 
      0
    );

    // Get active staff count
    const activeStaff = await db('staff')
      .where({ is_active: true })
      .count('* as count')
      .first();

    // Get low stock items count
    const lowStock = await db('inventory_items')
      .whereRaw('current_stock <= minimum_stock')
      .count('* as count')
      .first();

    // Get recent orders with location information
    const recentOrders = await db('orders')
      .orderBy('created_at', 'desc')
      .limit(5)
      .select('id', 'order_number', 'order_type', 'table_id', 'room_id', 'total_amount', 'status', 'created_at')
      .then(orders => orders.map(order => ({
        ...order,
        location: order.order_type === 'table' 
          ? `Table ${order.table_id}` 
          : order.order_type === 'room' 
            ? `Room ${order.room_id}` 
            : order.order_type
      })));
    
    res.json({
      todaysRevenue,
      ordersToday: todaysOrders.length,
      activeStaff: (activeStaff as any)?.count || 0,
      lowStockItems: (lowStock as any)?.count || 0,
      recentOrders: recentOrders || []
    });

  } catch (err) {
    console.error('Error fetching overview stats:', err);
    res.status(500).json({ message: 'Error fetching overview stats' });
  }
};

// Get sales analytics
export const getSalesAnalytics = async (req: Request, res: Response) => {
  try {
    const { period = '7' } = req.query; // Default to last 7 days
    const days = parseInt(period as string);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Daily sales for the period
    const dailySales = await db('orders')
      .select(
        db.raw('DATE(created_at) as date'),
        db.raw('COUNT(*) as order_count'),
        db.raw('SUM(total_amount) as revenue')
      )
      .where('created_at', '>=', startDate)
      .where('status', 'completed')
      .groupBy(db.raw('DATE(created_at)'))
      .orderBy('date', 'asc');

    // Sales by category
    const salesByCategory = await db('order_items')
      .join('orders', 'order_items.order_id', 'orders.id')
      .join('products', 'order_items.product_id', 'products.id')
      .leftJoin('categories', 'products.category_id', 'categories.id')
      .select('products.category_id', 'categories.name as category_name')
      .sum('order_items.total_price as total')
      .count('order_items.id as items_sold')
      .where('orders.created_at', '>=', startDate)
      .where('orders.status', 'completed')
      .groupBy('products.category_id', 'categories.id', 'categories.name')
      .orderBy('total', 'desc');

    // Top selling products
    const topProducts = await db('order_items')
      .join('orders', 'order_items.order_id', 'orders.id')
      .join('products', 'order_items.product_id', 'products.id')
      .leftJoin('categories', 'products.category_id', 'categories.id')
      .select('products.name', 'products.category_id', 'categories.name as category_name')
      .sum('order_items.quantity as quantity_sold')
      .sum('order_items.total_price as revenue')
      .where('orders.created_at', '>=', startDate)
      .where('orders.status', 'completed')
      .groupBy('products.id', 'products.name', 'products.category_id', 'categories.id', 'categories.name')
      .orderBy('quantity_sold', 'desc')
      .limit(10);

    res.json({
      dailySales,
      salesByCategory,
      topProducts,
      period: `${days} days`
    });

  } catch (err) {
    console.error('Error fetching sales analytics:', err);
    res.status(500).json({ message: 'Error fetching sales analytics' });
  }
};

// Get inventory analytics
export const getInventoryAnalytics = async (req: Request, res: Response) => {
  try {
    // Inventory value by type
    const inventoryByType = await db('inventory_items')
      .select('inventory_type')
      .sum('current_stock * cost_per_unit as total_value')
      .count('* as item_count')
      .where('is_active', true)
      .groupBy('inventory_type');

    // Low stock alerts
    const lowStockItems = await db('inventory_items')
      .select('name', 'current_stock', 'minimum_stock', 'inventory_type')
      .whereRaw('current_stock <= minimum_stock')
      .where('is_active', true)
      .orderBy('current_stock', 'asc');

    // Recent inventory updates
    const recentUpdates = await db('inventory_items')
      .select('name', 'current_stock', 'updated_at', 'inventory_type')
      .where('is_active', true)
      .orderBy('updated_at', 'desc')
      .limit(10);

    res.json({
      inventoryByType,
      lowStockItems,
      recentUpdates
    });

  } catch (err) {
    console.error('Error fetching inventory analytics:', err);
    res.status(500).json({ message: 'Error fetching inventory analytics' });
  }
};

// Get staff performance analytics
export const getStaffPerformance = async (req: Request, res: Response) => {
  try {
    const { period = '30' } = req.query; // Default to last 30 days
    const days = parseInt(period as string);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // Orders processed by staff
    const staffPerformance = await db('orders')
      .join('staff', 'orders.staff_id', 'staff.id')
      .select('staff.name', 'staff.role')
      .count('orders.id as orders_processed')
      .sum('orders.total_amount as total_sales')
      .where('orders.created_at', '>=', startDate)
      .where('orders.status', 'completed')
      .groupBy('staff.id', 'staff.name', 'staff.role')
      .orderBy('orders_processed', 'desc');

    // Attendance summary
    const attendanceSummary = await db('attendance_log')
      .join('staff', 'attendance_log.staff_id', 'staff.id')
      .select('staff.name', 'staff.role')
      .sum('attendance_log.total_hours as total_hours')
      .count('attendance_log.id as days_worked')
      .where('attendance_log.clock_in', '>=', startDate)
      .where('attendance_log.status', 'clocked_out')
      .groupBy('staff.id', 'staff.name', 'staff.role')
      .orderBy('total_hours', 'desc');

    res.json({
      staffPerformance,
      attendanceSummary,
      period: `${days} days`
    });

  } catch (err) {
    console.error('Error fetching staff performance:', err);
    res.status(500).json({ message: 'Error fetching staff performance' });
  }
};