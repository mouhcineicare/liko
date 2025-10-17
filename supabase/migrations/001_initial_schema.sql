-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT,
  telephone TEXT,
  role TEXT NOT NULL CHECK (role IN ('patient', 'therapist', 'admin')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'banned')),
  email_verified BOOLEAN DEFAULT false,
  verification_token TEXT,
  avatar TEXT,
  date_of_birth DATE,
  gender TEXT,
  -- Therapist-specific fields
  summary TEXT,
  specialties TEXT[],
  level TEXT,
  completed_sessions INTEGER DEFAULT 0,
  weekly_patients_limit INTEGER DEFAULT 10,
  -- Integration fields
  google_refresh_token TEXT,
  stripe_account_id TEXT,
  stripe_customer_id TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  therapist_id UUID REFERENCES users(id) ON DELETE SET NULL,
  date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'unpaid' CHECK (status IN (
    'unpaid', 'pending', 'pending_match', 'matched_pending_therapist_acceptance',
    'pending_scheduling', 'confirmed', 'completed', 'cancelled', 'expired'
  )),
  payment_status TEXT DEFAULT 'unpaid',
  is_paid BOOLEAN DEFAULT false,
  payment_intent_id TEXT,
  meeting_link TEXT,
  calendar_event_id TEXT,
  total_sessions INTEGER DEFAULT 1,
  completed_sessions INTEGER DEFAULT 0,
  session_count INTEGER DEFAULT 1,
  recurring JSONB DEFAULT '[]',
  payment JSONB,
  therapist_validated BOOLEAN DEFAULT false,
  payout_status TEXT DEFAULT 'pending',
  status_transition_history JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Balance table
CREATE TABLE IF NOT EXISTS balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  amount DECIMAL(10, 2) DEFAULT 0,
  currency TEXT DEFAULT 'AED',
  transactions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment logs table
CREATE TABLE IF NOT EXISTS payment_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'AED',
  payment_method TEXT,
  payment_intent_id TEXT,
  status TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin settings table
CREATE TABLE IF NOT EXISTS admin_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  balance_rate DECIMAL(5, 2) DEFAULT 1.00,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_therapist ON appointments(therapist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(date);
CREATE INDEX IF NOT EXISTS idx_balances_user ON balances(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_logs_user ON payment_logs(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Permissive for now - tighten in production)
CREATE POLICY "Allow all for authenticated users" ON users FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON appointments FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON balances FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON payment_logs FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON settings FOR ALL USING (true);
CREATE POLICY "Allow all for authenticated users" ON admin_settings FOR ALL USING (true);
