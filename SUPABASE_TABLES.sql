-- Supabase SQL for Crazy Town Application
-- Run this in your Supabase SQL Editor

-- 1. Create app_kv table for key-value storage (users, bookings, settings, etc.)
CREATE TABLE IF NOT EXISTS app_kv (
  id TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create users table
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  password TEXT,
  rank TEXT DEFAULT 'Recruit',
  roles TEXT[] DEFAULT ARRAY['player'],
  profile_image TEXT,
  balance NUMERIC DEFAULT 0,
  is_banned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id TEXT PRIMARY KEY,
  ticket_id TEXT,
  user_id TEXT REFERENCES public.users(id),
  player_no INTEGER,
  name TEXT,
  phone TEXT,
  date TEXT,
  time TEXT,
  players TEXT,
  mission TEXT,
  notes TEXT,
  payment_method TEXT,
  discount_code TEXT,
  base_price NUMERIC,
  price NUMERIC,
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create orders table for shop
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.users(id),
  items JSONB,
  total NUMERIC,
  delivery JSONB,
  status TEXT DEFAULT 'Pending Confirmation',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create inventory table
CREATE TABLE IF NOT EXISTS public.inventory (
  id TEXT PRIMARY KEY,
  name TEXT,
  qty INTEGER DEFAULT 0,
  price NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create leaderboard table
CREATE TABLE IF NOT EXISTS public.leaderboard (
  id TEXT PRIMARY KEY,
  name TEXT,
  points INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id TEXT PRIMARY KEY,
  name TEXT,
  captain_id TEXT,
  members TEXT[],
  invited_ids TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Create tournaments table
CREATE TABLE IF NOT EXISTS public.tournaments (
  id TEXT PRIMARY KEY,
  name TEXT,
  date TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Create tournament registrations
CREATE TABLE IF NOT EXISTS public.tournament_regs (
  id TEXT PRIMARY KEY,
  tournament_id TEXT,
  team_id TEXT,
  captain_id TEXT,
  status TEXT DEFAULT 'registered',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Create news table
CREATE TABLE IF NOT EXISTS public.news (
  id TEXT PRIMARY KEY,
  title TEXT,
  body TEXT,
  date TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Create coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE,
  type TEXT,
  value NUMERIC,
  active BOOLEAN DEFAULT TRUE,
  target_group TEXT,
  target_user_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Create friends table
CREATE TABLE IF NOT EXISTS public.friends (
  id TEXT PRIMARY KEY,
  from_user_id TEXT,
  to_user_id TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Create chat messages table
CREATE TABLE IF NOT EXISTS public.chat (
  id TEXT PRIMARY KEY,
  sender TEXT,
  text TEXT,
  type TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Create activity log table
CREATE TABLE IF NOT EXISTS public.activity (
  id TEXT PRIMARY KEY,
  action TEXT,
  actor TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS) - Optional, can be disabled for development
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Allow public read access (for development)
-- CREATE POLICY "Allow public read users" ON public.users FOR SELECT USING (true);
-- CREATE POLICY "Allow public read bookings" ON public.bookings FOR SELECT USING (true);
-- CREATE POLICY "Allow public read orders" ON public.orders FOR SELECT USING (true);

-- Insert default admin user
INSERT INTO public.users (id, name, email, phone, password, rank, roles, balance)
VALUES ('root-admin', 'Root Admin', 'root@crazytown.local', '+201000000000', 'mazenragaei', 'Commander', ARRAY['owner', 'admin'], 0)
ON CONFLICT (email) DO NOTHING;

-- Insert default leaderboard entries
INSERT INTO public.leaderboard (id, name, points) VALUES
('lb-1', 'Mazen Ragaei', 12500),
('lb-2', 'Abdallah Essam', 11300),
('lb-3', 'Shahd Yasser', 10850)
ON CONFLICT (id) DO NOTHING;

-- Insert default coupon
INSERT INTO public.coupons (id, code, type, value, active) VALUES
('coup-1', 'CRAZY10', 'percent', 10, true)
ON CONFLICT (id) DO NOTHING;

-- Insert sample news
INSERT INTO public.news (id, title, body) VALUES
('n-1', 'Spring Tactical Cup', 'Registration is now open!'),
('n-2', 'New Pharaoh Arena Update', 'Season 2 map improvements are live.')
ON CONFLICT (id) DO NOTHING;

-- Insert sample tournaments
INSERT INTO public.tournaments (id, name, date) VALUES
('t-1', 'Crazy Weekly Cup', (NOW() + INTERVAL '7 days')::date::text),
('t-2', 'Pharaoh Clash Finals', (NOW() + INTERVAL '14 days')::date::text)
ON CONFLICT (id) DO NOTHING;

-- Verify tables created
SELECT 
  table_name, 
  (SELECT COUNT(*)::int FROM information_schema.tables WHERE table_schema = 'public' AND table_name = t.table_name) as exists
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;
