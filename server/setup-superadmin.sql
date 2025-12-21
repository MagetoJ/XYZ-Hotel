-- XYZ Hotel POS - Superadmin Setup Script
-- Run this script to set up the superadmin user

-- ============================================================================
-- STEP 1: Set MagetoJ as Superadmin
-- ============================================================================

UPDATE staff 
SET role = 'superadmin', 
    is_active = true,
    updated_at = NOW()
WHERE username = 'MagetoJ';

-- Verify the change
SELECT id, name, username, email, role, is_active, created_at, updated_at 
FROM staff 
WHERE username = 'MagetoJ';

-- ============================================================================
-- STEP 2: Create superadmin role if it doesn't exist (Optional)
-- For PostgreSQL with roles/permissions system
-- ============================================================================

-- This command creates a superadmin if the staff table needs it
-- Most applications handle roles at the application level, not database level
-- Skip this if your database doesn't have a roles/permissions table

-- ============================================================================
-- STEP 3: Verify All Admin/Superadmin Users (Optional)
-- ============================================================================

-- View all admin and superadmin users
SELECT id, name, username, email, role, is_active, created_at 
FROM staff 
WHERE role IN ('admin', 'superadmin') 
ORDER BY role DESC, name ASC;

-- ============================================================================
-- STEP 4: Grant Monitoring Permissions (if using permission system)
-- ============================================================================

-- If your system has a permissions table, grant monitoring access:
-- INSERT INTO staff_permissions (staff_id, permission, created_at)
-- SELECT id, 'monitoring:view', NOW() FROM staff WHERE role = 'superadmin';

-- ============================================================================
-- NOTES:
-- ============================================================================

-- Username: MagetoJ
-- Password: Jabez2026 (already hashed in database)
-- Role: superadmin (full system access)
-- Status: active

-- The superadmin role can access:
-- - All admin functions
-- - System monitoring dashboard
-- - Performance metrics and alerts
-- - Database statistics
-- - Staff management and role assignment
-- - All order management
-- - All inventory functions
-- - Complete reporting access

-- ============================================================================
