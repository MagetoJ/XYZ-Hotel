import { Request, Response } from 'express';
import db from '../db';

// Get all stock transfers
export const getStockTransfers = async (req: Request, res: Response) => {
  try {
    const { status, itemId, startDate, endDate } = req.query;
    let query = db('stock_transfers')
      .join('inventory_items', 'stock_transfers.inventory_item_id', 'inventory_items.id')
      .leftJoin('staff as requester', 'stock_transfers.requested_by', 'requester.id')
      .leftJoin('staff as receiver', 'stock_transfers.received_by', 'receiver.id')
      .select(
        'stock_transfers.*',
        'inventory_items.name as item_name',
        'inventory_items.unit',
        'requester.name as requested_by_name',
        'receiver.name as received_by_name'
      );

    if (status) {
      query = query.where('stock_transfers.status', status);
    }
    if (itemId) {
      query = query.where('stock_transfers.inventory_item_id', itemId);
    }
    if (startDate) {
      query = query.where('stock_transfers.transfer_date', '>=', startDate);
    }
    if (endDate) {
      query = query.where('stock_transfers.transfer_date', '<=', endDate);
    }

    const transfers = await query.orderBy('stock_transfers.transfer_date', 'desc');
    res.json(transfers);
  } catch (error) {
    console.error('Get stock transfers error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get stock transfer by ID
export const getStockTransferById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const transfer = await db('stock_transfers')
      .where('stock_transfers.id', id)
      .join('inventory_items', 'stock_transfers.inventory_item_id', 'inventory_items.id')
      .leftJoin('staff as requester', 'stock_transfers.requested_by', 'requester.id')
      .leftJoin('staff as receiver', 'stock_transfers.received_by', 'receiver.id')
      .select(
        'stock_transfers.*',
        'inventory_items.name as item_name',
        'inventory_items.unit',
        'requester.name as requested_by_name',
        'receiver.name as received_by_name'
      )
      .first();

    if (!transfer) {
      return res.status(404).json({ message: 'Stock transfer not found' });
    }

    res.json(transfer);
  } catch (error) {
    console.error('Get stock transfer error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create stock transfer request
export const createStockTransfer = async (req: Request, res: Response) => {
  try {
    const {
      inventory_item_id,
      from_location,
      to_location,
      quantity_transferred,
      transfer_date,
      notes,
    } = req.body;
    const userId = (req as any).user?.id;

    if (!inventory_item_id || !quantity_transferred || !transfer_date) {
      return res.status(400).json({
        message: 'Inventory item, quantity, and transfer date are required',
      });
    }

    const item = await db('inventory_items').where('id', inventory_item_id).first();
    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    // Check sufficient stock
    if (item.current_stock < quantity_transferred) {
      return res.status(400).json({
        message: `Insufficient stock. Available: ${item.current_stock}, Requested: ${quantity_transferred}`,
      });
    }

    // Generate transfer number
    const lastTransfer = await db('stock_transfers')
      .select('transfer_number')
      .orderBy('id', 'desc')
      .limit(1)
      .first();

    const nextNumber = lastTransfer
      ? parseInt(lastTransfer.transfer_number.replace('ST', '')) + 1
      : 1001;
    const transfer_number = `ST${nextNumber}`;

    const [transferId] = await db('stock_transfers').insert({
      transfer_number,
      inventory_item_id,
      from_location: from_location || 'main',
      to_location: to_location || 'main',
      quantity_transferred: parseInt(quantity_transferred),
      transfer_date,
      status: 'pending',
      requested_by: userId,
      notes: notes || null,
    });

    // Immediately deduct from inventory (stock transfer initiated)
    await db('inventory_items')
      .where('id', inventory_item_id)
      .decrement('current_stock', parseInt(quantity_transferred));

    // Log inventory change
    await db('inventory_log').insert({
      inventory_item_id,
      action: 'transfer_initiated',
      quantity_change: -parseInt(quantity_transferred),
      reference_id: transferId,
      reference_type: 'stock_transfer',
      logged_by: userId,
      notes: `Transfer from ${from_location} to ${to_location} - ${notes || ''}`,
    });

    res.status(201).json({
      id: transferId,
      transfer_number,
      message: 'Stock transfer created successfully',
    });
  } catch (error) {
    console.error('Create stock transfer error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Receive/Complete stock transfer
export const receiveStockTransfer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { received_date, notes } = req.body;
    const userId = (req as any).user?.id;

    const transfer = await db('stock_transfers').where('id', id).first();
    if (!transfer) {
      return res.status(404).json({ message: 'Stock transfer not found' });
    }

    if (transfer.status !== 'pending' && transfer.status !== 'in_transit') {
      return res.status(400).json({
        message: `Cannot receive a transfer with status: ${transfer.status}`,
      });
    }

    // Add stock to destination (since it was already deducted during creation)
    // The stock remains deducted, but we mark as received
    await db('stock_transfers').where('id', id).update({
      status: 'received',
      received_date: received_date || new Date(),
      received_by: userId,
      updated_at: new Date(),
    });

    // Log receipt
    await db('inventory_log').insert({
      inventory_item_id: transfer.inventory_item_id,
      action: 'transfer_completed',
      quantity_change: 0,
      reference_id: id,
      reference_type: 'stock_transfer',
      logged_by: userId,
      notes: `Transfer completed to ${transfer.to_location} - ${notes || ''}`,
    });

    res.json({ message: 'Stock transfer received successfully' });
  } catch (error) {
    console.error('Receive stock transfer error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Cancel stock transfer (with inventory reversal)
export const cancelStockTransfer = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const transfer = await db('stock_transfers').where('id', id).first();
    if (!transfer) {
      return res.status(404).json({ message: 'Stock transfer not found' });
    }

    if (transfer.status === 'received' || transfer.status === 'cancelled') {
      return res.status(400).json({
        message: `Cannot cancel a transfer with status: ${transfer.status}`,
      });
    }

    // Reverse the inventory deduction
    await db('inventory_items')
      .where('id', transfer.inventory_item_id)
      .increment('current_stock', transfer.quantity_transferred);

    await db('stock_transfers').where('id', id).update({
      status: 'cancelled',
      updated_at: new Date(),
    });

    // Log cancellation
    await db('inventory_log').insert({
      inventory_item_id: transfer.inventory_item_id,
      action: 'transfer_cancelled',
      quantity_change: transfer.quantity_transferred,
      reference_id: id,
      reference_type: 'stock_transfer',
      logged_by: userId,
      notes: `Transfer cancelled from ${transfer.from_location} to ${transfer.to_location}`,
    });

    res.json({ message: 'Stock transfer cancelled and inventory reversed' });
  } catch (error) {
    console.error('Cancel stock transfer error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};