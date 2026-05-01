-- ============================================
-- CRAZY TOWN - COMPLETE DATABASE SETUP
-- ============================================
-- Run this in Supabase SQL Editor
-- Project: gldwdwcpzcxcvqpcpiol
-- ============================================

-- 1. APP_KV TABLE - Key-Value Storage
DROP TABLE IF EXISTS app_kv CASCADE;
CREATE TABLE app_kv (
  id TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE app_kv ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read/write on app_kv" ON app_kv FOR ALL USING (true) WITH CHECK (true);

-- 2. USERS TABLE
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT UNIQUE,
  password TEXT NOT NULL,
  rank TEXT DEFAULT 'Recruit',
  roles TEXT[] DEFAULT ARRAY['player'],
  profile_image TEXT,
  balance NUMERIC DEFAULT 0,
  is_banned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read on users" ON users FOR SELECT USING (true);
CREATE POLICY "Allow public insert users" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update own user" ON users FOR UPDATE USING (auth.uid()::text = id);

-- 3. BOOKINGS TABLE
DROP TABLE IF EXISTS bookings CASCADE;
CREATE TABLE bookings (
  id TEXT PRIMARY KEY,
  ticket_id TEXT,
  user_id TEXT,
  player_no INTEGER,
  name TEXT NOT NULL,
  phone TEXT,
  date TEXT,
  time TEXT,
  players TEXT,
  mission TEXT,
  notes TEXT,
  payment_method TEXT,
  discount_code TEXT,
  base_price NUMERIC DEFAULT 0,
  price NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read bookings" ON bookings FOR SELECT USING (true);
CREATE POLICY "Allow public insert bookings" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update bookings" ON bookings FOR UPDATE USING (true);

-- 4. ORDERS TABLE - Shop Orders
DROP TABLE IF EXISTS orders CASCADE;
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  items JSONB DEFAULT '[]',
  total NUMERIC DEFAULT 0,
  delivery JSONB,
  status TEXT DEFAULT 'Pending Confirmation',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read orders" ON orders FOR SELECT USING (true);
CREATE POLICY "Allow public insert orders" ON orders FOR INSERT WITH CHECK (true);

-- 5. INVENTORY TABLE
DROP TABLE IF EXISTS inventory CASCADE;
CREATE TABLE inventory (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  qty INTEGER DEFAULT 0,
  price NUMERIC DEFAULT 0,
  category TEXT,
  description TEXT,
  image_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read inventory" ON inventory FOR SELECT USING (true);
CREATE POLICY "Allow public insert inventory" ON inventory FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update inventory" ON inventory FOR UPDATE USING (true);

-- 6. LEADERBOARD TABLE
DROP TABLE IF EXISTS leaderboard CASCADE;
CREATE TABLE leaderboard (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  points INTEGER DEFAULT 0,
  kills INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  matches INTEGER DEFAULT 0,
  kd_ratio NUMERIC DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read leaderboard" ON leaderboard FOR SELECT USING (true);
CREATE POLICY "Allow admin write leaderboard" ON leaderboard FOR ALL USING (true);

-- 7. TEAMS TABLE
DROP TABLE IF EXISTS teams CASCADE;
CREATE TABLE teams (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  captain_id TEXT,
  members TEXT[] DEFAULT ARRAY[]::TEXT[],
  invited_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Allow public insert teams" ON teams FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update teams" ON teams FOR UPDATE USING (true);

-- 8. TOURNAMENTS TABLE
DROP TABLE IF EXISTS tournaments CASCADE;
CREATE TABLE tournaments (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  date TEXT,
  description TEXT,
  prize_pool NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Upcoming',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read tournaments" ON tournaments FOR SELECT USING (true);
CREATE POLICY "Allow admin write tournaments" ON tournaments FOR ALL USING (true);

-- 9. TOURNAMENT_REGS TABLE
DROP TABLE IF EXISTS tournament_regs CASCADE;
CREATE TABLE tournament_regs (
  id TEXT PRIMARY KEY,
  tournament_id TEXT,
  team_id TEXT,
  captain_id TEXT,
  status TEXT DEFAULT 'registered',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE tournament_regs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read regs" ON tournament_regs FOR SELECT USING (true);
CREATE POLICY "Allow public insert regs" ON tournament_regs FOR INSERT WITH CHECK (true);

-- 10. NEWS TABLE
DROP TABLE IF EXISTS news CASCADE;
CREATE TABLE news (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT,
  author TEXT DEFAULT 'Admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read news" ON news FOR SELECT USING (true);
CREATE POLICY "Allow admin write news" ON news FOR ALL USING (true);

-- 11. COUPONS TABLE
DROP TABLE IF EXISTS coupons CASCADE;
CREATE TABLE coupons (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  type TEXT DEFAULT 'percent',
  value NUMERIC DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  target_group TEXT,
  target_user_id TEXT,
  min_order NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read coupons" ON coupons FOR SELECT USING (true);
CREATE POLICY "Allow admin write coupons" ON coupons FOR ALL USING (true);

-- 12. FRIENDS TABLE
DROP TABLE IF EXISTS friends CASCADE;
CREATE TABLE friends (
  id TEXT PRIMARY KEY,
  from_user_id TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read friends" ON friends FOR SELECT USING (true);
CREATE POLICY "Allow public insert friends" ON friends FOR INSERT WITH CHECK (true);

-- 13. CHAT TABLE
DROP TABLE IF EXISTS chat CASCADE;
CREATE TABLE chat (
  id TEXT PRIMARY KEY,
  sender TEXT NOT NULL,
  text TEXT NOT NULL,
  type TEXT DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE chat ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read chat" ON chat FOR SELECT USING (true);
CREATE POLICY "Allow public insert chat" ON chat FOR INSERT WITH CHECK (true);

-- 14. ACTIVITY TABLE
DROP TABLE IF EXISTS activity CASCADE;
CREATE TABLE activity (
  id TEXT PRIMARY KEY,
  action TEXT NOT NULL,
  actor TEXT NOT NULL,
  type TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow admin read activity" ON activity FOR SELECT USING (true);

-- 15. SUPPORT_TICKETS TABLE
DROP TABLE IF EXISTS support_tickets CASCADE;
CREATE TABLE support_tickets (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  subject TEXT NOT NULL,
  body TEXT,
  priority TEXT DEFAULT 'normal',
  status TEXT DEFAULT 'open',
  responses JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read tickets" ON support_tickets FOR SELECT USING (true);
CREATE POLICY "Allow public insert tickets" ON support_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow admin read tickets" ON support_tickets FOR SELECT USING (true);

-- 16. VIP_REQUESTS TABLE
DROP TABLE IF EXISTS vip_requests CASCADE;
CREATE TABLE vip_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  tier TEXT NOT NULL,
  price NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE vip_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read vip_requests" ON vip_requests FOR SELECT USING (true);
CREATE POLICY "Allow public insert vip_requests" ON vip_requests FOR INSERT WITH CHECK (true);

-- ============================================
-- INSERT DEFAULT DATA
-- ============================================

-- Insert Default Leaderboard Entries
INSERT INTO leaderboard (id, name, points, kills, wins, matches) VALUES
  ('lb-1', 'Mazen Ragaei', 12500, 487, 245, 260),
  ('lb-2', 'Abdallah Essam', 11300, 423, 198, 218),
  ('lb-3', 'Shahd Yasser', 10850, 398, 176, 200)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, points = EXCLUDED.points;

-- Insert Default Coupon
INSERT INTO coupons (id, code, type, value, active) VALUES
  ('coup-1', 'CRAZY10', 'percent', 10, true),
  ('coup-2', 'FIRST20', 'percent', 20, true)
ON CONFLICT (id) DO UPDATE SET active = EXCLUDED.active;

-- Insert Default News
INSERT INTO news (id, title, body) VALUES
  ('n-1', 'Spring Tactical Cup', 'Registration is now open for the Spring Tactical Cup! Join us for epic battles.'),
  ('n-2', 'New Pharaoh Arena', 'Season 2 map improvements are live. Experience the new Abu Simbel Fortress zone.')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;

-- Insert Default Tournaments
INSERT INTO tournaments (id, name, date, description, prize_pool, status) VALUES
  ('t-1', 'Crazy Weekly Cup', (NOW() + INTERVAL '7 days')::date::TEXT, 'Weekly championship tournament', 5000, 'Upcoming'),
  ('t-2', 'Pharaoh Clash Finals', (NOW() + INTERVAL '14 days')::date::TEXT, 'Season 2 grand finals', 15000, 'Upcoming')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Insert Sample Inventory Items
INSERT INTO inventory (id, name, qty, price, category, description) VALUES
  ('inv-1', 'Urban Camouflage Outfit', 20, 899, 'outfits', 'Modern urban camo pattern tactical outfit'),
  ('inv-2', 'Night Ops Black Hoodie', 16, 899, 'outfits', 'Stealth black tactical hoodie'),
  ('inv-3', 'Desert Storm Gear', 15, 790, 'outfits', 'Sand-colored tactical outfit'),
  ('inv-4', 'Phantom Sniper Rifle', 10, 450, 'weapons', 'Long-range precision sniper with silencer'),
  ('inv-5', 'Golden AK-47', 5, 899, 'weapons', 'Legendary gold-plated assault rifle'),
  ('inv-6', 'Platinum Armor Set', 8, 1200, 'vip', 'VIP exclusive platinum armor')
ON CONFLICT (id) DO UPDATE SET qty = EXCLUDED.qty;

-- Verify all tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
