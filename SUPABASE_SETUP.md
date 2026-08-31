# Supabase Setup Guide

Complete steps to set up Supabase for the ChefBid project.

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in with GitHub/Google
3. Click **New Project**
4. Fill in details:
   - **Name:** `chefbid` (or your preference)
   - **Database Password:** Create a strong password (save this!)
   - **Region:** Choose closest to your users (e.g., `us-east-1`)
5. Click **Create new project** and wait 2-3 minutes for initialization

## Step 2: Get Your Credentials

After project creation:

1. Go to **Project Settings** (gear icon)
2. Click **API** in left sidebar
3. Copy and save:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Anon public key** → `VITE_SUPABASE_ANON_KEY`

Example:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 3: Set Environment Variables

1. Open `.env` in the project root
2. Update with your credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   VITE_SUPABASE_SCHEMA=public
   ```
3. Save and **never commit** this file to Git

## Step 4: Run Database Migrations

### Option A: Via Supabase Dashboard (Easiest)

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy-paste the SQL from `/supabase/migrations/`:
   - `20260604081851_create_marketplace_schema.sql` (creates tables)
   - `20260604081909_seed_categories_and_ingredients.sql` (ingredient data)
   - `20260604084651_seed_demo_accounts.sql` (demo users)
   - `20260604100000_add_demo_accounts.sql` (demo accounts backup)
4. Run each query and verify success

### Option B: Via CLI (Requires Authentication)

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Login to Supabase
supabase login

# Link project to local directory
cd /Users/Seidu/Documents/NEXTRAIL/chefbid
supabase link --project-ref your-project-id

# Push all migrations
supabase db push
```

## Step 5: Verify Database Setup

In Supabase dashboard:

1. **Table Editor** - Check these tables exist:
   - `auth.users` (Supabase auth)
   - `profiles` (user data)
   - `chef_profiles` (chef details)
   - `food_requests` (customer requests)
   - `bids`, `orders`, `messages`, etc.

2. **Authentication** - Users should show:
   - `customer@chefbid.com`
   - `chef@chefbid.com`
   - `chef_pending@chefbid.com`
   - `admin@chefbid.com`

3. **Profiles** - 4 demo profiles with correct roles and data

## Step 6: Enable Row-Level Security (RLS)

Supabase RLS should already be enabled by the migrations. Verify in **Authentication → Policies**:

- Each table should have policies restricting access by `auth.uid()`
- Customers can only see their own data
- Chefs can only access their profiles

## Step 7: Configure Storage (Optional)

For future image uploads:

1. In Supabase, go to **Storage**
2. Create bucket: `avatars`
3. Set visibility: **Public** (for profile pictures)
4. Add CORS policy if uploading from frontend

## Step 8: Test the Connection

Start the dev server:

```bash
npm run dev
```

Open http://localhost:5173 and test login with:

| Email | Password |
|-------|----------|
| `customer@chefbid.com` | `admin123456` |
| `chef@chefbid.com` | `admin123456` |
| `admin@chefbid.com` | `admin123456` |

Expected behaviors:
- ✅ Login succeeds
- ✅ Dashboard loads with correct role-based UI
- ✅ Can view profile data
- ✅ Real-time subscriptions work (chat, notifications)

## Step 9: Troubleshooting

### "Database connection failed"
- Check `.env` credentials are correct
- Verify project URL matches dashboard
- Ensure `VITE_SUPABASE_SCHEMA=public`

### "Auth users not found"
- Migrations may not have run
- Check Supabase SQL Editor for errors
- Re-run the seed migrations

### "RLS policy denied"
- Check RLS policies in Authentication → Policies
- Verify policies allow authenticated users
- May need to add custom policies for specific tables

### "Real-time subscriptions not working"
- Enable Realtime in Supabase Settings
- Verify broadcast policies exist

## Useful Links

- **Supabase Dashboard:** https://app.supabase.com
- **Supabase Docs:** https://supabase.com/docs
- **PostgreSQL Docs:** https://www.postgresql.org/docs
- **ChefBid Setup:** See [LOCAL_SETUP.md](./LOCAL_SETUP.md)

## Next Steps

1. ✅ Database tables created
2. ✅ Demo accounts seeded
3. ⏳ Deploy to Vercel/production
4. ⏳ Set up email notifications
5. ⏳ Configure payment gateway (Paystack/Flutterwave)
