import { Request, Response } from 'express';
import db from '../db';

// Get all wastage logs
export const getWastageLogs = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, reason, itemId } = req.query;
    let query = db('wastage_logs')
      .join('inventory_items', 'wastage_logs.inventory_item_id', 'inventory_items.id')
      .join('staff', 'wastage_logs.logged_by', 'staff.id')
      .select(
        'wastage_logs.*',
        'inventory_items.name as item_name',
        'inventory_items.unit',
        'staff.name as logged_by_name'
      );

    if (startDate) {
      query = query.where('wastage_logs.waste_date', '>=', startDate);
    }
    if (endDate) {
      query = query.where('wastage_logs.waste_date', '<=', endDate);
    }
    if (reason) {
      query = query.where('wastage_logs.reason', reason);
    }
    if (itemId) {
      query = query.where('wastage_logs.inventory_item_id', itemId);
    }

    const logs = await query.orderBy('wastage_logs.waste_date', 'desc');
    res.json(logs);
  } catch (error) {
    console.error('Get wastage logs error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get wastage log by ID
export const getWastageLogById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const log = await db('wastage_logs')
      .where('wastage_logs.id', id)
      .join('inventory_items', 'wastage_logs.inventory_item_id', 'inventory_items.id')
      .select('wastage_logs.*', 'inventory_items.name as item_name', 'inventory_items.unit')
      .first();

    if (!log) {
      return res.status(404).json({ message: 'Wastage log not found' });
    }

    res.json(log);
  } catch (error) {
    console.error('Get wastage log error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create wastage log
export const createWastageLog = async (req: Request, res: Response) => {
  try {
    const { inventory_item_id, quantity_wasted, reason, waste_date, notes } = req.body;
    const userId = (req as any).user?.id;

    if (!inventory_item_id || !quantity_wasted || !reason || !waste_date) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const item = await db('inventory_items').where('id', inventory_item_id).first();
    if (!item) {
      return res.status(404).json({ message: 'Inventory item not found' });
    }

    // Create wastage log
    const [logId] = await db('wastage_logs').insert({
      inventory_item_id,
      quantity_wasted: parseFloat(quantity_wasted),
      reason,
      waste_date,
      notes: notes || null,
      logged_by: userId,
    });

    // Deduct from inventory
    await db('inventory_items')
      .where('id', inventory_item_id)
      .decrement('current_stock', parseFloat(quantity_wasted));

    // Log to inventory log
    await db('inventory_log').insert({
      inventory_item_id,
      action: 'wastage',
      quantity_change: -parseFloat(quantity_wasted),
      reference_id: logId,
      reference_type: 'wastage_log',
      logged_by: userId,
      notes: `Wastage - ${reason}: ${notes || ''}`,
    });

    res.status(201).json({
      id: logId,
      message: 'Wastage logged successfully and inventory updated',
    });
  } catch (error) {
    console.error('Create wastage log error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete wastage log (with inventory reversal)
export const deleteWastageLog = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const log = await db('wastage_logs').where('id', id).first();
    if (!log) {
      return res.status(404).json({ message: 'Wastage log not found' });
    }

    // Reverse inventory deduction
    await db('inventory_items')
      .where('id', log.inventory_item_id)
      .increment('current_stock', log.quantity_wasted);

    // Log reversal
    await db('inventory_log').insert({
      inventory_item_id: log.inventory_item_id,
      action: 'wastage_reversal',
      quantity_change: log.quantity_wasted,
      reference_id: id,
      reference_type: 'wastage_log',
      logged_by: userId,
      notes: `Wastage reversal - ${log.reason}`,
    });

    await db('wastage_logs').where('id', id).del();

    res.json({ message: 'Wastage log deleted and inventory reversed' });
  } catch (error) {
    console.error('Delete wastage log error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get wastage summary (for dashboard)
export const getWastageSummary = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    let query = db('wastage_logs').select('reason').sum('quantity_wasted as total').groupBy('reason');

    if (startDate) {
      query = query.where('waste_date', '>=', startDate);
    }
    if (endDate) {
      query = query.where('waste_date', '<=', endDate);
    }

    const summary = await query;

    // Get total wastage count and value
    let countQuery = db('wastage_logs');
    if (startDate) countQuery = countQuery.where('waste_date', '>=', startDate);
    if (endDate) countQuery = countQuery.where('waste_date', '<=', endDate);

    const [totalCount] = await countQuery.count('id as count');

    res.json({
      byReason: summary,
      totalCount: totalCount?.count || 0,
    });
  } catch (error) {
    console.error('Get wastage summary error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};