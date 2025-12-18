import { Request, Response } from 'express';
import db from '../db';

// Get all expenses with optional filtering
export const getExpenses = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, category } = req.query;
    console.log('📦 Fetching expenses with filters:', { startDate, endDate, category });
    
    let query = db('expenses').select('*');

    if (startDate) {
      query = query.where('date', '>=', startDate);
    }
    if (endDate) {
      query = query.where('date', '<=', endDate);
    }
    if (category) {
      query = query.where('category', category);
    }

    const expenses = await query.orderBy('date', 'desc');
    console.log(`✅ Retrieved ${expenses.length} expenses`);
    
    res.json(expenses);
  } catch (error: any) {
    console.error('❌ Get expenses error:', error.message, error.code);
    
    // Provide specific error message for database issues
    if (error.code === '42P01') {
      res.status(500).json({ 
        message: 'Database table not found. Please contact administrator to run database migrations.',
        code: 'TABLE_NOT_FOUND'
      });
    } else if (error.message?.includes('relation')) {
      res.status(500).json({ 
        message: 'Database schema error. Please ensure all migrations have been run.',
        code: 'SCHEMA_ERROR'
      });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

// Get expense by ID
export const getExpenseById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const expense = await db('expenses').where('id', id).first();

    if (!expense) {
      return res.status(404).json({ message: 'Expense not found' });
    }

    res.json(expense);
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create new expense
export const createExpense = async (req: Request, res: Response) => {
  try {
    const { date, category, description, amount, vendor, payment_method, receipt_number, notes } = req.body;
    const userId = (req as any).user?.id;

    console.log('📝 Creating new expense:', { date, category, description, amount, vendor });

    if (!date || !category || !description || !amount) {
      console.warn('⚠️  Missing required fields');
      return res.status(400).json({ 
        message: 'Missing required fields: date, category, description, and amount are required',
        code: 'VALIDATION_ERROR'
      });
    }

    // Validate amount is a valid number
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      console.warn('⚠️  Invalid amount:', amount);
      return res.status(400).json({ 
        message: 'Amount must be a valid positive number',
        code: 'VALIDATION_ERROR'
      });
    }

    const id = await db('expenses').insert({
      date,
      category,
      description,
      amount: parsedAmount,
      vendor: vendor || null,
      payment_method: payment_method || 'cash',
      receipt_number: receipt_number || null,
      notes: notes || null,
      created_by: userId,
    });

    console.log(`✅ Expense created successfully with ID: ${id[0]}`);

    // Log to audit table
    await logAudit('expense', id[0], 'create', null, {
      date,
      category,
      description,
      amount: parsedAmount,
      vendor,
      payment_method,
    }, userId);

    res.status(201).json({
      id: id[0],
      message: 'Expense created successfully',
    });
  } catch (error: any) {
    console.error('❌ Create expense error:', error.message, error.code);
    
    if (error.code === '42P01') {
      res.status(500).json({ 
        message: 'Database table not found. Please contact administrator.',
        code: 'TABLE_NOT_FOUND'
      });
    } else if (error.code === '23505') {
      res.status(400).json({ 
        message: 'Receipt number already exists. Please use a unique receipt number.',
        code: 'DUPLICATE_RECEIPT'
      });
    } else {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
};

// Update expense
export const updateExpense = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;
    const updateData = req.body;

    console.log('✏️  Updating expense:', id, updateData);

    const existing = await db('expenses').where('id', id).first();
    if (!existing) {
      console.warn('⚠️  Expense not found:', id);
      return res.status(404).json({ message: 'Expense not found' });
    }

    await db('expenses').where('id', id).update({
      ...updateData,
      amount: updateData.amount ? parseFloat(updateData.amount) : undefined,
      updated_at: new Date(),
    });

    console.log(`✅ Expense ${id} updated successfully`);

    // Log to audit table
    await logAudit('expense', parseInt(id), 'update', existing, updateData, userId);

    res.json({ message: 'Expense updated successfully' });
  } catch (error: any) {
    console.error('❌ Update expense error:', error.message, error.code);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Delete expense
export const deleteExpense = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    console.log('🗑️  Deleting expense:', id);

    const existing = await db('expenses').where('id', id).first();
    if (!existing) {
      console.warn('⚠️  Expense not found for deletion:', id);
      return res.status(404).json({ message: 'Expense not found' });
    }

    await db('expenses').where('id', id).del();

    console.log(`✅ Expense ${id} deleted successfully`);

    // Log to audit table
    await logAudit('expense', parseInt(id), 'delete', existing, null, userId);

    res.json({ message: 'Expense deleted successfully' });
  } catch (error: any) {
    console.error('❌ Delete expense error:', error.message, error.code);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get expense summary (for dashboard)
export const getExpenseSummary = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    let query = db('expenses').select('category').sum('amount as total').groupBy('category');

    if (startDate) {
      query = query.where('date', '>=', startDate);
    }
    if (endDate) {
      query = query.where('date', '<=', endDate);
    }

    const summary = await query;
    const totalExpenses = await db('expenses')
      .sum('amount as total')
      .where((q) => {
        if (startDate) q.where('date', '>=', startDate);
        if (endDate) q.where('date', '<=', endDate);
      })
      .first();

    res.json({
      byCategory: summary,
      total: totalExpenses?.total || 0,
    });
  } catch (error) {
    console.error('Get expense summary error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Helper function to log to audit table
async function logAudit(
  entityType: string,
  entityId: number,
  action: string,
  oldValues: any,
  newValues: any,
  userId: number | undefined
) {
  try {
    await db('audit_logs').insert({
      entity_type: entityType,
      entity_id: entityId,
      action,
      old_values: oldValues ? JSON.stringify(oldValues) : null,
      new_values: newValues ? JSON.stringify(newValues) : null,
      changed_by: userId || null,
      ip_address: null,
      user_agent: null,
    });
  } catch (err) {
    console.error('Audit log error:', err);
  }
}