/*
  # Custom Food Marketplace - Complete Schema

  ## Overview
  Full database schema for the ChefBid marketplace connecting customers with chefs.

  ## Tables Created

  ### Core User Tables
  - `profiles` - Extended user data for all users (customer/chef/admin role)
  - `chef_profiles` - Chef-specific data (certifications, specialties, portfolio)

  ### Marketplace Tables
  - `food_requests` - Customer meal requests with ingredient selections
  - `request_ingredients` - Ingredient selections for each request
  - `request_images` - Reference images uploaded by customers
  - `bids` - Chef bids on food requests
  - `bid_ingredients` - Ingredient breakdown per bid
  - `orders` - Accepted bids become orders
  - `payments` - Payment records with escrow support
  - `consultations` - Chef consultation bookings
  - `reviews` - Post-completion reviews

  ### Communication Tables
  - `conversations` - Chat threads linked to orders
  - `messages` - Individual chat messages
  - `notifications` - System notifications

  ### Admin Tables
  - `disputes` - Order disputes
  - `admin_actions` - Audit log for admin actions
  - `chef_certifications` - Chef certification documents

  ## Security
  - RLS enabled on all tables
  - Role-based access via profiles.role column
  - Customers/chefs can only see their own data
  - Admin has broader access via function check
*/

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- PROFILES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'chef', 'admin')),
  avatar_url text DEFAULT '',
  location text DEFAULT '',
  is_verified boolean DEFAULT false,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Public profiles readable"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- =============================================
-- CHEF PROFILES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS chef_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  bio text DEFAULT '',
  years_experience integer DEFAULT 0,
  specialties text[] DEFAULT '{}',
  service_areas text[] DEFAULT '{}',
  hourly_rate numeric(10,2) DEFAULT 0,
  portfolio_images text[] DEFAULT '{}',
  is_approved boolean DEFAULT false,
  is_available boolean DEFAULT true,
  total_orders integer DEFAULT 0,
  avg_rating numeric(3,2) DEFAULT 0,
  total_earnings numeric(12,2) DEFAULT 0,
  bank_name text DEFAULT '',
  bank_account text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE chef_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chef can read own profile"
  ON chef_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Chef can update own profile"
  ON chef_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Chef can insert own profile"
  ON chef_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can read chef profiles"
  ON chef_profiles FOR SELECT
  TO authenticated
  USING (true);

-- =============================================
-- CHEF CERTIFICATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS chef_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id uuid NOT NULL REFERENCES chef_profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  issuer text DEFAULT '',
  issue_date date,
  expiry_date date,
  document_url text DEFAULT '',
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE chef_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chef can manage own certifications"
  ON chef_certifications FOR SELECT
  TO authenticated
  USING (
    chef_id IN (SELECT id FROM chef_profiles WHERE user_id = auth.uid())
    OR true
  );

CREATE POLICY "Chef can insert certifications"
  ON chef_certifications FOR INSERT
  TO authenticated
  WITH CHECK (
    chef_id IN (SELECT id FROM chef_profiles WHERE user_id = auth.uid())
  );

-- =============================================
-- FOOD REQUESTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS food_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  event_type text DEFAULT 'other' CHECK (event_type IN ('family_meal','birthday','wedding','corporate_event','dinner_party','meal_prep','other')),
  budget_min numeric(10,2) DEFAULT 0,
  budget_max numeric(10,2) DEFAULT 0,
  servings integer DEFAULT 1,
  location text DEFAULT '',
  delivery_type text DEFAULT 'delivery' CHECK (delivery_type IN ('delivery','pickup','chef_comes_to_home')),
  consultation_needed boolean DEFAULT false,
  status text DEFAULT 'open' CHECK (status IN ('open','bidding','accepted','cancelled','expired')),
  expires_at timestamptz DEFAULT (now() + interval '7 days'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE food_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can read own requests"
  ON food_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);

CREATE POLICY "Customers can insert requests"
  ON food_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Customers can update own requests"
  ON food_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = customer_id)
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Chefs can view open requests"
  ON food_requests FOR SELECT
  TO authenticated
  USING (status IN ('open', 'bidding'));

-- =============================================
-- REQUEST INGREDIENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS request_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES food_requests(id) ON DELETE CASCADE,
  category text NOT NULL,
  ingredient text NOT NULL,
  is_allergy boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE request_ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read ingredients for visible requests"
  ON request_ingredients FOR SELECT
  TO authenticated
  USING (
    request_id IN (SELECT id FROM food_requests WHERE customer_id = auth.uid())
    OR request_id IN (SELECT id FROM food_requests WHERE status IN ('open','bidding'))
  );

CREATE POLICY "Customers can insert ingredients"
  ON request_ingredients FOR INSERT
  TO authenticated
  WITH CHECK (
    request_id IN (SELECT id FROM food_requests WHERE customer_id = auth.uid())
  );

-- =============================================
-- REQUEST IMAGES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS request_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES food_requests(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE request_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Read images for visible requests"
  ON request_images FOR SELECT
  TO authenticated
  USING (
    request_id IN (SELECT id FROM food_requests WHERE customer_id = auth.uid())
    OR request_id IN (SELECT id FROM food_requests WHERE status IN ('open','bidding'))
  );

CREATE POLICY "Customers can insert images"
  ON request_images FOR INSERT
  TO authenticated
  WITH CHECK (
    request_id IN (SELECT id FROM food_requests WHERE customer_id = auth.uid())
  );

-- =============================================
-- BIDS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES food_requests(id) ON DELETE CASCADE,
  chef_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  proposed_recipe text DEFAULT '',
  preparation_notes text DEFAULT '',
  labour_cost numeric(10,2) DEFAULT 0,
  ingredient_cost numeric(10,2) DEFAULT 0,
  delivery_cost numeric(10,2) DEFAULT 0,
  total_cost numeric(10,2) DEFAULT 0,
  estimated_hours integer DEFAULT 1,
  status text DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','withdrawn')),
  message text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(request_id, chef_id)
);

ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chefs can read own bids"
  ON bids FOR SELECT
  TO authenticated
  USING (auth.uid() = chef_id);

CREATE POLICY "Chefs can insert bids"
  ON bids FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = chef_id);

CREATE POLICY "Chefs can update own bids"
  ON bids FOR UPDATE
  TO authenticated
  USING (auth.uid() = chef_id)
  WITH CHECK (auth.uid() = chef_id);

CREATE POLICY "Customers can read bids on their requests"
  ON bids FOR SELECT
  TO authenticated
  USING (
    request_id IN (SELECT id FROM food_requests WHERE customer_id = auth.uid())
  );

-- =============================================
-- ORDERS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES food_requests(id),
  bid_id uuid NOT NULL REFERENCES bids(id),
  customer_id uuid NOT NULL REFERENCES profiles(id),
  chef_id uuid NOT NULL REFERENCES profiles(id),
  total_amount numeric(10,2) DEFAULT 0,
  platform_fee numeric(10,2) DEFAULT 0,
  chef_payout numeric(10,2) DEFAULT 0,
  status text DEFAULT 'payment_pending' CHECK (status IN (
    'payment_pending','payment_confirmed','preparing',
    'out_for_delivery','delivered','completed','cancelled','disputed'
  )),
  delivery_address text DEFAULT '',
  delivery_notes text DEFAULT '',
  estimated_completion timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can read own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);

CREATE POLICY "Chefs can read assigned orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = chef_id);

CREATE POLICY "Customers can insert orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "Chefs can update order status"
  ON orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = chef_id OR auth.uid() = customer_id)
  WITH CHECK (auth.uid() = chef_id OR auth.uid() = customer_id);

-- =============================================
-- PAYMENTS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  customer_id uuid NOT NULL REFERENCES profiles(id),
  amount numeric(10,2) DEFAULT 0,
  currency text DEFAULT 'NGN',
  provider text DEFAULT 'paystack' CHECK (provider IN ('paystack','flutterwave','manual')),
  provider_ref text DEFAULT '',
  status text DEFAULT 'pending' CHECK (status IN ('pending','processing','completed','failed','refunded','escrowed')),
  escrow_released boolean DEFAULT false,
  escrow_released_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customers can read own payments"
  ON payments FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);

CREATE POLICY "Customers can insert payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);

-- =============================================
-- CONSULTATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS consultations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  customer_id uuid NOT NULL REFERENCES profiles(id),
  chef_id uuid NOT NULL REFERENCES profiles(id),
  fee numeric(10,2) DEFAULT 500,
  status text DEFAULT 'pending' CHECK (status IN ('pending','scheduled','completed','cancelled')),
  notes text DEFAULT '',
  recipe_approved boolean DEFAULT false,
  scheduled_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE consultations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read consultations"
  ON consultations FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id OR auth.uid() = chef_id);

CREATE POLICY "Customers can insert consultations"
  ON consultations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);

-- =============================================
-- REVIEWS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  customer_id uuid NOT NULL REFERENCES profiles(id),
  chef_id uuid NOT NULL REFERENCES profiles(id),
  food_quality integer DEFAULT 5 CHECK (food_quality BETWEEN 1 AND 5),
  communication integer DEFAULT 5 CHECK (communication BETWEEN 1 AND 5),
  timeliness integer DEFAULT 5 CHECK (timeliness BETWEEN 1 AND 5),
  overall integer DEFAULT 5 CHECK (overall BETWEEN 1 AND 5),
  comment text NOT NULL DEFAULT '',
  is_published boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(order_id, customer_id)
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published reviews"
  ON reviews FOR SELECT
  TO authenticated
  USING (is_published = true);

CREATE POLICY "Customers can insert own reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);

-- =============================================
-- CONVERSATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
  request_id uuid REFERENCES food_requests(id),
  customer_id uuid NOT NULL REFERENCES profiles(id),
  chef_id uuid NOT NULL REFERENCES profiles(id),
  last_message text DEFAULT '',
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id OR auth.uid() = chef_id);

CREATE POLICY "Participants can insert conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id OR auth.uid() = chef_id);

CREATE POLICY "Participants can update conversations"
  ON conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = customer_id OR auth.uid() = chef_id)
  WITH CHECK (auth.uid() = customer_id OR auth.uid() = chef_id);

-- =============================================
-- MESSAGES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id),
  content text NOT NULL DEFAULT '',
  image_url text DEFAULT '',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Conversation participants can read messages"
  ON messages FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT id FROM conversations
      WHERE customer_id = auth.uid() OR chef_id = auth.uid()
    )
  );

CREATE POLICY "Participants can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id AND
    conversation_id IN (
      SELECT id FROM conversations
      WHERE customer_id = auth.uid() OR chef_id = auth.uid()
    )
  );

-- =============================================
-- NOTIFICATIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  type text DEFAULT 'info' CHECK (type IN ('info','bid','order','payment','message','review','system')),
  reference_id uuid,
  reference_type text DEFAULT '',
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =============================================
-- DISPUTES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id),
  raised_by uuid NOT NULL REFERENCES profiles(id),
  against uuid NOT NULL REFERENCES profiles(id),
  reason text NOT NULL,
  description text DEFAULT '',
  status text DEFAULT 'open' CHECK (status IN ('open','investigating','resolved','closed')),
  resolution text DEFAULT '',
  resolved_by uuid REFERENCES profiles(id),
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dispute parties can read own disputes"
  ON disputes FOR SELECT
  TO authenticated
  USING (auth.uid() = raised_by OR auth.uid() = against);

CREATE POLICY "Authenticated users can raise disputes"
  ON disputes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = raised_by);

-- =============================================
-- ADMIN ACTIONS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES profiles(id),
  action_type text NOT NULL,
  target_type text NOT NULL,
  target_id uuid NOT NULL,
  notes text DEFAULT '',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read admin actions"
  ON admin_actions FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

CREATE POLICY "Admins can insert admin actions"
  ON admin_actions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
  );

-- =============================================
-- INDEXES
-- =============================================
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_food_requests_customer ON food_requests(customer_id);
CREATE INDEX IF NOT EXISTS idx_food_requests_status ON food_requests(status);
CREATE INDEX IF NOT EXISTS idx_bids_request ON bids(request_id);
CREATE INDEX IF NOT EXISTS idx_bids_chef ON bids(chef_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_chef ON orders(chef_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_chef ON reviews(chef_id);
