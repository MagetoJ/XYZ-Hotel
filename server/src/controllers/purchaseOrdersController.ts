import { Request, Response } from 'express';
import db from '../db';

export const getPurchaseOrders = async (req: Request, res: Response) => {
  try {
    const {
      status,
      supplier_id,
      search // <-- 1. Accept 'search' param
    } = req.query;

    // Start query on purchase_orders
    let query = db('purchase_orders')
      .leftJoin('suppliers', 'purchase_orders.supplier_id', 'suppliers.id');

    // --- 2. Add search logic ---
    if (search) {
      const searchTerm = search as string;
      // If searching, we must also join tables to find item names
      query = query
        .leftJoin('purchase_order_items', 'purchase_orders.id', 'purchase_order_items.purchase_order_id')
        .leftJoin('inventory_items', 'purchase_order_items.inventory_item_id', 'inventory_items.id')
        .where(function() {
          this.where('purchase_orders.po_number', 'ilike', `%${searchTerm}%`)
            .orWhere('suppliers.name', 'ilike', `%${searchTerm}%`)
            .orWhere('inventory_items.name', 'ilike', `%${searchTerm}%`); // <-- Search by item name
        })
        // Get unique POs, as a search for "Beer" might match multiple items in one PO
        .distinct('purchase_orders.id');
    }
    // --- End of new logic ---

    // Apply standard filters
    if (status) {
      query = query.where('purchase_orders.status', status as string);
    }

    if (supplier_id) {
      query = query.where('purchase_orders.supplier_id', supplier_id as string);
    }

    // --- 3. Get the filtered list of PO IDs ---
    // We get IDs first to avoid complex grouping issues
    const poIdObjects = await query.select('purchase_orders.id');
    const poIds = poIdObjects.map((p: { id: number }) => p.id);

    if (poIds.length === 0) {
      return res.json([]);
    }

    // --- 4. Now, fetch the full PO data for the filtered IDs ---
    const pos = await db('purchase_orders')
      .leftJoin('suppliers', 'purchase_orders.supplier_id', 'suppliers.id')
      .select(
        'purchase_orders.*',
        'suppliers.name as supplier_name'
      )
      .whereIn('purchase_orders.id', poIds)
      .orderBy('purchase_orders.created_at', 'desc');

    // --- 5. Attach items (as the original function did) ---
    for (const po of pos) {
      (po as any).items = await db('purchase_order_items')
        .leftJoin('inventory_items', 'purchase_order_items.inventory_item_id', 'inventory_items.id')
        .where('purchase_order_id', po.id)
        .select(
          'purchase_order_items.*',
          'inventory_items.name as item_name',
          'inventory_items.unit as item_unit'
        );
    }

    // Normalize the data
    const normalizedOrders = pos.map((order: any) => ({
      ...order,
      po_number: order.po_number || order.order_number,
      order_number: order.order_number || order.po_number,
      supplier: order.supplier || order.supplier_name || null,
      total_amount: Number(order.total_amount ?? 0),
    }));

    res.json(normalizedOrders);
  } catch (err) {
    console.error('Error fetching purchase orders:', err);
    res.status(500).json({ message: 'Error fetching purchase orders' });
  }
};

// Get purchase order by ID with items
export const getPurchaseOrderById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const order = await db('purchase_orders as po')
      .where('po.id', id)
      .leftJoin('suppliers as s', 'po.supplier_id', 's.id')
      .select('po.*', 's.name as supplier_name')
      .first();

    if (!order) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    const rawItems = await db('purchase_order_items as poi')
      .where('poi.purchase_order_id', id)
      .leftJoin('inventory_items as ii', function () {
        this.on('poi.inventory_item_id', '=', 'ii.id');
        this.orOn('poi.item_id', '=', 'ii.id');
      })
      .select('poi.*', 'ii.name as item_name', 'ii.unit as item_unit');

    const items = rawItems.map((item: any) => {
      const quantityOrdered = Number(item.quantity_ordered ?? item.quantity ?? 0);
      const quantityReceived = Number(item.quantity_received ?? item.received_quantity ?? 0);
      const unitCost = Number(item.unit_cost ?? item.unit_price ?? 0);
      const inventoryItemId = item.inventory_item_id ?? item.item_id;
      const totalPrice = Number(
        item.total_price ?? unitCost * quantityOrdered
      );

      return {
        ...item,
        inventory_item_id: inventoryItemId,
        quantity: Number(item.quantity ?? quantityOrdered),
        quantity_ordered: quantityOrdered,
        quantity_received: quantityReceived,
        received_quantity: Number(item.received_quantity ?? quantityReceived),
        unit_cost: unitCost,
        unit_price: Number(item.unit_price ?? unitCost),
        total_price: totalPrice,
        unit: item.unit ?? item.item_unit,
      };
    });

    const normalizedOrder = {
      ...order,
      po_number: order.po_number || order.order_number,
      order_number: order.order_number || order.po_number,
      supplier: order.supplier || order.supplier_name || null,
      total_amount: Number(order.total_amount ?? 0),
    };

    res.json({ ...normalizedOrder, items });
  } catch (error) {
    console.error('Get purchase order error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Create purchase order
export const createPurchaseOrder = async (req: Request, res: Response) => {
  try {
    const {
      supplier_id,
      order_date,
      expected_delivery_date,
      items,
      notes,
    } = req.body;
    const userId = (req as any).user?.id;

    if (!supplier_id || !order_date || !items || items.length === 0) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const supplierRecord = await db('suppliers').where('id', supplier_id).select('name').first();
    if (!supplierRecord) {
      return res.status(400).json({ message: 'Invalid supplier' });
    }

    // Generate PO number
    const lastPO = await db('purchase_orders')
      .select('po_number')
      .orderBy('id', 'desc')
      .limit(1)
      .first();

    const nextNumber = lastPO
      ? parseInt(lastPO.po_number.replace('PO', '')) + 1
      : 1001;
    const po_number = `PO${nextNumber}`;

    const normalizedItems = items.map((item: any) => {
      const inventoryItemId = Number(item.inventory_item_id);
      const quantityOrdered = Number(item.quantity_ordered);
      const unitCost = Number(item.unit_cost);
      const quantityReceived = Number(item.quantity_received ?? 0);

      if (
        Number.isNaN(inventoryItemId) ||
        Number.isNaN(quantityOrdered) ||
        Number.isNaN(unitCost)
      ) {
        throw new Error('Invalid item data');
      }

      return {
        inventory_item_id: inventoryItemId,
        quantity_ordered: quantityOrdered,
        unit_cost: unitCost,
        quantity_received: quantityReceived,
      };
    });

    const totalAmount = normalizedItems.reduce(
      (sum: number, item: any) => sum + item.unit_cost * item.quantity_ordered,
      0
    );

    const [hasPoNumberColumn, hasOrderNumberColumn, hasSupplierColumn, hasItemIdColumn, hasInventoryItemIdColumn, hasQuantityColumn, hasQuantityOrderedColumn, hasUnitPriceColumn, hasUnitCostColumn, hasTotalPriceColumn, hasReceivedQuantityColumn, hasQuantityReceivedColumn] = await Promise.all([
      db.schema.hasColumn('purchase_orders', 'po_number'),
      db.schema.hasColumn('purchase_orders', 'order_number'),
      db.schema.hasColumn('purchase_orders', 'supplier'),
      db.schema.hasColumn('purchase_order_items', 'item_id'),
      db.schema.hasColumn('purchase_order_items', 'inventory_item_id'),
      db.schema.hasColumn('purchase_order_items', 'quantity'),
      db.schema.hasColumn('purchase_order_items', 'quantity_ordered'),
      db.schema.hasColumn('purchase_order_items', 'unit_price'),
      db.schema.hasColumn('purchase_order_items', 'unit_cost'),
      db.schema.hasColumn('purchase_order_items', 'total_price'),
      db.schema.hasColumn('purchase_order_items', 'received_quantity'),
      db.schema.hasColumn('purchase_order_items', 'quantity_received'),
    ]);

    const insertData: Record<string, unknown> = {
      supplier_id,
      order_date,
      expected_delivery_date: expected_delivery_date || null,
      total_amount: totalAmount,
      notes: notes || null,
      created_by: userId,
    };

    if (hasPoNumberColumn) {
      insertData.po_number = po_number;
    }

    if (hasOrderNumberColumn) {
      insertData.order_number = po_number;
    }

    if (hasSupplierColumn) {
      insertData.supplier = supplierRecord.name;
    }

    const result = await db('purchase_orders').insert(insertData).returning('id');
    const orderIdRaw = Array.isArray(result)
      ? typeof result[0] === 'object'
        ? (result[0] as any).id
        : result[0]
      : result;
    const orderId = Number(orderIdRaw);
    if (Number.isNaN(orderId)) {
      throw new Error('Failed to create purchase order');
    }

    for (const item of normalizedItems) {
      const totalPrice = item.unit_cost * item.quantity_ordered;
      const itemInsert: Record<string, unknown> = {
        purchase_order_id: orderId,
      };

      if (hasInventoryItemIdColumn) {
        itemInsert.inventory_item_id = item.inventory_item_id;
      }

      if (hasItemIdColumn) {
        itemInsert.item_id = item.inventory_item_id;
      }

      if (hasQuantityOrderedColumn) {
        itemInsert.quantity_ordered = item.quantity_ordered;
      }

      if (hasQuantityColumn) {
        itemInsert.quantity = item.quantity_ordered;
      }

      if (hasUnitCostColumn) {
        itemInsert.unit_cost = item.unit_cost;
      }

      if (hasUnitPriceColumn) {
        itemInsert.unit_price = item.unit_cost;
      }

      if (hasTotalPriceColumn) {
        itemInsert.total_price = totalPrice;
      }

      if (hasQuantityReceivedColumn) {
        itemInsert.quantity_received = item.quantity_received;
      }

      if (hasReceivedQuantityColumn) {
        itemInsert.received_quantity = item.quantity_received;
      }

      await db('purchase_order_items').insert(itemInsert);
    }

    res.status(201).json({
      id: orderId,
      po_number,
      message: 'Purchase order created successfully',
    });
  } catch (error) {
    console.error('Create purchase order error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Receive purchase order items
export const receivePurchaseOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { items, received_date } = req.body;
    const userId = (req as any).user?.id;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'No items provided' });
    }

    const [hasQuantityReceivedColumn, hasReceivedQuantityColumn, hasTotalPriceColumn, hasItemUpdatedAtColumn, hasOrderReceivedByColumn] = await Promise.all([
      db.schema.hasColumn('purchase_order_items', 'quantity_received'),
      db.schema.hasColumn('purchase_order_items', 'received_quantity'),
      db.schema.hasColumn('purchase_order_items', 'total_price'),
      db.schema.hasColumn('purchase_order_items', 'updated_at'),
      db.schema.hasColumn('purchase_orders', 'received_by'),
    ]);

    const deliveryDate = received_date ? new Date(received_date) : new Date();
    const now = new Date();

    try {
      await db.transaction(async (trx) => {
        const order = await trx('purchase_orders').where('id', id).forUpdate().first();
        if (!order) {
          throw new Error('PO_NOT_FOUND');
        }

        const existingItems = await trx('purchase_order_items').where('purchase_order_id', id);
        if (existingItems.length === 0) {
          throw new Error('PO_ITEMS_NOT_FOUND');
        }

        const itemsById = new Map<number, any>();
        for (const record of existingItems) {
          itemsById.set(Number(record.id), record);
        }

        const inventoryPresence = new Map<number, boolean>();

        for (const rawItem of items) {
          const itemId = Number(rawItem.id);
          const targetReceived = Number(rawItem.quantity_received);

          if (!Number.isFinite(itemId) || !Number.isFinite(targetReceived)) {
            continue;
          }

          const orderItem = itemsById.get(itemId);
          if (!orderItem) {
            continue;
          }

          const previousReceived = Number(orderItem.quantity_received ?? orderItem.received_quantity ?? 0);
          const orderedQuantity = Number(orderItem.quantity_ordered ?? orderItem.quantity ?? 0);
          const upperBound = orderedQuantity > 0 ? orderedQuantity : targetReceived;
          const clampedReceived = Math.max(0, Math.min(targetReceived, upperBound));

          const updatePayload: Record<string, unknown> = {};
          if (hasQuantityReceivedColumn) {
            updatePayload.quantity_received = clampedReceived;
          }
          if (hasReceivedQuantityColumn) {
            updatePayload.received_quantity = clampedReceived;
          }
          if (hasTotalPriceColumn) {
            const unitPriceValue = Number(orderItem.unit_cost ?? orderItem.unit_price ?? 0);
            const baseQuantity = Number(orderItem.quantity ?? orderItem.quantity_ordered ?? clampedReceived);
            updatePayload.total_price = unitPriceValue * baseQuantity;
          }
          if (hasItemUpdatedAtColumn) {
            updatePayload.updated_at = now;
          }

          if (Object.keys(updatePayload).length > 0) {
            await trx('purchase_order_items').where('id', itemId).update(updatePayload);
          }

          const quantityToAdd = clampedReceived - previousReceived;
          if (quantityToAdd > 0) {
            const inventoryId = Number(orderItem.inventory_item_id ?? orderItem.item_id);
            if (Number.isFinite(inventoryId)) {
              let hasInventoryItem = inventoryPresence.get(inventoryId);
              if (hasInventoryItem === undefined) {
                const inventoryRow = await trx('inventory_items').where('id', inventoryId).select('id').first();
                hasInventoryItem = !!inventoryRow;
                inventoryPresence.set(inventoryId, hasInventoryItem);
              }

              if (hasInventoryItem) {
                await trx('inventory_items').where('id', inventoryId).increment('current_stock', quantityToAdd);

                await trx('inventory_log')
                  .insert({
                    inventory_item_id: inventoryId,
                    action: 'purchase_received',
                    quantity_change: quantityToAdd,
                    reference_id: id,
                    reference_type: 'purchase_order',
                    logged_by: userId ?? null,
                    notes: `Received from PO ${order.po_number || order.order_number || order.id}`,
                    created_at: now,
                  })
                  .catch(() => {});
              }
            }
          }
        }

        const refreshedItems = await trx('purchase_order_items').where('purchase_order_id', id);
        const allReceived = refreshedItems.every((item: any) => {
          const orderedQuantity = Number(item.quantity_ordered ?? item.quantity ?? 0);
          if (!Number.isFinite(orderedQuantity) || orderedQuantity <= 0) {
            return true;
          }
          const receivedQuantity = Number(item.quantity_received ?? item.received_quantity ?? 0);
          return receivedQuantity >= orderedQuantity;
        });

        const totalAmount = refreshedItems.reduce((sum: number, item: any) => {
          const unitPriceValue = Number(item.unit_cost ?? item.unit_price ?? 0);
          const quantityValue = Number(item.quantity ?? item.quantity_ordered ?? 0);
          if (!Number.isFinite(unitPriceValue) || !Number.isFinite(quantityValue)) {
            return sum;
          }
          return sum + unitPriceValue * quantityValue;
        }, 0);

        const orderUpdate: Record<string, unknown> = {
          status: allReceived ? 'received' : 'partially_received',
          actual_delivery_date: deliveryDate,
          updated_at: now,
          total_amount: totalAmount,
        };

        if (hasOrderReceivedByColumn && userId) {
          orderUpdate.received_by = userId;
        }

        await trx('purchase_orders').where('id', id).update(orderUpdate);
      });

      res.json({
        message: 'Purchase order processed successfully',
      });
    } catch (error) {
      console.error('Receive purchase order error:', error);
      if ((error as Error).message === 'PO_NOT_FOUND') {
        return res.status(404).json({ message: 'Purchase order not found' });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  } catch (error) {
    console.error('Receive purchase order error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Cancel purchase order
export const cancelPurchaseOrder = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const order = await db('purchase_orders').where('id', id).first();
    if (!order) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    if (order.status === 'received') {
      return res.status(400).json({ message: 'Cannot cancel a received purchase order' });
    }

    await db('purchase_orders').where('id', id).update({
      status: 'cancelled',
      updated_at: new Date(),
    });

    res.json({ message: 'Purchase order cancelled successfully' });
  } catch (error) {
    console.error('Cancel purchase order error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};