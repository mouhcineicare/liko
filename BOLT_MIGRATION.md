# Bolt Preview Migration Guide

## What Changed
- ✅ Removed react-rte (React 18 incompatible)
- ✅ Migrated from MongoDB to Supabase
- ✅ Created Supabase schema for core tables
- ✅ Updated authentication to use Supabase
- ⚠️  Most API routes still need migration (marked with TODO)

## Quick Start in Bolt
1. Pull latest code
2. Run `npm install`
3. Run `cp .env.example .env.local` (creates environment file)
4. Run `npm run db:seed` (creates admin user)
5. Run `npm run dev`
6. Login: admin@gmail.com / 12345qwert

## What Works
- App builds and runs
- Admin login/authentication
- Basic user management
- Settings pages

## What Needs Work
- Full appointment API migration
- Stripe integration (keys needed)
- Email notifications (SMTP needed)
- Google Calendar sync
- Pusher real-time features

## Environment Variables
All placeholders are in `.env` - replace with real keys for full functionality.

## Database Schema
The Supabase schema includes:
- users table (with roles: patient, therapist, admin)
- appointments table (with status tracking)
- balances table (for payments)
- payment_logs table
- settings and admin_settings tables

## Migration Status
- ✅ Authentication system migrated
- ✅ User signup migrated
- ⚠️ Appointment booking (needs migration)
- ⚠️ Payment processing (needs Stripe keys)
- ⚠️ Email notifications (needs SMTP)
- ⚠️ Calendar integration (needs Google OAuth)

## Next Steps
1. Apply the SQL schema in Supabase dashboard
2. Configure real API keys for external services
3. Gradually migrate remaining API routes
4. Test all user flows
