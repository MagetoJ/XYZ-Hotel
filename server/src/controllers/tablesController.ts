import { Request, Response } from 'express';
import db from '../db';

// Get all tables
export const getTables = async (req: Request, res: Response) => {
  try {
    const tables = await db('tables')
      .select('*')
      .orderBy('table_number', 'asc');

    res.json(tables);
  } catch (err) {
    console.error('Error fetching tables:', err);
    res.status(500).json({ message: 'Error fetching tables' });
  }
};

// Get table by ID
export const getTableById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const table = await db('tables').where({ id }).first();

    if (!table) {
      return res.status(404).json({ message: 'Table not found' });
    }

    res.json(table);
  } catch (err) {
    console.error('Error fetching table:', err);
    res.status(500).json({ message: 'Error fetching table' });
  }
};

// Create new table
export const createTable = async (req: Request, res: Response) => {
  try {
    const {
      table_number,
      capacity,
      status,
      location,
      notes
    } = req.body;

    // Validation
    if (!table_number || !capacity) {
      return res.status(400).json({ 
        message: 'Table number and capacity are required' 
      });
    }

    // Check if table number already exists
    const existingTable = await db('tables').where({ table_number }).first();
    if (existingTable) {
      return res.status(400).json({ 
        message: 'Table number already exists' 
      });
    }

    const [newTable] = await db('tables')
      .insert({
        table_number,
        capacity,
        status: status || 'available',
        location: location || '',
        notes: notes || '',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');

    res.status(201).json(newTable);

  } catch (err) {
    console.error('Error adding table:', err);
    res.status(500).json({ message: 'Error adding table' });
  }
};

// Update table
export const updateTable = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, updated_at: new Date() };

    // Check if table exists
    const existingTable = await db('tables').where({ id }).first();
    if (!existingTable) {
      return res.status(404).json({ message: 'Table not found' });
    }

    // If updating table number, check for duplicates
    if (updateData.table_number && updateData.table_number !== existingTable.table_number) {
      const duplicateTable = await db('tables')
        .where({ table_number: updateData.table_number })
        .whereNot({ id })
        .first();

      if (duplicateTable) {
        return res.status(400).json({ 
          message: 'Table number already exists' 
        });
      }
    }

    const [updatedTable] = await db('tables')
      .where({ id })
      .update(updateData)
      .returning('*');

    res.json(updatedTable);

  } catch (err) {
    console.error('Error updating table:', err);
    res.status(500).json({ message: 'Error updating table' });
  }
};

// Delete table
export const deleteTable = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if table exists
    const existingTable = await db('tables').where({ id }).first();
    if (!existingTable) {
      return res.status(404).json({ message: 'Table not found' });
    }

    // Check if table has active orders
    const activeOrders = await db('orders')
      .where({ table_id: id })
      .whereIn('status', ['pending', 'preparing', 'ready'])
      .first();

    if (activeOrders) {
      return res.status(400).json({ 
        message: 'Cannot delete table with active orders' 
      });
    }

    await db('tables').where({ id }).del();
    res.json({ message: 'Table deleted successfully' });

  } catch (err) {
    console.error('Error deleting table:', err);
    res.status(500).json({ message: 'Error deleting table' });
  }
};

// Get table statistics
export const getTableStats = async (req: Request, res: Response) => {
  try {
    const stats = await Promise.all([
      // Total tables
      db('tables').count('* as count').first(),
      
      // Available tables
      db('tables').where('status', 'available').count('* as count').first(),
      
      // Occupied tables
      db('tables').where('status', 'occupied').count('* as count').first(),
      
      // Reserved tables
      db('tables').where('status', 'reserved').count('* as count').first(),
      
      // Tables with active orders
      db('orders')
        .whereIn('status', ['pending', 'preparing', 'ready'])
        .whereNotNull('table_id')
        .distinct('table_id')
        .count('* as count')
        .first()
    ]);

    const [totalTables, availableTables, occupiedTables, reservedTables, tablesWithOrders] = stats;

    const total = parseInt(totalTables?.count as string) || 0;
    const occupied = parseInt(occupiedTables?.count as string) || 0;
    const occupancyRate = total > 0 ? Math.round((occupied / total) * 100) : 0;

    res.json({
      totalTables: total,
      availableTables: parseInt(availableTables?.count as string) || 0,
      occupiedTables: occupied,
      reservedTables: parseInt(reservedTables?.count as string) || 0,
      tablesWithActiveOrders: parseInt(tablesWithOrders?.count as string) || 0,
      occupancyRate
    });

  } catch (err) {
    console.error('Error fetching table stats:', err);
    res.status(500).json({ message: 'Error fetching table statistics' });
  }
};