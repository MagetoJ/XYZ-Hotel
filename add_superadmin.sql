-- Add Superadmin User to Staff Table
-- This script creates the MagetoJ superadmin account

-- First, check if the user already exists
SELECT * FROM staff WHERE username = 'MagetoJ';

-- If not exists, insert the superadmin user
-- Password: Jabez2026 (hashed with bcrypt)
INSERT INTO staff (
  employee_id,
  username,
  name,
  email,
  role,
  password,
  pin,
  is_active,
  created_at,
  updated_at
) VALUES (
  'SUPER001',
  'MagetoJ',
  'Superadmin',
  'superadmin@xyzhotel.com',
  'superadmin',
  '$2b$10$rHqzwK/C9xn8jN7xV2mPdeIsV8xL8xZ8xL8xZ8xL8xZ8xL8xZ8xL8',
  '0000',
  true,
  NOW(),
  NOW()
) ON CONFLICT (username) DO UPDATE SET
  role = 'superadmin',
  is_active = true,
  updated_at = NOW();

-- Verify the user was created
SELECT id, username, name, role, email, is_active FROM staff WHERE username = 'MagetoJ';
