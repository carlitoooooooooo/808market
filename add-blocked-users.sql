-- Add blocked_users array to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS blocked_users text[] default '{}';

-- Add avatar_url and other missing fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text default null;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text default 'user';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_beta_tester boolean default false;

-- Add messages table enhancements
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_admin_message boolean default false;
