import { Request, Response } from 'express';
import db from '../db';

// Get all inventory audits
export const getInventoryAudits = async (req: Request, res: Response) => {
  try {
    const { status, startDate, endDate } = req.query;
    let query = db('inventory_audits')
      .join('staff', 'inventory_audits.created_by', 'staff.id')
      .select('inventory_audits.*', 'staff.name as created_by_name');

    if (status) {
      query = query.where('inventory_audits.status', status);
    }
    if (startDate) {
      query = query.where('inventory_audits.audit_date', '>=', startDate);
    }
    if (endDate) {
      query = query.where('inventory_audits.audit_date', '<=', endDate);
    }

    const audits = await query.orderBy('inventory_audits.audit_date', 'desc');
    res.json(audits);
  } catch (error) {
    console.error('Get inventory audits error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get inventory audit by ID with line items
export const getInventoryAuditById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const audit = await db('inventory_audits')
      .where('inventory_audits.id', id)
      .join('staff', 'inventory_audits.created_by', 'staff.id')
      .select('inventory_audits.*', 'staff.name as created_by_name')
      .first();

    if (!audit) {
      return res.status(404).json({ message: 'Inventory audit not found' });
    }

    const lineItems = await db('audit_line_items')
      .where('inventory_audit_id', id)
      .join('inventory_items', 'audit_line_items.inventory_item_id', 'inventory_items.id')
      .leftJoin('staff', 'audit_line_items.audited_by', 'staff.id')
      .select(
        'audit_line_items.*',
        'inventory_items.name as item_name',
        'inventory_items.unit',
        'staff.name as audited_by_name'
      );

    res.json({ ...audit, lineItems });
  } catch (error) {
    console.error('Get inventory audit error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Start inventory audit/stock take
export const startInventoryAudit = async (req: Request, res: Response) => {
  try {
    const { audit_date, notes } = req.body;
    const userId = (req as any).user?.id;

    if (!audit_date) {
      return res.status(400).json({ message: 'Audit date is required' });
    }

    // Generate audit number
    const lastAudit = await db('inventory_audits')
      .select('audit_number')
      .orderBy('id', 'desc')
      .limit(1)
      .first();

    const nextNumber = lastAudit
      ? parseInt(lastAudit.audit_number.replace('AUDIT', '')) + 1
      : 1001;
    const audit_number = `AUDIT${nextNumber}`;

    // Get all active inventory items to create line items
    const inventoryItems = await db('inventory_items').where('is_active', true);

    const [auditId] = await db('inventory_audits').insert({
      audit_number,
      audit_date,
      start_time: new Date(),
      status: 'in_progress',
      notes: notes || null,
      created_by: userId,
    });

    // Create line items for all inventory items with current system quantities
    for (const item of inventoryItems) {
      await db('audit_line_items').insert({
        inventory_audit_id: auditId,
        inventory_item_id: item.id,
        system_quantity: item.current_stock,
      });
    }

    res.status(201).json({
      id: auditId,
      audit_number,
      message: 'Inventory audit started successfully',
    });
  } catch (error) {
    console.error('Start inventory audit error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update audit line item with physical count
export const updateAuditLineItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { physical_quantity, variance_reason, notes } = req.body;
    const userId = (req as any).user?.id;

    const lineItem = await db('audit_line_items').where('id', id).first();
    if (!lineItem) {
      return res.status(404).json({ message: 'Audit line item not found' });
    }

    const variance = physical_quantity - lineItem.system_quantity;

    await db('audit_line_items').where('id', id).update({
      physical_quantity,
      variance,
      variance_reason: variance_reason || null,
      notes: notes || null,
      audited_by: userId,
    });

    res.json({ message: 'Audit line item updated successfully' });
  } catch (error) {
    console.error('Update audit line item error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Complete inventory audit and generate variance report
export const completeInventoryAudit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    const audit = await db('inventory_audits').where('id', id).first();
    if (!audit) {
      return res.status(404).json({ message: 'Inventory audit not found' });
    }

    if (audit.status !== 'in_progress') {
      return res.status(400).json({
        message: `Cannot complete an audit with status: ${audit.status}`,
      });
    }

    // Get all line items
    const lineItems = await db('audit_line_items').where('inventory_audit_id', id);

    // Process variances and update inventory if needed
    for (const lineItem of lineItems) {
      if (lineItem.physical_quantity !== lineItem.system_quantity) {
        const variance = lineItem.physical_quantity - lineItem.system_quantity;

        // Update inventory to match physical count
        await db('inventory_items')
          .where('id', lineItem.inventory_item_id)
          .update({ current_stock: lineItem.physical_quantity });

        // Log the adjustment
        await db('inventory_log').insert({
          inventory_item_id: lineItem.inventory_item_id,
          action: 'audit_adjustment',
          quantity_change: variance,
          reference_id: id,
          reference_type: 'inventory_audit',
          logged_by: userId,
          notes: `Stock audit adjustment - System: ${lineItem.system_quantity}, Physical: ${lineItem.physical_quantity}, Reason: ${lineItem.variance_reason || 'not specified'}`,
        });
      }
    }

    // Complete the audit
    await db('inventory_audits').where('id', id).update({
      status: 'completed',
      end_time: new Date(),
      updated_at: new Date(),
    });

    // Generate variance report
    const varianceReport = lineItems
      .filter((item: any) => item.physical_quantity !== item.system_quantity)
      .map((item: any) => ({
        inventory_item_id: item.inventory_item_id,
        system_quantity: item.system_quantity,
        physical_quantity: item.physical_quantity,
        variance: item.variance,
        variance_reason: item.variance_reason,
        notes: item.notes,
      }));

    res.json({
      message: 'Inventory audit completed successfully',
      varianceReport,
      totalVariances: varianceReport.length,
    });
  } catch (error) {
    console.error('Complete inventory audit error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Cancel inventory audit
export const cancelInventoryAudit = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const audit = await db('inventory_audits').where('id', id).first();
    if (!audit) {
      return res.status(404).json({ message: 'Inventory audit not found' });
    }

    if (audit.status === 'completed' || audit.status === 'cancelled') {
      return res.status(400).json({
        message: `Cannot cancel an audit with status: ${audit.status}`,
      });
    }

    await db('inventory_audits').where('id', id).update({
      status: 'cancelled',
      updated_at: new Date(),
    });

    res.json({ message: 'Inventory audit cancelled successfully' });
  } catch (error) {
    console.error('Cancel inventory audit error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get variance report for an audit
export const getVarianceReport = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const audit = await db('inventory_audits').where('id', id).first();
    if (!audit) {
      return res.status(404).json({ message: 'Inventory audit not found' });
    }

    const lineItems = await db('audit_line_items')
      .where('inventory_audit_id', id)
      .join('inventory_items', 'audit_line_items.inventory_item_id', 'inventory_items.id')
      .select(
        'audit_line_items.*',
        'inventory_items.name as item_name',
        'inventory_items.unit'
      );

    const varianceReport = lineItems
      .filter((item: any) => item.physical_quantity !== null && item.physical_quantity !== item.system_quantity)
      .map((item: any) => ({
        id: item.id,
        inventory_item_id: item.inventory_item_id,
        item_name: item.item_name,
        unit: item.unit,
        system_quantity: item.system_quantity,
        physical_quantity: item.physical_quantity,
        variance: item.variance,
        variance_reason: item.variance_reason,
        notes: item.notes,
      }));

    const summary = {
      total_items_audited: lineItems.length,
      items_with_variance: varianceReport.length,
      variance_rate: (varianceReport.length / lineItems.length * 100).toFixed(2) + '%',
    };

    res.json({
      audit,
      varianceReport,
      summary,
    });
  } catch (error) {
    console.error('Get variance report error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};