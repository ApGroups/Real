import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseSchema = import.meta.env.VITE_SUPABASE_SCHEMA ?? 'public';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: supabaseSchema,
  },
});

export type UserRole = 'customer' | 'chef' | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  role: UserRole;
  avatar_url: string;
  location: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChefProfile {
  id: string;
  user_id: string;
  bio: string;
  years_experience: number;
  specialties: string[];
  service_areas: string[];
  hourly_rate: number;
  portfolio_images: string[];
  is_approved: boolean;
  is_available: boolean;
  online_status: 'offline' | 'available' | 'traveling' | 'on_job';
  current_lat?: number;
  current_lng?: number;
  last_location_updated?: string;
  verification_status: 'pending' | 'approved' | 'rejected' | 'suspended';
  verification_reason: string;
  verification_notes: string;
  total_orders: number;
  avg_rating: number;
  total_earnings: number;
  bank_name: string;
  bank_account: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface FoodRequest {
  id: string;
  customer_id: string;
  title: string;
  description: string;
  event_type: string;
  budget_min: number;
  budget_max: number;
  servings: number;
  location: string;
  delivery_type: string;
  consultation_needed: boolean;
  delivery_lat?: number;
  delivery_lng?: number;
  scheduled_for?: string;
  status: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  request_ingredients?: RequestIngredient[];
  request_images?: RequestImage[];
  bids?: Bid[];
}

export interface RequestIngredient {
  id: string;
  request_id: string;
  category: string;
  ingredient: string;
  is_allergy: boolean;
}

export interface RequestImage {
  id: string;
  request_id: string;
  image_url: string;
}

export interface Bid {
  id: string;
  request_id: string;
  chef_id: string;
  proposed_recipe: string;
  preparation_notes: string;
  labour_cost: number;
  ingredient_cost: number;
  delivery_cost: number;
  total_cost: number;
  estimated_hours: number;
  status: string;
  message: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile & { chef_profiles?: ChefProfile };
  chef_profiles?: ChefProfile;
}

export interface Order {
  id: string;
  request_id: string;
  bid_id: string;
  customer_id: string;
  chef_id: string;
  total_amount: number;
  platform_fee: number;
  chef_payout: number;
  status: string;
  delivery_address: string;
  delivery_notes: string;
  estimated_completion: string;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string;
  created_at: string;
  updated_at: string;
  food_requests?: FoodRequest;
  bids?: Bid;
  customer?: Profile;
  chef?: Profile;
}

export interface Payment {
  id: string;
  order_id: string;
  customer_id: string;
  amount: number;
  currency: string;
  provider: string;
  provider_ref: string;
  status: string;
  escrow_released: boolean;
  escrow_released_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  chef_id: string;
  available_balance: number;
  pending_balance: number;
  total_earnings: number;
  total_withdrawals: number;
  updated_at: string;
}

export interface PayoutRequest {
  id: string;
  chef_id: string;
  wallet_id: string;
  amount: number;
  status: string;
  paystack_transfer_ref: string;
  requested_at: string;
  approved_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Refund {
  id: string;
  order_id: string;
  payment_id: string;
  customer_id: string;
  chef_id: string;
  amount: number;
  refund_type: string;
  status: string;
  provider_ref: string;
  reason: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionLog {
  id: string;
  order_id: string;
  payment_id: string | null;
  customer_id: string | null;
  chef_id: string | null;
  event_type: string;
  provider: string;
  provider_ref: string;
  provider_event_id: string;
  amount: number;
  fee: number;
  commission: number;
  status: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface PlatformConfig {
  key: string;
  commission_rate: number;
  updated_at: string;
}

export interface Review {
  id: string;
  order_id: string;
  customer_id: string;
  chef_id: string;
  food_quality: number;
  communication: number;
  timeliness: number;
  overall: number;
  comment: string;
  is_published: boolean;
  created_at: string;
  profiles?: Profile;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  image_url: string;
  is_read: boolean;
  created_at: string;
  profiles?: Profile;
}

export interface Conversation {
  id: string;
  order_id: string | null;
  request_id: string | null;
  customer_id: string;
  chef_id: string;
  last_message: string;
  last_message_at: string;
  created_at: string;
  customer?: Profile;
  chef?: Profile;
  messages?: Message[];
}

export interface Notification {
  id: string;
  user_id: string;
  created_by: string | null;
  title: string;
  body: string;
  type: string;
  reference_id: string | null;
  reference_type: string;
  is_read: boolean;
  created_at: string;
}
