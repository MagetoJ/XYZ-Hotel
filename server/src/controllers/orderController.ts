import { Request, Response } from 'express';
import db from '../db';
import { validateStaffPinForOrder } from '../utils/validation';
import { WebSocketService } from '../services/websocket';

let webSocketService: WebSocketService;

export const setWebSocketService = (wsService: WebSocketService) => {
  webSocketService = wsService;
};

// Create new order with PIN validation
export const createOrder = async (req: Request, res: Response) => {
  const { items, staff_username, pin, payment_method = 'cash', ...orderData } = req.body;

  try {
    let staffId = null;
    let staffName = 'Quick POS';

    // For bar sales, skip PIN validation
    if (orderData.order_type === 'bar_sale') {
      // No PIN required for bar sales
      console.log('Bar sale order - no PIN validation required');
    } else {
      // Validate staff username and PIN for other orders
      if (!staff_username || !pin) {
        return res.status(400).json({ message: 'Staff username and PIN are required' });
      }

      const validation = await validateStaffPinForOrder(staff_username, pin);
      if (!validation.valid || !validation.staffId || !validation.staffName) {
        return res.status(401).json({ message: 'Invalid username or PIN' });
      }

      staffId = validation.staffId;
      staffName = validation.staffName;
      console.log('PIN validated for order by:', staffName);
    }

    // Function to generate a unique order_number
    const generateOrderNumber = () => `ORD-${Date.now()}`;

    // Start DB transaction
    await db.transaction(async trx => {
      // Remove client-sent `id`
      const { id, ...orderToInsert } = orderData;

      // Ensure numeric fields and add order_number
      const safeOrder = {
        ...orderToInsert,
        staff_id: staffId,
        order_number: generateOrderNumber(),
        subtotal: Number(orderToInsert.subtotal || 0),
        total_amount: Number(orderToInsert.total_amount || 0),
        payment_method: payment_method || 'cash',
        created_at: new Date(),
        updated_at: new Date()
      };

      console.log('Inserting order:', safeOrder);

      // Insert order and get auto-generated ID
      const [{ id: orderId }] = await trx('orders')
        .insert(safeOrder)
        .returning('id');

      if (!orderId) throw new Error('Failed to create order and get ID');

      // Insert order items and handle bar item inventory deduction
      if (items && items.length > 0) {
        // Check which items are bar items (inventory items with type 'bar')
        const barItemIds = new Set<number>();
        for (const item of items) {
          const barItem = await trx('inventory_items')
            .where({ id: item.product_id, inventory_type: 'bar', is_active: true })
            .first();
          
          if (barItem) {
            barItemIds.add(item.product_id);
            
            // Deduct inventory for bar items
            const newStock = barItem.current_stock - Number(item.quantity);
            if (newStock < 0) {
              throw new Error(`Insufficient stock for ${barItem.name}. Available: ${barItem.current_stock}, Requested: ${item.quantity}`);
            }
            
            await trx('inventory_items')
              .where({ id: item.product_id })
              .update({ 
                current_stock: newStock,
                updated_at: new Date()
              });
            
            console.log(`Deducted inventory for bar item: ${barItem.name}, New stock: ${newStock}`);
          }
        }

        const orderItems = items.map((item: any) => ({
          order_id: orderId,
          product_id: item.product_id,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          total_price: Number(item.total_price),
          notes: item.notes,
        }));

        await trx('order_items').insert(orderItems);
      }

      // Create payment record to associate payment method with order
      if (payment_method) {
        await trx('payments').insert({
          order_id: orderId,
          payment_method: payment_method,
          amount: Number(orderToInsert.total_amount || 0),
          status: 'completed'
        });
      }
    });

    // Broadcast to kitchen
    if (webSocketService) {
      webSocketService.broadcastToKitchens({ type: 'new_order' });
    }

    res.status(201).json({
      message: 'Order created successfully',
      staff_name: staffName,
    });

  } catch (err) {
    console.error('Order creation error:', err);
    console.error('Error details:', {
      message: (err as Error).message,
      stack: (err as Error).stack,
      name: (err as Error).name
    });
    res.status(500).json({ 
      message: 'Failed to create order',
      error: (err as Error).message 
    });
  }
};

// Get orders with filtering
export const getOrders = async (req: Request, res: Response) => {
  try {
    const { 
      status, 
      order_type, 
      start_date, 
      end_date,
      limit = 50,
      offset = 0 
    } = req.query;

    let query = db('orders')
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    // Apply filters
    if (status) {
      query = query.where('status', status);
    }
    
    if (order_type) {
      query = query.where('order_type', order_type);
    }
    
    if (start_date && end_date) {
      query = query.whereBetween('created_at', [start_date, end_date]);
    }

    const orders = await query;

    // Get order items for each order
    for (const order of orders) {
      (order as any).items = await db('order_items')
        .leftJoin('products', 'order_items.product_id', 'products.id')
        .where('order_id', order.id)
        .select(
          'order_items.*',
          'products.name as product_name'
        );
    }

    res.json(orders);

  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).json({ message: 'Error fetching orders' });
  }
};

// Get order by ID
export const getOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = await db('orders').where({ id }).first();

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Get order items
    order.items = await db('order_items')
      .leftJoin('products', 'order_items.product_id', 'products.id')
      .where('order_id', id)
      .select(
        'order_items.*',
        'products.name as product_name'
      );

    res.json(order);

  } catch (err) {
    console.error('Error fetching order:', err);
    res.status(500).json({ message: 'Error fetching order' });
  }
};

// Update order status
export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'preparing', 'ready', 'completed', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const [updatedOrder] = await db('orders')
      .where({ id })
      .update({ 
        status, 
        updated_at: new Date() 
      })
      .returning('*');

    if (!updatedOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Broadcast status update to kitchen displays
    if (webSocketService) {
      webSocketService.broadcastToKitchens({
        type: 'order_status_update',
        orderId: id,
        status: status,
        order: updatedOrder
      });
    }

    res.json(updatedOrder);

  } catch (err) {
    console.error('Error updating order status:', err);
    res.status(500).json({ message: 'Error updating order status' });
  }
};

// Mark order as completed when receipt is printed
export const markOrderAsCompleted = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = await db('orders').where({ id }).first();
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const [updatedOrder] = await db('orders')
      .where({ id })
      .update({ 
        status: 'completed', 
        updated_at: new Date() 
      })
      .returning('*');

    console.log(`✅ Order ${id} marked as completed for receipt printing`);
    res.json({ message: 'Order marked as completed', order: updatedOrder });

  } catch (err) {
    console.error('Error marking order as completed:', err);
    res.status(500).json({ message: 'Error marking order as completed' });
  }
};

// Get staff member's recent orders (for My Recent Orders feature)
export const getStaffRecentOrders = async (req: Request, res: Response) => {
  try {
    const staffId = req.user?.id;
    if (!staffId) {
      return res.status(401).json({ message: 'Unauthorized - No staff ID' });
    }

    const { limit = 20, offset = 0 } = req.query;

    // Fetch orders for this staff member, ordered by most recent
    const orders = await db('orders')
      .where('staff_id', staffId)
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    // Get order items and payment details for each order
    for (const order of orders) {
      // Get order items
      (order as any).items = await db('order_items')
        .leftJoin('products', 'order_items.product_id', 'products.id')
        .where('order_id', order.id)
        .select(
          'order_items.*',
          'products.name as product_name'
        );

      // Get payment details
      const payment = await db('payments')
        .where('order_id', order.id)
        .first();
      
      (order as any).payment_method = payment?.payment_method || order.payment_method || 'cash';
    }

    res.json(orders);

  } catch (err) {
    console.error('Error fetching staff recent orders:', err);
    res.status(500).json({ message: 'Error fetching recent orders' });
  }
};

// Get ALL recent orders (for Receptionist/Admin view - no staff_id filter)
export const getAllRecentOrders = async (req: Request, res: Response) => {
  try {
    // Only allow authorized roles
    const authorizedRoles = ['admin', 'manager', 'receptionist', 'cashier'];
    if (!req.user || !authorizedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Unauthorized access to all orders' });
    }

    const { limit = 20, offset = 0 } = req.query;

    const orders = await db('orders')
      .select('orders.*', 'staff.name as staff_name')
      .leftJoin('staff', 'orders.staff_id', 'staff.id')
      .orderBy('orders.created_at', 'desc')
      .limit(parseInt(limit as string))
      .offset(parseInt(offset as string));

    for (const order of orders) {
      const items = await db('order_items')
        .leftJoin('products', 'order_items.product_id', 'products.id')
        .where('order_id', order.id)
        .select(
          'order_items.*',
          'products.name as product_name'
        );

      (order as any).items = items;

      const payment = await db('payments')
        .where('order_id', order.id)
        .first();
      
      (order as any).payment_method = payment?.payment_method || order.payment_method || 'cash';
    }

    res.json(orders);

  } catch (err) {
    console.error('Error fetching all recent orders:', err);
    res.status(500).json({ message: 'Error fetching recent orders' });
  }
};

// Validate staff PIN for order
export const validatePin = async (req: Request, res: Response) => {
  try {
    const { username, pin } = req.body;
    
    if (!username || !pin) {
      return res.status(400).json({ message: 'Username and PIN are required' });
    }
    
    const validation = await validateStaffPinForOrder(username, pin);
    if (!validation.valid) {
      return res.status(401).json({ message: 'Invalid username or PIN' });
    }

    const user = await db('staff').where({ username }).first();
    const { password: _, pin: __, ...userWithoutSensitiveData } = user;
    
    res.json(userWithoutSensitiveData);

  } catch (err) {
    console.error('PIN validation error:', err);
    res.status(500).json({ message: 'Server error during PIN validation' });
  }
};

// Create unified order (handles both kitchen and bar items)
export const createUnifiedOrder = async (req: Request, res: Response) => {
  const { items, total_amount, payment_method = 'cash', customer_name, table_id, staff_username, pin, ...orderData } = req.body;
  
  if (!items || items.length === 0) {
    return res.status(400).json({ message: 'Order is empty' });
  }

  try {
    let staffId = null;
    let staffName = 'Quick POS';

    if (staff_username && pin) {
      const validation = await validateStaffPinForOrder(staff_username, pin);
      if (!validation.valid || !validation.staffId || !validation.staffName) {
        return res.status(401).json({ message: 'Invalid username or PIN' });
      }
      staffId = validation.staffId;
      staffName = validation.staffName;
      console.log('PIN validated for unified order by:', staffName);
    }

    const result = await db.transaction(async (trx) => {
      const [order] = await trx('orders').insert({
        order_number: `ORD-${Date.now()}`,
        order_type: orderData.order_type || 'dine_in',
        status: 'pending',
        staff_id: staffId,
        table_id,
        customer_name,
        total_amount: Number(total_amount),
        payment_status: 'pending',
        payment_method: payment_method || 'cash'
      }).returning('*');

      for (const item of items) {
        if (item.source === 'bar') {
          const inventoryItem = await trx('inventory_items')
            .where({ id: item.product_id })
            .first();

          if (!inventoryItem || inventoryItem.current_stock < item.quantity) {
            throw new Error(`Out of stock: ${item.name}`);
          }

          await trx('inventory_items')
            .where({ id: item.product_id })
            .decrement('current_stock', item.quantity);

          await trx('order_items').insert({
            order_id: order.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: Number(item.price),
            total_price: Number(item.price) * item.quantity,
            notes: '[BAR_ITEM]'
          });
        } else {
          await trx('order_items').insert({
            order_id: order.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: Number(item.price),
            total_price: Number(item.price) * item.quantity,
            notes: '[KITCHEN]'
          });
        }
      }

      if (payment_method) {
        await trx('payments').insert({
          order_id: order.id,
          payment_method: payment_method,
          amount: Number(total_amount),
          status: 'completed'
        });
      }

      return order;
    });

    if (webSocketService) {
      webSocketService.broadcastToKitchens({ type: 'new_order' });
    }

    res.status(201).json({ 
      success: true, 
      order: result,
      staff_name: staffName 
    });

  } catch (error: any) {
    console.error('Unified order error:', error);
    res.status(500).json({ 
      message: error.message || 'Failed to create order',
      error: error.message 
    });
  }
};