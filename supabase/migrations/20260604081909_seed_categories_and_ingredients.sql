/*
  # Seed Data - Ingredient Categories and Platform Config

  Adds:
  - ingredient_categories: predefined ingredient options for the request builder
  - platform_config: key-value settings for fee percentages, etc.
*/

CREATE TABLE IF NOT EXISTS ingredient_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  options text[] NOT NULL DEFAULT '{}',
  is_allergy_category boolean DEFAULT false,
  sort_order integer DEFAULT 0
);

ALTER TABLE ingredient_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ingredient categories"
  ON ingredient_categories FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO ingredient_categories (name, slug, options, is_allergy_category, sort_order) VALUES
('Pasta', 'pasta', ARRAY['Penne','Spaghetti','Fettuccine','Linguine','Macaroni','Rigatoni','Fusilli','Tagliatelle'], false, 1),
('Protein', 'protein', ARRAY['Chicken','Beef','Fish','Shrimp','Crab','Turkey','Goat Meat','Lamb','Pork','Tofu'], false, 2),
('Vegetables', 'vegetables', ARRAY['Tomatoes','Onions','Garlic','Bell Pepper','Mushrooms','Spinach','Broccoli','Carrots','Zucchini','Eggplant','Cabbage','Kale'], false, 3),
('Spices & Herbs', 'spices', ARRAY['Thyme','Rosemary','Basil','Oregano','Cumin','Coriander','Turmeric','Paprika','Cayenne','Ginger','Bay Leaves','Curry'], false, 4),
('Grains & Sides', 'grains', ARRAY['White Rice','Brown Rice','Fried Rice','Jollof Rice','Couscous','Quinoa','Plantain','Yam','Potatoes','Bread'], false, 5),
('Sauces & Bases', 'sauces', ARRAY['Tomato Sauce','Cream Sauce','Peanut Sauce','Pepper Sauce','Coconut Milk','Tomato Paste','Stock/Broth'], false, 6),
('Allergies', 'allergies', ARRAY['Nuts','Seafood','Dairy','Eggs','Gluten','Soy','Sesame'], true, 7)
ON CONFLICT (slug) DO NOTHING;

-- Platform config table
CREATE TABLE IF NOT EXISTS platform_config (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text DEFAULT '',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read platform config"
  ON platform_config FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO platform_config (key, value, description) VALUES
('platform_fee_percent', '10', 'Platform fee percentage taken from each order'),
('min_consultation_fee', '500', 'Minimum consultation fee in NGN'),
('max_consultation_fee', '2000', 'Maximum consultation fee in NGN'),
('bid_expiry_hours', '48', 'Hours before a bid expires'),
('request_expiry_days', '7', 'Days before a food request expires')
ON CONFLICT (key) DO NOTHING;
