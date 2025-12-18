const bcrypt = require('bcryptjs');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries (order matters due to foreign keys)
  await knex('order_item_variations').del();
  await knex('order_items').del();
  await knex('payments').del();
  await knex('orders').del();
  await knex('maintenance_requests').del();
  await knex('inventory_items').del();
  await knex('product_variations').del();
  await knex('products').del();
  await knex('categories').del();
  await knex('tables').del();
  await knex('rooms').del();
  await knex('staff').del();

  // Reset sequences (PostgreSQL specific)
  await knex.raw(`
    ALTER SEQUENCE staff_id_seq RESTART WITH 1;
    ALTER SEQUENCE categories_id_seq RESTART WITH 1;
    ALTER SEQUENCE products_id_seq RESTART WITH 1;
    ALTER SEQUENCE tables_id_seq RESTART WITH 1;
    ALTER SEQUENCE rooms_id_seq RESTART WITH 1;
    ALTER SEQUENCE inventory_items_id_seq RESTART WITH 1;
    ALTER SEQUENCE orders_id_seq RESTART WITH 1;
  `);

  // Hash passwords before inserting staff
  const saltRounds = 10;
  const hashedPassword123 = await bcrypt.hash('password123', saltRounds);
  const hashedAdminPassword = await bcrypt.hash('admin123', saltRounds);

  // Insert staff first
  await knex('staff').insert([
    { 
      employee_id: 'EMP001', 
      name: 'John Manager', 
      role: 'manager', 
      pin: '1234', 
      username: 'manager',
      password: hashedPassword123,
      is_active: true 
    },
    { 
      employee_id: 'EMP002', 
      name: 'Mary Waiter', 
      role: 'waiter', 
      pin: '5678', 
      username: 'waiter',
      password: hashedPassword123,
      is_active: true 
    },
    { 
      employee_id: 'EMP005', 
      name: 'Admin User', 
      role: 'admin', 
      pin: '0000', 
      username: 'admin',
      password: hashedAdminPassword,
      is_active: true 
    },
    { 
      employee_id: 'EMP003', 
      name: 'Kitchen Staff', 
      role: 'kitchen_staff', 
      pin: '9999', 
      username: 'kitchen',
      password: hashedPassword123,
      is_active: true 
    },
    { 
      employee_id: 'EMP004', 
      name: 'Jane Receptionist', 
      role: 'receptionist', 
      pin: '7777', 
      username: 'receptionist',
      password: hashedPassword123,
      is_active: true 
    }
  ]);

  // Insert categories
  await knex('categories').insert([
    { name: 'Appetizers', description: 'Start your meal right', is_active: true },
    { name: 'Main Course', description: 'Hearty meals', is_active: true },
    { name: 'Beverages', description: 'Drinks and refreshments', is_active: true },
    { name: 'Desserts', description: 'Sweet endings', is_active: true },
    { name: 'Room Service', description: 'Hotel room amenities', is_active: true }
  ]);

  // Insert products
  await knex('products').insert([
    { 
      category_id: 1, 
      name: 'Samosas', 
      description: 'Crispy pastries filled with spiced vegetables', 
      price: 150, 
      is_available: true, 
      preparation_time: 10 
    },
    { 
      category_id: 1, 
      name: 'Chicken Wings', 
      description: 'Spicy grilled chicken wings', 
      price: 300, 
      is_available: true, 
      preparation_time: 15 
    },
    { 
      category_id: 2, 
      name: 'Ugali & Nyama Choma', 
      description: 'Traditional grilled meat with ugali', 
      price: 800, 
      is_available: true, 
      preparation_time: 25 
    },
    { 
      category_id: 2, 
      name: 'Pilau Rice', 
      description: 'Spiced rice with tender beef', 
      price: 600, 
      is_available: true, 
      preparation_time: 30 
    },
    { 
      category_id: 3, 
      name: 'Tusker Beer', 
      description: 'Local premium beer', 
      price: 250, 
      is_available: true, 
      preparation_time: 2 
    },
    { 
      category_id: 3, 
      name: 'Coca Cola', 
      description: 'Classic soft drink', 
      price: 100, 
      is_available: true, 
      preparation_time: 1 
    },
    { 
      category_id: 4, 
      name: 'Chocolate Cake', 
      description: 'Rich chocolate layer cake', 
      price: 350, 
      is_available: true, 
      preparation_time: 5 
    }
  ]);

  // Insert tables
  await knex('tables').insert([
    { table_number: 'T01', capacity: 4, status: 'available' },
    { table_number: 'T02', capacity: 2, status: 'occupied' },
    { table_number: 'T03', capacity: 6, status: 'available' },
    { table_number: 'T04', capacity: 4, status: 'reserved' }
  ]);

  // Insert rooms
  await knex('rooms').insert([
    { 
      room_number: '101', 
      room_type: 'Standard', 
      status: 'vacant', 
      rate: 5000 
    },
    { 
      room_number: '102', 
      room_type: 'Standard', 
      status: 'vacant', 
      rate: 5000 
    },
    { 
      room_number: '103', 
      room_type: 'Deluxe', 
      status: 'vacant', 
      rate: 7500 
    },
    { 
      room_number: '189', 
      room_type: 'Standard', 
      status: 'vacant', 
      rate: 5500 
    },
    { 
      room_number: '201', 
      room_type: 'Standard', 
      status: 'vacant', 
      rate: 12000 
    }
  ]);

  // Insert inventory items
  await knex('inventory_items').insert([
    { 
      name: 'Cooking Oil', 
      unit: 'liters', 
      current_stock: 5, 
      minimum_stock: 10, 
      cost_per_unit: 200, 
      inventory_type: 'kitchen',
      is_active: true 
    },
    { 
      name: 'Rice', 
      unit: 'kg', 
      current_stock: 25, 
      minimum_stock: 50, 
      cost_per_unit: 80, 
      inventory_type: 'kitchen',
      is_active: true 
    },
    { 
      name: 'Beef', 
      unit: 'kg', 
      current_stock: 8, 
      minimum_stock: 15, 
      cost_per_unit: 800, 
      inventory_type: 'kitchen',
      is_active: true 
    },
    { 
      name: 'Towels', 
      unit: 'pieces', 
      current_stock: 30, 
      minimum_stock: 20, 
      cost_per_unit: 150, 
      inventory_type: 'housekeeping',
      is_active: true 
    }
  ]);

  // Insert sample orders for testing reports
  await knex('orders').insert([
    {
      order_number: 'ORD-001',
      order_type: 'dine_in',
      table_id: 1,
      customer_name: 'Test Customer 1',
      staff_id: 2,
      status: 'completed',
      subtotal: 950,
      tax_amount: 142.50,
      total_amount: 1092.50,
      payment_status: 'paid',
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
    },
    {
      order_number: 'ORD-002', 
      order_type: 'takeaway',
      customer_name: 'Test Customer 2',
      staff_id: 2,
      status: 'completed',
      subtotal: 450,
      tax_amount: 67.50,
      total_amount: 517.50,
      payment_status: 'paid',
      created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) // 1 day ago
    },
    {
      order_number: 'ORD-003',
      order_type: 'room_service',
      room_id: 1,
      customer_name: 'John Doe',
      staff_id: 2,
      status: 'completed',
      subtotal: 600,
      tax_amount: 90,
      total_amount: 690,
      payment_status: 'paid',
      created_at: new Date() // today
    }
  ]);
};