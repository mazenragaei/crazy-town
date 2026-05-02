-- Quick SQL to fix admin user authentication
-- Run this in Supabase SQL Editor

-- Delete any existing root user
DELETE FROM auth.users WHERE email = 'admin@crazytown.com';

-- Create admin user directly in auth.users (this triggers the invite email)
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, raw_meta_data)
VALUES (
  'root-admin',
  'admin@crazytown.com',
  -- For password 'mazenragaei', the bcrypt hash needs to be generated
  -- Using a simpler approach: use the dashboard to set password
  -- This inserts the user but they'll need to reset password via email
  crypt('mazenragaei', 'bf'),
  NOW(),
  '{"name": "Root Admin", "roles": ["owner", "admin"]}'::jsonb
) ON CONFLICT (id) DO UPDATE SET email = 'admin@crazytown.com';

-- Alternative: Update existing user's password directly
-- Note: In Supabase, you should use the dashboard or auth API to set passwords

-- Check if user exists
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 10;
