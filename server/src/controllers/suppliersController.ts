import { Request, Response } from 'express';
import db from '../db';

// Get all suppliers
export const getSuppliers = async (req: Request, res: Response) => {
  try {
    const suppliers = await db('suppliers')
      .select('*')
      .where('is_active', true)
      .orderBy('name');
    res.json(suppliers);
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get supplier by ID
export const getSupplierById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const supplier = await db('suppliers').where('id', id).first();

    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    res.json(supplier);
  } catch (error) {
    console.error('Get supplier error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create supplier
export const createSupplier = async (req: Request, res: Response) => {
  try {
    const { name, contact_person, phone, email, address, payment_terms } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Supplier name is required' });
    }

    const id = await db('suppliers').insert({
      name,
      contact_person: contact_person || null,
      phone: phone || null,
      email: email || null,
      address: address || null,
      payment_terms: payment_terms || null,
    });

    res.status(201).json({
      id: id[0],
      message: 'Supplier created successfully',
    });
  } catch (error: any) {
    if (error.message?.includes('duplicate')) {
      return res.status(400).json({ message: 'Supplier name already exists' });
    }
    console.error('Create supplier error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update supplier
export const updateSupplier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const supplier = await db('suppliers').where('id', id).first();
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    await db('suppliers').where('id', id).update({
      ...updateData,
      updated_at: new Date(),
    });

    res.json({ message: 'Supplier updated successfully' });
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Deactivate supplier (soft delete)
export const deactivateSupplier = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const supplier = await db('suppliers').where('id', id).first();
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    await db('suppliers').where('id', id).update({
      is_active: false,
      updated_at: new Date(),
    });

    res.json({ message: 'Supplier deactivated successfully' });
  } catch (error) {
    console.error('Deactivate supplier error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get purchase orders for a supplier
export const getSupplierPurchaseOrders = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const supplier = await db('suppliers').where('id', id).first();
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    const orders = await db('purchase_orders')
      .where('supplier_id', id)
      .orderBy('order_date', 'desc');

    res.json(orders);
  } catch (error) {
    console.error('Get supplier purchase orders error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};