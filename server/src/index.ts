import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import dotenv from 'dotenv';
import db from './db';
db.raw('SELECT current_database(), current_user')
  .then((res) => console.log('🧩 Connected DB info:', res.rows[0]))
  .catch(console.error);

// Import configuration
import { config } from './config/environment';

// Import services
import { WebSocketService } from './services/websocket';

// Import middleware
import { authenticateToken } from './middleware/auth';
import publicMenuRoutes from './routes/publicMenuRoutes';
// Import routes
import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import kitchenRoutes from './routes/kitchenRoutes';
import receptionistRoutes from './routes/receptionistRoutes';
import roomRoutes from './routes/roomRoutes';
import productRoutes from './routes/productRoutes';
import staffRoutes from './routes/staffRoutes';
import orderRoutes from './routes/orderRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import attendanceRoutes from './routes/attendanceRoutes';
import shiftsRoutes from './routes/shiftsRoutes';
import tablesRoutes from './routes/tablesRoutes';
import reportsRoutes from './routes/reportsRoutes';
import categoriesRoutes from './routes/categoriesRoutes';
import settingsRoutes from './routes/settingsRoutes';
import performanceRoutes from './routes/performanceRoutes';
import maintenanceRoutes from './routes/maintenanceRoutes';
import expensesRoutes from './routes/expensesRoutes';
import productReturnsRoutes from './routes/productReturnsRoutes';
import suppliersRoutes from './routes/suppliersRoutes';
import purchaseOrdersRoutes from './routes/purchaseOrdersRoutes';
import quickPOSRoutes from './routes/quickPOSRoutes';
import recipesRoutes from './routes/recipesRoutes';
import wastageRoutes from './routes/wastageRoutes';
import stockTransfersRoutes from './routes/stockTransfersRoutes';
import inventoryAuditsRoutes from './routes/inventoryAuditsRoutes';

// --- Initialization ---
dotenv.config();
const app = express();
const server = http.createServer(app);
const port = config.server.port;

// Initialize WebSocket service
const webSocketService = new WebSocketService(server);

// Import and initialize WebSocket service in controllers that need it
import { setWebSocketService as setOrderWS } from './controllers/orderController';
import { setWebSocketService as setKitchenWS } from './controllers/kitchenController';

// Set WebSocket service in controllers
setOrderWS(webSocketService);
setKitchenWS(webSocketService);

// --- CORS Configuration ---
app.use(cors({
  origin: config.server.corsOrigins,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['POST', 'GET', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],

}));

app.use(express.json());

// --- Serve Static Frontend Files ---
const clientBuildPath = path.resolve(__dirname, '../../dist/client');
console.log('📁 Serving static files from:', clientBuildPath);

// Serve static files with proper caching headers for mobile
app.use(express.static(clientBuildPath, {
  maxAge: '1d', // Cache static files for 1 day
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    // Set cache headers for different file types
    if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.ico')) {
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day for images
    }
    if (path.endsWith('.js') || path.endsWith('.css')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year for JS/CSS
    }
    if (path.endsWith('.webmanifest') || path.endsWith('.json')) {
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour for manifest
    }
  }
}));

// Serve public files (including images) from public directory for development
const publicPath = path.resolve(__dirname, '../../public');
console.log('📁 Serving public files from:', publicPath);

// In development, serve public assets directly
if (process.env.NODE_ENV !== 'production') {
  app.use(express.static(publicPath, {
    maxAge: '1d',
    etag: true,
    setHeaders: (res, path) => {
      // Set proper CORS headers for PWA assets
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.ico')) {
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('Content-Type', path.endsWith('.ico') ? 'image/x-icon' : 'image/png');
      }
    }
  }));
}

// --- Health Check Endpoint ---
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'POS Mocha Backend - Modular Architecture',
    timestamp: new Date().toISOString(),
    environment: config.NODE_ENV
  });
});

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/kitchen', kitchenRoutes);
app.use('/api/receptionist', receptionistRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/products', productRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/shifts', shiftsRoutes);
app.use('/api/tables', tablesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/maintenance-requests', maintenanceRoutes);
app.use('/api/expenses', expensesRoutes);
app.use('/api/product-returns', productReturnsRoutes);
app.use('/api/suppliers', suppliersRoutes);
app.use('/api/purchase-orders', purchaseOrdersRoutes);
app.use('/api/quick-pos', quickPOSRoutes);
app.use('/api/recipes', recipesRoutes);
app.use('/api/wastage', wastageRoutes);
app.use('/api/stock-transfers', stockTransfersRoutes);
app.use('/api/inventory-audits', inventoryAuditsRoutes);

// --- Search Endpoint ---
app.get('/api/search', async (req, res) => {
  try {
    const { q, type, limit = 20, offset = 0 } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters long' });
    }

    const searchTerm = `%${q.toLowerCase()}%`;
    const limitNum = Math.min(parseInt(limit as string) || 20, 50);
    const offsetNum = Math.max(parseInt(offset as string) || 0, 0);
    let searchResults: any[] = [];

    // Search Staff
    if (!type || type === 'staff') {
      const staffResults = await db('staff')
        .whereRaw('LOWER(name) LIKE ?', [searchTerm])
        .orWhereRaw('LOWER(username) LIKE ?', [searchTerm])
        .orWhereRaw('LOWER(email) LIKE ?', [searchTerm])
        .limit(limitNum)
        .select('id', 'name', 'username', 'email', 'role', 'is_active', 'created_at');

      for (const staff of staffResults) {
        searchResults.push({
          id: staff.id,
          type: 'staff',
          title: staff.name,
          subtitle: `@${staff.username} - ${staff.role}`,
          description: staff.email,
          metadata: {
            username: staff.username,
            email: staff.email,
            role: staff.role,
            is_active: staff.is_active,
            created_at: staff.created_at
          }
        });
      }
    }

    // Search Categories
    if (!type || type === 'category') {
      const categoryResults = await db('categories')
        .whereRaw('LOWER(name) LIKE ?', [searchTerm])
        .orWhereRaw('LOWER(description) LIKE ?', [searchTerm])
        .limit(limitNum)
        .select('id', 'name', 'description', 'is_active', 'display_order', 'created_at');

      for (const category of categoryResults) {
        searchResults.push({
          id: category.id,
          type: 'category',
          title: category.name,
          subtitle: `Category - Order: ${category.display_order}`,
          description: category.description || 'No description',
          metadata: {
            description: category.description,
            display_order: category.display_order,
            is_active: category.is_active,
            created_at: category.created_at
          }
        });
      }
    }

    // Search Products (Menu Items)
    if (!type || type === 'menu' || type === 'product') {
      const productResults = await db('products')
        .leftJoin('categories', 'products.category_id', 'categories.id')
        .whereRaw('LOWER(products.name) LIKE ?', [searchTerm])
        .orWhereRaw('LOWER(products.description) LIKE ?', [searchTerm])
        .orWhereRaw('LOWER(categories.name) LIKE ?', [searchTerm])
        .limit(limitNum)
        .select(
          'products.id', 
          'products.name', 
          'products.description', 
          'products.price', 
          'products.is_active', 
          'products.created_at',
          'categories.name as category_name'
        );

      for (const product of productResults) {
        searchResults.push({
          id: product.id,
          type: 'menu',
          title: product.name,
          subtitle: product.category_name || 'No Category',
          description: `KES ${product.price} - ${product.description}`,
          metadata: {
            description: product.description,
            price: product.price,
            category: product.category_name,
            is_active: product.is_active,
            created_at: product.created_at
          }
        });
      }
    }

    // Search Inventory
    if (!type || type === 'inventory') {
      const inventoryResults = await db('inventory_items')
        .whereRaw('LOWER(name) LIKE ?', [searchTerm])
        .orWhereRaw('LOWER(supplier) LIKE ?', [searchTerm])
        .limit(limitNum)
        .select('id', 'name', 'unit', 'current_stock', 'minimum_stock', 'supplier', 'inventory_type', 'created_at');

      for (const item of inventoryResults) {
        searchResults.push({
          id: item.id,
          type: 'inventory',
          title: item.name,
          subtitle: `${item.inventory_type} - ${item.supplier}`,
          description: `${item.current_stock} ${item.unit} (Min: ${item.minimum_stock})`,
          metadata: {
            unit: item.unit,
            current_stock: item.current_stock,
            minimum_stock: item.minimum_stock,
            supplier: item.supplier,
            inventory_type: item.inventory_type,
            created_at: item.created_at
          }
        });
      }
    }

    // Search Orders
    if (!type || type === 'order') {
      const orderResults = await db('orders')
        .whereRaw('LOWER(order_number) LIKE ?', [searchTerm])
        .orWhereRaw('LOWER(customer_name) LIKE ?', [searchTerm])
        .orWhereRaw('LOWER(order_type) LIKE ?', [searchTerm])
        .limit(limitNum)
        .select('id', 'order_number', 'customer_name', 'order_type', 'total_amount', 'status', 'created_at');

      for (const order of orderResults) {
        searchResults.push({
          id: order.id,
          type: 'order',
          title: order.order_number,
          subtitle: `${order.customer_name || 'Guest'} - ${order.order_type || 'N/A'}`,
          description: `${order.status} - KES ${order.total_amount}`,
          metadata: {
            customer_name: order.customer_name,
            order_type: order.order_type,
            total_amount: order.total_amount,
            status: order.status,
            created_at: order.created_at
          }
        });
      }
    }

    // Search Rooms
    if (!type || type === 'room') {
      const roomResults = await db('rooms')
        .whereRaw('LOWER(room_number) LIKE ?', [searchTerm])
        .orWhereRaw('LOWER(room_type) LIKE ?', [searchTerm])
        .limit(limitNum)
        .select('id', 'room_number', 'room_type', 'status', 'rate_per_night', 'created_at');

      for (const room of roomResults) {
        searchResults.push({
          id: room.id,
          type: 'room',
          title: `Room ${room.room_number}`,
          subtitle: `${room.room_type} - ${room.status}`,
          description: `KES ${room.rate_per_night}/night`,
          metadata: {
            room_number: room.room_number,
            room_type: room.room_type,
            status: room.status,
            rate_per_night: room.rate_per_night,
            created_at: room.created_at
          }
        });
      }
    }

    // Search Purchase Orders
    if (!type || type === 'purchase_order') {
      const poResults = await db('purchase_orders')
        .leftJoin('suppliers', 'purchase_orders.supplier_id', 'suppliers.id')
        .whereRaw('LOWER(purchase_orders.po_number) LIKE ?', [searchTerm])
        .orWhereRaw('LOWER(purchase_orders.order_number) LIKE ?', [searchTerm])
        .orWhereRaw('LOWER(suppliers.name) LIKE ?', [searchTerm])
        .limit(limitNum)
        .select(
          'purchase_orders.id',
          'purchase_orders.po_number',
          'purchase_orders.order_number',
          'purchase_orders.status',
          'purchase_orders.total_amount',
          'purchase_orders.order_date',
          'purchase_orders.expected_delivery_date',
          'suppliers.name as supplier_name'
        );

      for (const po of poResults) {
        searchResults.push({
          id: po.id,
          type: 'purchase_order',
          title: po.po_number || po.order_number || `PO-${po.id}`,
          subtitle: `${po.supplier_name || 'No Supplier'} - ${po.status}`,
          description: `Total: KES ${po.total_amount || 0} - Ordered: ${po.order_date ? new Date(po.order_date).toLocaleDateString() : 'N/A'}`,
          metadata: {
            po_number: po.po_number,
            order_number: po.order_number,
            supplier_name: po.supplier_name,
            status: po.status,
            total_amount: po.total_amount,
            order_date: po.order_date,
            expected_delivery_date: po.expected_delivery_date,
            created_at: po.order_date
          }
        });
      }
    }

    // Sort results by relevance (exact matches first, then partial matches)
    searchResults.sort((a, b) => {
      const aExact = a.title.toLowerCase().includes(q.toLowerCase()) ? 0 : 1;
      const bExact = b.title.toLowerCase().includes(q.toLowerCase()) ? 0 : 1;
      return aExact - bExact;
    });

    // Apply pagination
    const paginatedResults = searchResults.slice(offsetNum, offsetNum + limitNum);

    res.json({
      results: paginatedResults,
      totalCount: searchResults.length,
      query: q,
      limit: limitNum,
      offset: offsetNum
    });

  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ message: 'Error performing search' });
  }
});
app.use('/api/public/menu', publicMenuRoutes);

// --- Global Error Handler ---
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('🔥 Unhandled Error:', err);
  if (res.headersSent) {
    return next(err);
  }

  if (err.name === 'MulterError') {
    return res.status(400).json({
      message: 'File upload error',
      error: err.message
    });
  }

  res.status(500).json({
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// --- Catch-all route to serve frontend ---
// IMPORTANT: This must be AFTER all API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// --- Start Server with Database Connection Test ---
db.raw('SELECT 1')
  .then(() => {
    console.log('✅ Connected to PostgreSQL successfully');
    server.listen(port, () => {
      console.log(`🚀 Backend server is running at http://localhost:${port}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📁 Serving frontend from: ${clientBuildPath}`);
      console.log('🔗 WebSocket service initialized');
    });
  })
  .catch((err) => {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  });

// Export WebSocket service for use in other modules
export { webSocketService };