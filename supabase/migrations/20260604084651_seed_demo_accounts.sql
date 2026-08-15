/*
  # Seed Demo Accounts

  Creates demo user accounts for testing all roles:
  - Customer account
  - Chef accounts (approved and pending)
  - Admin account

  All use password: admin123456

  IMPORTANT: These are for demo/testing only. Do NOT use in production.
*/

-- Helper function to create auth users
DO $$
DECLARE
  customer_id uuid;
  chef_id uuid;
  chef_pending_id uuid;
  admin_id uuid;
BEGIN
  -- Create customer user
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'customer@chefbid.com',
    crypt('admin123456', gen_salt('bf')),
    now(),
    '{}',
    now(),
    now()
  )
  RETURNING id INTO customer_id;

  -- Create approved chef user
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'chef@chefbid.com',
    crypt('admin123456', gen_salt('bf')),
    now(),
    '{}',
    now(),
    now()
  )
  RETURNING id INTO chef_id;

  -- Create pending chef user
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'chef_pending@chefbid.com',
    crypt('admin123456', gen_salt('bf')),
    now(),
    '{}',
    now(),
    now()
  )
  RETURNING id INTO chef_pending_id;

  -- Create admin user
  INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_user_meta_data, created_at, updated_at)
  VALUES (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@chefbid.com',
    crypt('admin123456', gen_salt('bf')),
    now(),
    '{}',
    now(),
    now()
  )
  RETURNING id INTO admin_id;

  -- Create customer profile
  INSERT INTO profiles (id, email, full_name, phone, role, location, is_verified, is_active)
  VALUES (customer_id, 'customer@chefbid.com', 'Sarah Johnson', '+234 701 234 5678', 'customer', 'Lagos', true, true);

  -- Create approved chef profile
  INSERT INTO profiles (id, email, full_name, phone, role, location, is_verified, is_active)
  VALUES (chef_id, 'chef@chefbid.com', 'Chef Adekunle', '+234 802 987 6543', 'chef', 'Lagos', true, true);

  -- Create chef profile details (approved)
  INSERT INTO chef_profiles (user_id, bio, years_experience, specialties, service_areas, hourly_rate, is_approved, is_available, total_orders, avg_rating, bank_name, bank_account)
  VALUES (
    chef_id,
    'Professional chef with 8 years experience. Specializing in Nigerian and continental cuisine. Known for attention to detail and customer satisfaction.',
    8,
    ARRAY['Nigerian Cuisine', 'Continental', 'Catering'],
    ARRAY['Lagos Island', 'VI', 'Lekki', 'Ikoyi'],
    15000,
    true,
    true,
    42,
    4.8,
    'GTBank',
    '0123456789'
  );

  -- Create pending chef profile
  INSERT INTO profiles (id, email, full_name, phone, role, location, is_verified, is_active)
  VALUES (chef_pending_id, 'chef_pending@chefbid.com', 'Chef Zainab', '+234 803 555 7890', 'chef', 'Lagos', false, true);

  -- Create pending chef profile details
  INSERT INTO chef_profiles (user_id, bio, years_experience, specialties, service_areas, hourly_rate, is_approved, is_available, total_orders, avg_rating, bank_name, bank_account)
  VALUES (
    chef_pending_id,
    'Passionate pastry chef with 5 years experience. Specializes in custom cakes, pastries, and desserts for events.',
    5,
    ARRAY['Pastry & Baking', 'Desserts', 'Wedding Cakes'],
    ARRAY['Lagos', 'Ogun State'],
    12000,
    false,
    true,
    8,
    4.6,
    'Access Bank',
    '9876543210'
  );

  -- Create admin profile
  INSERT INTO profiles (id, email, full_name, phone, role, location, is_verified, is_active)
  VALUES (admin_id, 'admin@chefbid.com', 'Admin User', '+234 700 000 0000', 'admin', 'Lagos', true, true);

EXCEPTION WHEN OTHERS THEN
  -- If users already exist, silently continue
  NULL;
END $$;
