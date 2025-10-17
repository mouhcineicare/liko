# 🚀 BOLT PREVIEW SETUP GUIDE

## ⚠️ IMPORTANT: If npm install gets stuck

If you see warnings about deprecated packages or npm install hangs, try these solutions:

### Solution 1: Force install with legacy peer deps
```bash
npm install --legacy-peer-deps
```

### Solution 2: Clear cache and reinstall
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

### Solution 3: Use npm with force flag
```bash
npm install --force
```

## 🔧 Environment Setup

### Step 1: Copy environment file
```bash
cp .env.example .env.local
```

### Step 2: Verify environment variables
The `.env.local` should contain:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://0ec90b57d6e95fcbda19832f.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw
NEXTAUTH_SECRET=bolt_preview_secret_key_change_in_production_123456789
NEXTAUTH_URL=http://localhost:3000
```

## 🗄️ Database Setup

### Apply Supabase Schema
Run this command to see the SQL schema:
```bash
npm run db:migrate
```

Then apply the SQL in your Supabase dashboard.

### Create Admin User
```bash
npm run db:seed
```

## 🚀 Start Development Server

### Option 1: Standard start
```bash
npm run dev
```

### Option 2: If you get memory issues
```bash
NODE_OPTIONS='--max-old-space-size=4096' npm run dev
```

## 🔑 Admin Access
- **Email**: admin@gmail.com
- **Password**: 12345qwert

## 🐛 Troubleshooting

### If build fails:
1. Check if all environment variables are set
2. Verify Supabase connection
3. Try: `npm run build --verbose`

### If authentication fails:
1. Verify NEXTAUTH_SECRET is set
2. Check Supabase credentials
3. Ensure admin user was created

### If database errors:
1. Apply the SQL schema in Supabase
2. Check RLS policies
3. Verify table permissions

## 📱 Expected Result
- Homepage loads at http://localhost:3000
- Signin page works at http://localhost:3000/auth/signin
- Admin dashboard accessible after login
- No console errors about missing dependencies

## 🔄 Alternative Bolt Database Configuration
If you need to use a different Bolt database instance, update these in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-bolt-database-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-bolt-database-anon-key
```

## 📞 Support
If you encounter issues:
1. Check the console for specific error messages
2. Verify all environment variables are set
3. Ensure Supabase database is properly configured
4. Try the troubleshooting steps above
