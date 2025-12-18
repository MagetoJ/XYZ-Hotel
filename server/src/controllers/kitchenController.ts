import { Request, Response } from 'express';
import db from '../db';
import { WebSocketService } from '../services/websocket';

let webSocketService: WebSocketService;

export const setWebSocketService = (wsService: WebSocketService) => {
  webSocketService = wsService;
};

// Get kitchen orders (pending and preparing)
export const getKitchenOrders = async (req: Request, res: Response) => {
  try {
    const activeOrders = await db('orders')
      .whereIn('status', ['pending', 'preparing'])
      .orderBy('created_at', 'asc');

    // Get order items for each order
    for (const order of activeOrders) {
      (order as any).items = await db('order_items')
        .join('products', 'order_items.product_id', 'products.id')
        .where('order_id', order.id)
        .select('order_items.quantity', 'products.name as product_name', 'order_items.notes');
    }

    res.json(activeOrders);
  } catch (err) {
    console.error('Error fetching kitchen orders:', err);
    res.status(500).json({ message: 'Error fetching kitchen orders' });
  }
};

// Update order status
export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['pending', 'preparing', 'ready', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const [updatedOrder] = await db('orders')
      .where({ id })
      .update({ status, updated_at: new Date() })
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

// Get kitchen dashboard stats
export const getKitchenStats = async (req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stats = await Promise.all([
      // Pending orders count
      db('orders').where('status', 'pending').count('* as count').first(),
      
      // Preparing orders count
      db('orders').where('status', 'preparing').count('* as count').first(),
      
      // Completed orders today
      db('orders')
        .where('status', 'completed')
        .where('created_at', '>=', today)
        .count('* as count')
        .first(),
        
      // Average preparation time today
      db('orders')
        .where('status', 'completed')
        .where('created_at', '>=', today)
        .whereNotNull('updated_at')
        .select(
          db.raw('AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_time')
        )
        .first()
    ]);

    const [pendingCount, preparingCount, completedToday, avgTime] = stats;

    res.json({
      pendingOrders: parseInt(pendingCount?.count as string) || 0,
      preparingOrders: parseInt(preparingCount?.count as string) || 0,
      completedToday: parseInt(completedToday?.count as string) || 0,
      averagePreparationTime: Math.round(parseFloat(avgTime?.avg_time as string) || 0),
      connectedDisplays: webSocketService ? webSocketService.getKitchenSocketsCount() : 0
    });

  } catch (err) {
    console.error('Error fetching kitchen stats:', err);
    res.status(500).json({ message: 'Error fetching kitchen statistics' });
  }
};