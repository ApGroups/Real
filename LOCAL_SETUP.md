# ChefBid - Local Development Setup Guide

## Prerequisites

- Node.js 18+ ([Download](https://nodejs.org/))
- npm or yarn
- Git (optional)
- Supabase account (free tier available at [supabase.com](https://supabase.com))

## Quick Start (5 minutes)

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Variables

The `.env` file is already configured with Supabase credentials:

```
VITE_SUPABASE_URL=https://eiftcklhsgnvkiioytzw.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

✅ **No additional setup needed** — your Supabase project is ready to use.

### 3. Start Development Server

```bash
npm run dev
```

The app will open at `http://localhost:5173`

## Demo Credentials

Use these accounts to test all features:

### Customer
- **Email:** `customer@chefbid.com`
- **Password:** `admin123456`

### Chef (Approved)
- **Email:** `chef@chefbid.com`
- **Password:** `admin123456`

### Chef (Pending Approval)
- **Email:** `chef_pending@chefbid.com`
- **Password:** `admin123456`

### Admin
- **Email:** `admin@chefbid.com`
- **Password:** `admin123456`

## Available Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview

# Run TypeScript type checking
npm run typecheck

# Run ESLint
npm run lint
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Layout.tsx       # Sidebar + header layout
│   ├── StatCard.tsx     # Dashboard stats card
│   └── StatusBadge.tsx  # Status indicator badge
├── context/             # React context for auth
│   └── AuthContext.tsx  # Authentication state
├── lib/                 # Utilities & clients
│   └── supabase.ts      # Supabase client & types
├── pages/               # Page components
│   ├── auth/
│   │   └── AuthPage.tsx
│   ├── customer/        # Customer-specific pages
│   ├── chef/            # Chef-specific pages
│   ├── admin/           # Admin-specific pages
│   └── shared/          # Pages used by multiple roles
├── App.tsx              # Main app router
└── main.tsx             # Entry point
```

## Features Included

### Customer Features
✅ Create custom food requests with ingredients & allergies  
✅ View bids from chefs  
✅ Compare chef profiles, ratings, pricing  
✅ Accept bids and manage orders  
✅ Track order status in real-time  
✅ Leave reviews and ratings  
✅ Chat with chefs  

### Chef Features
✅ Browse open food requests  
✅ Submit competitive bids  
✅ Manage profile & specialties  
✅ Track earnings & payouts  
✅ View order history & ratings  
✅ Chat with customers  

### Admin Features
✅ View platform analytics  
✅ Approve/reject chefs  
✅ Suspend users  
✅ Manage disputes  
✅ Track revenue  

## Database Schema

The Supabase database includes:

**Core Tables:**
- `auth.users` — Supabase auth users
- `profiles` — User profiles (customer/chef/admin)
- `chef_profiles` — Chef-specific data
- `food_requests` — Customer meal requests
- `bids` — Chef bids on requests
- `orders` — Accepted bids become orders
- `payments` — Payment records with escrow

**Communication:**
- `conversations` — Chat threads
- `messages` — Individual messages
- `notifications` — System alerts

**Management:**
- `reviews` — Post-order reviews
- `disputes` — Order disputes
- `admin_actions` — Audit log

## Troubleshooting

### Port Already in Use
If port 5173 is busy, Vite will use the next available port. Check terminal output.

### Supabase Connection Fails
1. Verify `.env` has correct credentials
2. Check Supabase project status: https://app.supabase.com
3. Ensure your IP isn't blocked (free tier doesn't restrict IPs)

### Database Errors
- Supabase might need a few minutes to initialize
- Refresh the browser and try again
- Check the [Supabase Dashboard](https://app.supabase.com) Status page

### TypeScript Errors
Run type checking:
```bash
npm run typecheck
```

Fix any import errors or missing types.

## Production Build

```bash
npm run build
```

Creates optimized production bundle in `dist/` folder.

Preview production build:
```bash
npm run preview
```

## Deployment Options

### Vercel (Recommended)
1. Push code to GitHub
2. Connect repo to Vercel
3. Set environment variables in Vercel dashboard
4. Deploy with one click

### Other Options
- Netlify
- AWS Amplify
- Docker + any cloud provider
- Traditional VPS

## Need Help?

- **Supabase Docs:** https://supabase.com/docs
- **React Docs:** https://react.dev
- **Tailwind CSS:** https://tailwindcss.com/docs

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth (Email/Password)
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Real-time:** Supabase Realtime Subscriptions

---

**Ready to start?** Run `npm run dev` and log in with any demo account above!
