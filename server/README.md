# POS Mocha Backend - Modular Architecture

This backend has been refactored from a monolithic single-file architecture to a well-organized modular system while maintaining all existing functionality and database structure.

## Architecture Overview

### 📁 Project Structure

```
server/src/
├── config/
│   └── environment.ts          # Centralized configuration management
├── controllers/
│   ├── authController.ts       # Authentication & password reset
│   ├── attendanceController.ts # Clock in/out & attendance tracking  
│   ├── dashboardController.ts  # Analytics & reporting
│   ├── inventoryController.ts  # Role-based inventory management
│   ├── kitchenController.ts    # Kitchen order management
│   ├── orderController.ts      # Order creation with PIN validation
│   ├── productController.ts    # Menu item management
│   ├── receptionistController.ts # Bar sales & inventory access
│   ├── roomController.ts       # Room management & check-in/out
│   ├── shiftsController.ts     # Shift scheduling & management
│   ├── staffController.ts      # Staff CRUD with role permissions
│   └── tablesController.ts     # Table management & occupancy
├── middleware/
│   └── auth.ts                 # JWT authentication & role authorization
├── routes/
│   ├── authRoutes.ts          # Authentication endpoints
│   ├── attendanceRoutes.ts    # Attendance tracking routes
│   ├── dashboardRoutes.ts     # Dashboard & analytics routes
│   ├── inventoryRoutes.ts     # Inventory management routes
│   ├── kitchenRoutes.ts       # Kitchen display routes
│   ├── orderRoutes.ts         # Order management routes
│   ├── productRoutes.ts       # Menu management routes
│   ├── receptionistRoutes.ts  # Receptionist-specific routes
│   ├── roomRoutes.ts          # Room management routes
│   ├── shiftsRoutes.ts        # Shift scheduling routes
│   ├── staffRoutes.ts         # Staff management routes
│   └── tablesRoutes.ts        # Table management routes
├── services/
│   └── websocket.ts           # WebSocket service for real-time updates
├── utils/
│   ├── email.ts               # Email utilities with branded templates
│   └── validation.ts          # Common validation functions
├── db.ts                      # Database connection configuration
└── index.ts                   # Main application entry point (modular)
```

## Key Features

### 🔐 **Role-Based Access Control**
- **Admin**: Full system access
- **Manager**: Management-level access to all areas
- **Kitchen Staff**: Kitchen inventory and order management
- **Receptionist**: Bar sales, housekeeping, minibar inventory
- **Housekeeping**: Room status updates

### 🏗️ **Modular Architecture Benefits**
- **Separation of Concerns**: Each module has a specific responsibility
- **Easy Maintenance**: Individual components can be updated independently
- **Type Safety**: Full TypeScript support throughout
- **Testability**: Each controller and service can be tested in isolation
- **Scalability**: Easy to add new features and modules

### 🔄 **Real-Time Features**
- WebSocket integration for kitchen display updates
- Live order status broadcasting
- Real-time inventory updates

### 📊 **Database Integration**
- PostgreSQL with Knex.js query builder
- Preserved all existing database schemas
- Transaction support for data integrity
- Role-based data filtering

## API Endpoints

### Authentication (`/api/auth`)
- `POST /login` - User authentication
- `POST /forgot-password` - Request password reset
- `POST /reset-password` - Reset password with code
- `GET /profile` - Get user profile
- `PUT /profile` - Update user profile

### Inventory Management (`/api/inventory`)
- `GET /` - Get inventory (role-filtered)
- `POST /` - Add inventory item
- `PUT /:id` - Update inventory item
- `DELETE /:id` - Delete inventory item

### Kitchen Operations (`/api/kitchen`)
- `GET /orders` - Get active orders
- `PUT /orders/:id/status` - Update order status

### Order Management (`/api/orders`)
- `POST /` - Create new order (with PIN validation)
- `GET /` - Get orders
- `PUT /:id` - Update order
- `DELETE /:id` - Cancel order

### Staff Management (`/api/staff`)
- `GET /` - Get all staff
- `POST /` - Create staff member
- `PUT /:id` - Update staff member
- `DELETE /:id` - Deactivate staff member

### Room Management (`/api/rooms`)
- `GET /` - Get all rooms
- `POST /` - Create room
- `PUT /:id` - Update room
- `DELETE /:id` - Delete room
- `POST /:roomId/check-in` - Check in room
- `POST /:roomId/check-out` - Check out room

## Environment Variables

```bash
# Server Configuration
PORT=3000
NODE_ENV=development

# Security
JWT_SECRET=your-jwt-secret

# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=pos_database
DATABASE_USER=postgres
DATABASE_PASSWORD=your-password
DATABASE_SSL=false

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-email-password
EMAIL_FROM=POS System <noreply@yourcompany.com>
```

## Running the Server

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start development server
npm run dev

# Start production server
npm start
```

## Database Compatibility

**No database changes required!** This refactoring:
- ✅ Preserves all existing table schemas
- ✅ Maintains all relationships and constraints
- ✅ Keeps all existing data intact
- ✅ Uses the same database connection configuration

## Frontend Compatibility

**Complete frontend compatibility maintained!** This refactoring:
- ✅ Preserves all existing API endpoints
- ✅ Maintains identical request/response formats
- ✅ Keeps the same authentication mechanisms
- ✅ Preserves all role-based access patterns

## Migration Notes

The original monolithic `index.ts` file has been backed up as `index.original.ts.bak`. The new modular system:

1. **Maintains Functionality**: Every feature from the original system is preserved
2. **Improves Organization**: Code is now logically separated into modules
3. **Enhances Maintainability**: Each module can be developed and tested independently
4. **Supports Growth**: New features can be added without affecting existing code

## WebSocket Integration

Real-time kitchen display updates are handled by the WebSocket service:
- Kitchen displays connect to `/ws/kitchen`
- Order status changes are automatically broadcasted
- Connection management and error handling included

## Security Features

- JWT-based authentication
- Role-based route protection
- Input validation and sanitization
- SQL injection prevention through parameterized queries
- CORS configuration for secure cross-origin requests

This modular architecture provides a solid foundation for the POS system's continued development and maintenance.