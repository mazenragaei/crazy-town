-- CRAZY TOWN SUPABASE SCHEMA SETUP (FIXED VERSION)
-- Run this to ensure all tables exist and Real-time is active without errors.

-- 1. Create Tables if they don't exist
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  phone TEXT UNIQUE,
  password TEXT,
  rank TEXT DEFAULT 'Recruit',
  roles TEXT[] DEFAULT ARRAY['player'],
  "profileImage" TEXT,
  balance NUMERIC DEFAULT 0,
  is_banned BOOLEAN DEFAULT false,
  joined TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  points INTEGER DEFAULT 0,
  skill TEXT DEFAULT 'Bronze',
  badges TEXT[] DEFAULT ARRAY[]::TEXT[],
  matches INTEGER DEFAULT 0,
  team TEXT,
  tournament TEXT,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY,
  "ticketId" TEXT UNIQUE,
  "userId" TEXT REFERENCES users(id) ON DELETE CASCADE,
  "playerNo" INTEGER,
  name TEXT,
  phone TEXT,
  date DATE,
  time TEXT,
  players TEXT,
  mission TEXT,
  notes TEXT,
  "paymentMethod" TEXT,
  "discountCode" TEXT,
  "basePrice" NUMERIC,
  price NUMERIC,
  status TEXT DEFAULT 'Pending',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS app_kv (
  id TEXT PRIMARY KEY,
  value JSONB,
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  "userId" TEXT REFERENCES users(id) ON DELETE CASCADE,
  items JSONB,
  "rawTotal" NUMERIC,
  total NUMERIC,
  delivery JSONB,
  status TEXT DEFAULT 'Pending Confirmation',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  kind TEXT DEFAULT 'shop'
);

CREATE TABLE IF NOT EXISTS teams (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE,
  "captainId" TEXT REFERENCES users(id),
  members TEXT[] DEFAULT ARRAY[]::TEXT[],
  "invitedIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY,
  "userId" TEXT REFERENCES users(id) ON DELETE CASCADE,
  "userName" TEXT,
  category TEXT,
  priority TEXT,
  message TEXT,
  status TEXT DEFAULT 'Open',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS vip_requests (
  id TEXT PRIMARY KEY,
  "userId" TEXT REFERENCES users(id) ON DELETE CASCADE,
  "userName" TEXT,
  title TEXT,
  priority TEXT,
  date DATE,
  budget NUMERIC,
  notes TEXT,
  status TEXT DEFAULT 'Pending',
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Disable RLS for easy testing (Crucial for immediate sync)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_kv DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE vip_requests DISABLE ROW LEVEL SECURITY;

-- 3. Setup Publication safely
-- This part might error if already exists, you can run it line by line.
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END $$;

-- Add tables to publication if not already there (Safe approach)
DO $$
DECLARE
    table_name TEXT;
    tables_to_add TEXT[] := ARRAY['users', 'bookings', 'app_kv', 'orders', 'teams', 'support_tickets', 'vip_requests'];
BEGIN
    FOREACH table_name IN ARRAY tables_to_add LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE %I', table_name);
        EXCEPTION WHEN others THEN
            -- Ignore "already member" errors
        END;
    END LOOP;
END $$;
