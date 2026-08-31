-- Add demo accounts if missing
-- Note: Demo accounts must be created via Supabase dashboard or CLI since migrations cannot directly insert into auth.users
-- This migration creates profile and chef_profile entries that will be linked to demo auth users

-- Create profile rows for demo accounts
WITH inserted_users AS (
  SELECT id, email FROM auth.users WHERE email IN ('customer@chefbid.com', 'chef@chefbid.com', 'chef_pending@chefbid.com', 'admin@chefbid.com')
)
INSERT INTO profiles (id, email, full_name, phone, role, location, is_verified, is_active)
SELECT
  id,
  email,
  CASE
    WHEN email = 'customer@chefbid.com' THEN 'Sarah Johnson'
    WHEN email = 'chef@chefbid.com' THEN 'Chef Adekunle'
    WHEN email = 'chef_pending@chefbid.com' THEN 'Chef Zainab'
    WHEN email = 'admin@chefbid.com' THEN 'Admin User'
    ELSE email
  END,
  CASE
    WHEN email = 'customer@chefbid.com' THEN '+234 701 234 5678'
    WHEN email = 'chef@chefbid.com' THEN '+234 802 987 6543'
    WHEN email = 'chef_pending@chefbid.com' THEN '+234 803 555 7890'
    WHEN email = 'admin@chefbid.com' THEN '+234 700 000 0000'
    ELSE ''
  END,
  CASE
    WHEN email = 'customer@chefbid.com' THEN 'customer'
    WHEN email IN ('chef@chefbid.com', 'chef_pending@chefbid.com') THEN 'chef'
    WHEN email = 'admin@chefbid.com' THEN 'admin'
    ELSE 'customer'
  END,
  'Lagos',
  CASE WHEN email = 'chef_pending@chefbid.com' THEN false ELSE true END,
  true
FROM inserted_users u
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = u.id);

-- Create chef_profiles details for the two chef users
WITH chef_accounts AS (
  SELECT id, email FROM auth.users WHERE email IN ('chef@chefbid.com', 'chef_pending@chefbid.com')
)
INSERT INTO chef_profiles (user_id, bio, years_experience, specialties, service_areas, hourly_rate, is_approved, is_available, total_orders, avg_rating, bank_name, bank_account)
SELECT
  id,
  CASE
    WHEN email = 'chef@chefbid.com' THEN 'Professional chef with 8 years experience. Specializing in Nigerian and continental cuisine. Known for attention to detail and customer satisfaction.'
    ELSE 'Passionate pastry chef with 5 years experience. Specializes in custom cakes, pastries, and desserts for events.'
  END,
  CASE WHEN email = 'chef@chefbid.com' THEN 8 ELSE 5 END,
  CASE
    WHEN email = 'chef@chefbid.com' THEN ARRAY['Nigerian Cuisine', 'Continental', 'Catering']
    ELSE ARRAY['Pastry & Baking', 'Desserts', 'Wedding Cakes']
  END,
  CASE
    WHEN email = 'chef@chefbid.com' THEN ARRAY['Lagos Island', 'VI', 'Lekki', 'Ikoyi']
    ELSE ARRAY['Lagos', 'Ogun State']
  END,
  CASE WHEN email = 'chef@chefbid.com' THEN 15000 ELSE 12000 END,
  CASE WHEN email = 'chef@chefbid.com' THEN true ELSE false END,
  true,
  CASE WHEN email = 'chef@chefbid.com' THEN 42 ELSE 8 END,
  CASE WHEN email = 'chef@chefbid.com' THEN 4.8 ELSE 4.6 END,
  CASE WHEN email = 'chef@chefbid.com' THEN 'GTBank' ELSE 'Access Bank' END,
  CASE WHEN email = 'chef@chefbid.com' THEN '0123456789' ELSE '9876543210' END
FROM chef_accounts c
WHERE NOT EXISTS (SELECT 1 FROM chef_profiles cp WHERE cp.user_id = c.id);
