-- Add Paystack payment, wallet, payout, refund, and transaction log support

-- Extend order status values for payment and payout lifecycle.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'orders_status_check') THEN
    ALTER TABLE orders DROP CONSTRAINT orders_status_check;
  END IF;
END $$;

ALTER TABLE orders
  ADD CONSTRAINT orders_status_check CHECK (status IN (
    'payment_pending', 'payment_failed', 'payment_confirmed',
    'preparing', 'out_for_delivery', 'delivered',
    'payout_pending', 'payout_completed', 'completed',
    'cancelled', 'refunded', 'disputed'
  ));

-- Wallets for chefs
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id uuid UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  available_balance numeric(12,2) DEFAULT 0,
  pending_balance numeric(12,2) DEFAULT 0,
  total_earnings numeric(12,2) DEFAULT 0,
  total_withdrawals numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chef can read own wallet"
  ON wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = chef_id);

CREATE POLICY "Chef can insert own wallet"
  ON wallets FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = chef_id);

CREATE POLICY "Chef can update own wallet"
  ON wallets FOR UPDATE
  TO authenticated
  USING (auth.uid() = chef_id)
  WITH CHECK (auth.uid() = chef_id);

-- Automatically create a wallet record when a chef profile is created
CREATE OR REPLACE FUNCTION create_wallet_for_chef()
RETURNS trigger AS $$
BEGIN
  IF NEW.role = 'chef' THEN
    INSERT INTO wallets (chef_id) VALUES (NEW.id)
    ON CONFLICT (chef_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_wallet_after_chef_profile ON profiles;
CREATE TRIGGER create_wallet_after_chef_profile
AFTER INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION create_wallet_for_chef();

-- Payout requests from chefs
CREATE TABLE IF NOT EXISTS payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chef_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  wallet_id uuid NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','rejected')),
  paystack_transfer_ref text DEFAULT '',
  requested_at timestamptz DEFAULT now(),
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chef can read own payout requests"
  ON payout_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = chef_id);

CREATE POLICY "Chef can insert payout requests"
  ON payout_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = chef_id);

CREATE POLICY "Admins can manage payout requests"
  ON payout_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "Admins can read all payout requests"
  ON payout_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Refund tracking
CREATE TABLE IF NOT EXISTS refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payment_id uuid NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  chef_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  refund_type text NOT NULL CHECK (refund_type IN ('full','partial')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processed','failed')),
  provider_ref text DEFAULT '',
  reason text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Customer can read own refunds"
  ON refunds FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);

CREATE POLICY "Admin can manage refunds"
  ON refunds FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Transaction audit log for Paystack and payout events
CREATE TABLE IF NOT EXISTS transaction_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES orders(id),
  payment_id uuid REFERENCES payments(id),
  customer_id uuid REFERENCES profiles(id),
  chef_id uuid REFERENCES profiles(id),
  event_type text NOT NULL,
  provider text NOT NULL,
  provider_ref text NOT NULL,
  provider_event_id text UNIQUE,
  amount numeric(12,2) DEFAULT 0,
  fee numeric(12,2) DEFAULT 0,
  commission numeric(12,2) DEFAULT 0,
  status text DEFAULT 'pending',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transaction_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read transaction logs"
  ON transaction_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Platform configuration row
CREATE TABLE IF NOT EXISTS platform_config (
  key text PRIMARY KEY,
  commission_rate numeric(5,4) NOT NULL DEFAULT 0.10 CHECK (commission_rate >= 0 AND commission_rate <= 1),
  updated_at timestamptz DEFAULT now()
);

INSERT INTO platform_config (key, commission_rate)
VALUES ('global', 0.10)
ON CONFLICT (key) DO NOTHING;
