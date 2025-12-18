import { Request, Response } from 'express';
import db from '../db';

// Sell bar inventory item
export const sellBarItem = async (req: Request, res: Response) => {
  const { inventory_item_id, quantity, unit_price, payment_method } = req.body;
  const staff_id = req.user?.id;

  if (!inventory_item_id || !quantity || !unit_price || !payment_method) {
    return res.status(400).json({ 
      message: 'Item ID, quantity, price, and payment method are required.' 
    });
  }

  try {
    const item = await db('inventory_items')
      .where({ id: inventory_item_id, inventory_type: 'bar' })
      .first();

    if (!item) {
      return res.status(404).json({ message: 'Bar inventory item not found.' });
    }

    if (item.current_stock < quantity) {
      return res.status(400).json({ message: 'Not enough stock available.' });
    }

    const newStock = item.current_stock - quantity;
    const total_amount = quantity * unit_price;
    const order_number = `BAR-${Date.now()}`;

    await db.transaction(async (trx) => {
      // Update inventory stock
      await trx('inventory_items')
        .where({ id: inventory_item_id })
        .update({ 
          current_stock: newStock
        });

      // Create order record
      const [order] = await trx('orders').insert({
        order_number,
        order_type: 'bar_sale',
        status: 'completed',
        staff_id,
        total_amount,
        payment_status: 'paid'
      }).returning('id');

      // Create payment record
      await trx('payments').insert({
        order_id: order.id || order,
        payment_method,
        amount: total_amount,
        status: 'completed'
      });

      // Create order item record
      await trx('order_items').insert({
        order_id: order.id || order,
        product_id: inventory_item_id,
        quantity,
        unit_price,
        total_price: total_amount,
        notes: item.name // Store item name in notes field
      });
    });
    
    res.status(200).json({ 
      message: 'Bar item sold successfully.', 
      order_number,
      new_stock: newStock,
      total_amount,
      payment_method
    });

  } catch (err) {
    console.error('Bar sale error:', err);
    res.status(500).json({ message: 'Failed to process bar sale.' });
  }
};

// Get bar inventory (only items receptionist can sell)
export const getBarInventory = async (req: Request, res: Response) => {
  try {
    const inventory = await db('inventory_items')
      .where({ inventory_type: 'bar', is_active: true })
      .select('*')
      .orderBy('name', 'asc');

    res.json(inventory);

  } catch (err) {
    console.error('Error fetching bar inventory:', err);
    res.status(500).json({ message: 'Error fetching bar inventory' });
  }
};

// Get bar items formatted as products for Quick POS (packaged products)
export const getBarItemsAsProducts = async (req: Request, res: Response) => {
  try {
    const barItems = await db('inventory_items')
      .where({ inventory_type: 'bar', is_active: true })
      .select('*')
      .orderBy('name', 'asc');

    // Format inventory items as Product interface compatible items
    const formattedItems = barItems.map(item => ({
      id: item.id,
      category_id: 0, // Bar items are in category 0 (special category for bar)
      name: item.name,
      description: `${item.current_stock} ${item.unit} in stock`,
      price: item.cost_per_unit,
      is_available: item.current_stock > 0,
      preparation_time: 0,
      inventory_type: 'bar', // Mark as bar item for inventory tracking
      current_stock: item.current_stock,
      unit: item.unit
    }));

    res.json(formattedItems);

  } catch (err) {
    console.error('Error fetching bar items as products:', err);
    res.status(500).json({ message: 'Error fetching bar items' });
  }
};

// Get receptionist sales statistics
export const getSalesStats = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await Promise.all([
      // Today's bar sales count
      db('orders')
        .where({ order_type: 'bar_sale', staff_id: req.user?.id })
        .where('created_at', '>=', today)
        .count('* as count')
        .first(),

      // Today's bar sales total
      db('orders')
        .where({ order_type: 'bar_sale', staff_id: req.user?.id })
        .where('created_at', '>=', today)
        .sum('total_amount as total')
        .first(),

      // This week's bar sales total
      (() => {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        
        return db('orders')
          .where({ order_type: 'bar_sale', staff_id: req.user?.id })
          .where('created_at', '>=', weekStart)
          .sum('total_amount as total')
          .first();
      })(),

      // Low stock bar items (for receptionist awareness)
      db('inventory_items')
        .where({ inventory_type: 'bar', is_active: true })
        .whereRaw('current_stock <= minimum_stock')
        .count('* as count')
        .first()
    ]);

    const [todayCount, todayTotal, weekTotal, lowStockCount] = stats;

    res.json({
      todaySalesCount: parseInt(todayCount?.count as string) || 0,
      todaySalesTotal: parseFloat(todayTotal?.total as string) || 0,
      weekSalesTotal: parseFloat(weekTotal?.total as string) || 0,
      lowStockItems: parseInt(lowStockCount?.count as string) || 0
    });

  } catch (err) {
    console.error('Error fetching sales stats:', err);
    res.status(500).json({ message: 'Error fetching sales statistics' });
  }
};

// Get recent bar sales history
export const getSalesHistory = async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const sales = await db('orders')
      .join('order_items', 'orders.id', 'order_items.order_id')
      .where({ 
        'orders.order_type': 'bar_sale',
        'orders.staff_id': req.user?.id 
      })
      .select(
        'orders.id',
        'orders.order_number',
        'orders.total_amount',
        'orders.payment_method',
        'orders.created_at',
        'order_items.product_name_manual',
        'order_items.quantity',
        'order_items.unit_price'
      )
      .orderBy('orders.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    res.json(sales);

  } catch (err) {
    console.error('Error fetching sales history:', err);
    res.status(500).json({ message: 'Error fetching sales history' });
  }
};