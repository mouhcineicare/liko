# Therapy Appointment System

## 🚀 Bolt Preview Status
This app has been adapted for Bolt preview environment using Supabase.
See [BOLT_MIGRATION.md](./BOLT_MIGRATION.md) for details.

**Quick Start**: `yarn install && yarn dev`
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
yarn install
yarn dev
```

## Environment Variables
Copy `.env.example` to `.env` and configure your environment variables.

## Database
The app uses Supabase for data storage. Run `yarn db:migrate` to see the SQL schema that needs to be applied in your Supabase dashboard.
