# ChefBid - Custom Food Marketplace MVP

A production-ready marketplace connecting customers with skilled chefs for custom meal requests.

## Overview

ChefBid is a three-sided marketplace:
- **Customers** describe what they want, receive bids from chefs, approve recipes, and pay
- **Chefs** discover opportunities, submit competitive bids, and track earnings
- **Admins** manage the platform, approve chefs, handle disputes, and monitor analytics

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Customer | `customer@chefbid.com` | `admin123456` |
| Chef (Approved) | `chef@chefbid.com` | `admin123456` |
| Chef (Pending) | `chef_pending@chefbid.com` | `admin123456` |
| Admin | `admin@chefbid.com` | `admin123456` |

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173
```

See [LOCAL_SETUP.md](./LOCAL_SETUP.md) for detailed setup instructions.

## Key Features

### 🛒 Customer Features
- Create detailed food requests with ingredients, allergies, budget, and event type
- Receive bids from multiple chefs
- Compare chef profiles, ratings, and pricing
- Accept best bid and track order in real-time
- Leave reviews and ratings
- Real-time chat with assigned chef

### 👨‍🍳 Chef Features
- Browse marketplace of customer requests
- Submit competitive bids with recipe proposals
- Manage complete profile with specialties and certifications
- Track earnings and payouts
- View order history and customer feedback
- Communicate directly with customers

### 🛡️ Admin Features
- Real-time platform analytics and revenue tracking
- Chef approval workflow with detailed profiles
- User management and suspension
- Dispute resolution system
- Admin audit logs

## Architecture

### Frontend Stack
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite 5
- **Styling:** Tailwind CSS 3
- **Icons:** Lucide React
- **State Management:** React Context + Supabase Realtime

### Backend Stack
- **Database:** Supabase PostgreSQL
- **Authentication:** Supabase Auth (JWT)
- **Authorization:** Row-Level Security (RLS)
- **Real-time:** Supabase Realtime Subscriptions
- **Storage:** Cloudinary (for future image uploads)

## Database Schema

### Users & Profiles
- `profiles` — All user data (customers, chefs, admins)
- `chef_profiles` — Chef-specific details (bio, specialties, earnings)
- `chef_certifications` — Chef qualifications

### Marketplace
- `food_requests` — Customer meal requests
- `request_ingredients` — Ingredients + allergies per request
- `request_images` — Reference photos
- `bids` — Chef bids on requests
- `orders` — Accepted bids
- `payments` — Payment records with escrow
- `consultations` — Optional pre-cooking chef consultations

### Communication & Reviews
- `conversations` — Chat threads linked to orders
- `messages` — Individual chat messages
- `reviews` — Post-completion ratings & feedback
- `notifications` — System alerts

### Management
- `disputes` — Order dispute resolution
- `admin_actions` — Audit log of admin actions
- `ingredient_categories` — Predefined ingredients
- `platform_config` — Settings (fees, limits, etc.)

### Security
✅ RLS enabled on all tables  
✅ Users can only access their own data  
✅ Admin checks embedded in policies  
✅ JWT authentication required  

## Project Structure

```
src/
├── components/
│   ├── Layout.tsx           # Sidebar + header navigation
│   ├── StatCard.tsx         # KPI display card
│   └── StatusBadge.tsx      # Order/request status badges
├── context/
│   └── AuthContext.tsx      # Global auth state & user profile
├── lib/
│   └── supabase.ts          # Supabase client & types
├── pages/
│   ├── auth/
│   │   └── AuthPage.tsx     # Login/register flow
│   ├── customer/
│   │   ├── CustomerDashboard.tsx
│   │   ├── NewRequest.tsx   # 3-step request builder
│   │   ├── MyRequests.tsx
│   │   ├── BidComparison.tsx
│   │   └── Orders.tsx
│   ├── chef/
│   │   ├── ChefDashboard.tsx
│   │   ├── Marketplace.tsx  # Browse requests
│   │   ├── SubmitBid.tsx
│   │   ├── MyBids.tsx
│   │   ├── Earnings.tsx
│   │   └── ChefProfile.tsx
│   ├── admin/
│   │   ├── AdminDashboard.tsx
│   │   ├── ChefApprovals.tsx
│   │   ├── UserManagement.tsx
│   │   └── Disputes.tsx
│   └── shared/
│       ├── ChatPage.tsx     # Real-time messaging
│       ├── NotificationsPage.tsx
│       ├── OrderDetail.tsx  # Full order lifecycle
│       └── ProfilePage.tsx
├── App.tsx                  # Main router & page switcher
├── main.tsx                 # Entry point
└── index.css                # Global styles + fonts
```

## Authentication Flow

1. User registers or logs in with email + password
2. Supabase returns JWT token
3. Token stored in browser session (automatic via Supabase SDK)
4. On page refresh, session restored automatically
5. Role-based UI rendered based on `profile.role`

## Real-time Features

### Chat
- Message subscriptions update conversations instantly
- Typing indicators could be added
- Message read receipts

### Notifications
- New bids, order updates, messages trigger notifications
- Customers notified when bids arrive
- Chefs notified of accepted bids

### Order Status
- Chef updates order status in real-time
- Customer sees progress tracker update instantly

## Payment Flow

### Escrow Architecture
1. Customer initiates payment → Status: `payment_pending`
2. Payment processed via Paystack/Flutterwave → `payment_confirmed`
3. Chef prepares meal → `preparing` → `out_for_delivery` → `delivered`
4. Customer receives & reviews → Status: `completed`
5. Payment released to chef (minus 10% platform fee)

## Pricing Model

- **Platform Fee:** 10% of order value (taken from chef's payout)
- **Consultation Fee:** ₦500–₦2,000 (optional, added to order)

Example: ₦10,000 order
- Chef receives: ₦9,000
- Platform keeps: ₦1,000

## Key Pages & Flows

### Customer: Create Request
1. **Step 1:** Title, description, budget, servings, delivery type
2. **Step 2:** Select ingredients & allergies from predefined categories
3. **Step 3:** Review & submit
→ Nearby chefs receive notifications

### Customer: Accept Bid
1. Browse all bids on a request
2. Compare chef profiles, ratings, costs
3. Click "Accept" → Creates order
4. Rejected bids auto-close

### Chef: Submit Bid
1. View request details & ingredients
2. Propose recipe & preparation approach
3. Break down costs (labour, ingredients, delivery)
4. Send personal message
5. Submit bid

### Order Lifecycle
1. Payment pending → Customer pays with Paystack from `OrderDetail.tsx`
2. Paystack verifies transaction via `paystack-verify`
3. Chef marks "Preparing"
4. Chef marks "Out for Delivery"
5. Chef marks "Delivered"
6. Customer leaves review (4 dimensions: quality, communication, timeliness, overall)
7. Order marked "Completed" → Payment released

## Customization Points

### Payment Integration
- `src/pages/shared/OrderDetail.tsx` already uses `startPaystackCheckout`
- `src/lib/paystack.ts` loads Paystack and calls Supabase functions
- Supabase functions: `paystack-init`, `paystack-verify`, `paystack-webhook`

### Add Image Uploads
- Use Cloudinary for storage
- Upload function in `NewRequest.tsx`
- Display in `BidComparison.tsx`

### Add Email Notifications
- Supabase Edge Functions
- Trigger on order status changes
- Use SendGrid or similar

### Add SMS Notifications
- Twilio integration
- Trigger on bids received, order updates

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Performance

- **Bundle Size:** ~418 KB JavaScript (107 KB gzipped)
- **Time to Interactive:** <2s on 4G
- **Lighthouse Score:** 90+ (with optimization)

## Security Checklist

✅ JWT authentication  
✅ Row-Level Security on all tables  
✅ HTTPS enforced (Supabase)  
✅ SQL injection protection (parameterized queries)  
✅ XSS protection (React escaping)  
✅ CSRF protection (Supabase built-in)  
✅ Rate limiting (can add via Edge Functions)  
✅ Admin audit logs  

## Future Enhancements (Phase 2+)

- AI-powered recipe suggestions
- Advanced search with maps integration
- Video consultations pre-cooking
- Subscription meal plans
- Chef certification verification
- Blockchain-based escrow
- Multi-language support
- Mobile app (React Native)
- Advanced analytics dashboard
- Affiliate referral system

## Deployment

### Quick Deploy (Vercel)
```bash
# Push to GitHub
git push origin main

# In Vercel dashboard:
# 1. Connect repo
# 2. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
# 3. Deploy
```

### Docker
```bash
# Build image
docker build -t chefbid .

# Run container
docker run -p 3000:3000 chefbid
```

See docs for Netlify, AWS Amplify, or traditional hosting.

## Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_FUNCTIONS_URL=https://<your-supabase-project>.functions.supabase.co
VITE_PAYSTACK_PUBLIC_KEY=your_paystack_public_key
PAYSTACK_SECRET_KEY=your_paystack_secret_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

- `VITE_*` values are exposed to the browser.
- `PAYSTACK_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` must be kept secret and used only by Supabase Edge Functions.
- Ensure `paystack-init`, `paystack-verify`, and `paystack-webhook` functions are deployed and configured in Supabase.

## Testing

Manual testing checklist:

**Customer Flow**
- [ ] Register as customer
- [ ] Create food request
- [ ] Receive bids
- [ ] Accept bid
- [ ] Make payment
- [ ] Track order
- [ ] Leave review

**Chef Flow**
- [ ] Register as chef
- [ ] Complete profile
- [ ] Browse marketplace
- [ ] Submit bid
- [ ] Accept/manage orders
- [ ] Update order status
- [ ] Check earnings

**Admin Flow**
- [ ] View dashboard
- [ ] Approve/reject chefs
- [ ] Suspend users
- [ ] Resolve disputes
- [ ] View analytics

## License

Proprietary — All rights reserved

## Support

For issues or questions:
1. Check [LOCAL_SETUP.md](./LOCAL_SETUP.md)
2. Review Supabase docs: https://supabase.com/docs
3. Check logs in browser DevTools Console

---

**Built with ❤️ using React, Supabase, and Tailwind CSS**
