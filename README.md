# Therapy Appointment System

## 🚀 Bolt Preview Status
This app has been adapted for Bolt preview environment using Supabase.
See [BOLT_MIGRATION.md](./BOLT_MIGRATION.md) for details.

**Quick Start**: 
```bash
npm install
cp .env.example .env.local
npm run dev
```

**Admin Login**: admin@gmail.com / 12345qwert

## Features
- User authentication and authorization
- Appointment booking system
- Therapist and patient dashboards
- Payment processing with Stripe
- Email notifications
- Calendar integration

## Tech Stack
- Next.js 14
- TypeScript
- Supabase (PostgreSQL)
- NextAuth.js
- Tailwind CSS
- Stripe

## Development
```bash
npm install
cp .env.example .env.local
npm run dev
```

## Environment Variables
Copy `.env.example` to `.env.local` and configure your environment variables. The `.env.example` file contains all the necessary Supabase credentials for Bolt preview.

## Database
The app uses Supabase for data storage. Run `npm run db:migrate` to see the SQL schema that needs to be applied in your Supabase dashboard.
