-- Add location and verification fields needed for premium map experiences and chef approval workflows

ALTER TABLE chef_profiles
ADD COLUMN IF NOT EXISTS current_lat numeric(10,6),
ADD COLUMN IF NOT EXISTS current_lng numeric(10,6),
ADD COLUMN IF NOT EXISTS online_status text NOT NULL DEFAULT 'offline' CHECK (online_status IN ('offline','available','traveling','on_job')),
ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'pending' CHECK (verification_status IN ('pending','approved','rejected','suspended')),
ADD COLUMN IF NOT EXISTS verification_reason text DEFAULT '',
ADD COLUMN IF NOT EXISTS verification_notes text DEFAULT '',
ADD COLUMN IF NOT EXISTS last_location_updated timestamptz;

ALTER TABLE food_requests
ADD COLUMN IF NOT EXISTS delivery_lat numeric(10,6),
ADD COLUMN IF NOT EXISTS delivery_lng numeric(10,6),
ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;

CREATE INDEX IF NOT EXISTS idx_chef_profiles_online_status ON chef_profiles(online_status);
CREATE INDEX IF NOT EXISTS idx_food_requests_delivery_coords ON food_requests(delivery_lat, delivery_lng);
