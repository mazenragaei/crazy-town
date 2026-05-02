-- ============================================
-- CRAZY TOWN - APP_KV INITIALIZATION SCRIPT
-- ============================================
-- Run this in Supabase SQL Editor immediately after creating tables
-- This ensures the 4 core array keys have default empty arrays []
-- preventing "n.unshift is not a function" errors
-- ============================================

-- 1. APP_KV TABLE - Key-Value Storage (if not already created)
DROP TABLE IF EXISTS app_kv CASCADE;
CREATE TABLE app_kv (
  id TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE app_kv ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read/write on app_kv" ON app_kv FOR ALL USING (true) WITH CHECK (true);

-- 2. INITIALIZE THE 4 REQUIRED ARRAY-BASED KEYS WITH EMPTY ARRAYS []
-- This prevents null/undefined errors when app_kv entries are empty
-- and causes array methods (unshift/push) to fail

-- crazyTown_users array
INSERT INTO app_kv (id, value, updated_at)
VALUES ('crazyTown_users', '[]'::jsonb, NOW())
ON CONFLICT (id) DO UPDATE SET value = '[]'::jsonb, updated_at = NOW();

-- crazyTown_activity array
INSERT INTO app_kv (id, value, updated_at)
VALUES ('crazyTown_activity', '[]'::jsonb, NOW())
ON CONFLICT (id) DO UPDATE SET value = '[]'::jsonb, updated_at = NOW();

-- crazyTown_orders array
INSERT INTO app_kv (id, value, updated_at)
VALUES ('crazyTown_orders', '[]'::jsonb, NOW())
ON CONFLICT (id) DO UPDATE SET value = '[]'::jsonb, updated_at = NOW();

-- crazyTown_cart array
INSERT INTO app_kv (id, value, updated_at)
VALUES ('crazyTown_cart', '[]'::jsonb, NOW())
ON CONFLICT (id) DO UPDATE SET value = '[]'::jsonb, updated_at = NOW();

-- 3. INITIALIZE REMAINING ARRAY KEYS (for full app stability)
INSERT INTO app_kv (id, value, updated_at)
VALUES ('crazyTown_coupons', '[]'::jsonb, NOW())
ON CONFLICT (id) DO UPDATE SET value = '[]'::jsonb, updated_at = NOW();

INSERT INTO app_kv (id, value, updated_at)
VALUES ('crazyTown_inventory', '[]'::jsonb, NOW())
ON CONFLICT (id) DO UPDATE SET value = '[]'::jsonb, updated_at = NOW();

INSERT INTO app_kv (id, value, updated_at)
VALUES ('crazyTown_news', '[]'::jsonb, NOW())
ON CONFLICT (id) DO UPDATE SET value = '[]'::jsonb, updated_at = NOW();

INSERT INTO app_kv (id, value, updated_at)
VALUES ('crazyTown_friends', '[]'::jsonb, NOW())
ON CONFLICT (id) DO UPDATE SET value = '[]'::jsonb, updated_at = NOW();

INSERT INTO app_kv (id, value, updated_at)
VALUES ('crazyTown_chat', '[]'::jsonb, NOW())
ON CONFLICT (id) DO UPDATE SET value = '[]'::jsonb, updated_at = NOW();

INSERT INTO app_kv (id, value, updated_at)
VALUES ('crazyTown_teams', '[]'::jsonb, NOW())
ON CONFLICT (id) DO UPDATE SET value = '[]'::jsonb, updated_at = NOW();

INSERT INTO app_kv (id, value, updated_at)
VALUES ('crazyTown_tournaments', '[]'::jsonb, NOW())
ON CONFLICT (id) DO UPDATE SET value = '[]'::jsonb, updated_at = NOW();

INSERT INTO app_kv (id, value, updated_at)
VALUES ('crazyTown_tournament_regs', '[]'::jsonb, NOW())
ON CONFLICT (id) DO UPDATE SET value = '[]'::jsonb, updated_at = NOW();

INSERT INTO app_kv (id, value, updated_at)
VALUES ('crazyTown_leaderboard', '[]'::jsonb, NOW())
ON CONFLICT (id) DO UPDATE SET value = '[]'::jsonb, updated_at = NOW();

INSERT INTO app_kv (id, value, updated_at)
VALUES ('crazyTown_bookings', '[]'::jsonb, NOW())
ON CONFLICT (id) DO UPDATE SET value = '[]'::jsonb, updated_at = NOW();

-- 4. VERIFY INITIALIZATION
SELECT id, jsonb_typeof(value) as type,
       CASE WHEN jsonb_typeof(value) = 'array' THEN jsonb_array_length(value) ELSE 0 END as count
FROM app_kv
WHERE id LIKE 'crazyTown_%'
ORDER BY id;

-- 5. INSERT DEFAULT LEADERBOARD ENTRIES (as objects in array)
UPDATE app_kv SET value = '[
  {"id": "lb-1", "name": "Mazen Ragaei", "points": 12500, "kills": 487, "wins": 245},
  {"id": "lb-2", "name": "Abdallah Essam", "points": 11300, "kills": 423, "wins": 198},
  {"id": "lb-3", "name": "Shahd Yasser", "points": 10850, "kills": 398, "wins": 176}
]'::jsonb, updated_at = NOW()
WHERE id = 'crazyTown_leaderboard';

-- 6. INSERT DEFAULT COUPONS (as objects in array)
UPDATE app_kv SET value = '[
  {"id": "coup-1", "code": "CRAZY10", "type": "percent", "value": 10, "active": true},
  {"id": "coup-2", "code": "FIRST20", "type": "percent", "value": 20, "active": true}
]'::jsonb, updated_at = NOW()
WHERE id = 'crazyTown_coupons';

-- 7. INSERT DEFAULT NEWS (as objects in array)
-- Using jsonb_build_array to safely construct the JSON array
UPDATE app_kv SET value = jsonb_build_array(
  jsonb_build_object(
    'id', 'n-1',
    'title', 'Spring Tactical Cup',
    'body', 'Registration is now open for the Spring Tactical Cup! Join us for epic battles.',
    'date', CURRENT_DATE::text
  ),
  jsonb_build_object(
    'id', 'n-2',
    'title', 'New Pharaoh Arena',
    'body', 'Season 2 map improvements are live. Experience the new Abu Simbel Fortress zone.',
    'date', CURRENT_DATE::text
  )
), updated_at = NOW()
WHERE id = 'crazyTown_news';

-- 8. INSERT DEFAULT INVENTORY (as objects in array)
UPDATE app_kv SET value = '[
  {"id": "inv-1", "name": "Urban Camouflage Outfit", "qty": 20, "price": 899, "category": "outfits"},
  {"id": "inv-2", "name": "Night Ops Black Hoodie", "qty": 16, "price": 899, "category": "outfits"},
  {"id": "inv-3", "name": "Desert Storm Gear", "qty": 15, "price": 790, "category": "outfits"},
  {"id": "inv-4", "name": "Phantom Sniper Rifle", "qty": 10, "price": 450, "category": "weapons"},
  {"id": "inv-5", "name": "Golden AK-47", "qty": 5, "price": 899, "category": "weapons"},
  {"id": "inv-6", "name": "Platinum Armor Set", "qty": 8, "price": 1200, "category": "vip"}
]'::jsonb, updated_at = NOW()
WHERE id = 'crazyTown_inventory';

-- 9. INSERT DEFAULT TOURNAMENTS (as objects in array)
-- Using jsonb_build_array to safely construct the JSON array with dynamic dates
UPDATE app_kv SET value = jsonb_build_array(
  jsonb_build_object(
    'id', 't-1',
    'name', 'Crazy Weekly Cup',
    'date', (CURRENT_DATE + INTERVAL '7 days')::text,
    'description', 'Weekly championship tournament',
    'prize_pool', 5000,
    'status', 'Upcoming'
  ),
  jsonb_build_object(
    'id', 't-2',
    'name', 'Pharaoh Clash Finals',
    'date', (CURRENT_DATE + INTERVAL '14 days')::text,
    'description', 'Season 2 grand finals',
    'prize_pool', 15000,
    'status', 'Upcoming'
  )
), updated_at = NOW()
WHERE id = 'crazyTown_tournaments';

-- 10. CREATE ROOT ADMIN USER (for development/owner access)
INSERT INTO app_kv (id, value, updated_at)
VALUES ('crazyTown_root_admin', '{"id": "root-admin", "name": "Root Admin", "email": "admin@crazytown.com", "phone": "+201000000000", "password": "mazenragaei", "rank": "Commander", "roles": ["owner", "admin"], "balance": 0, "isBanned": false}'::jsonb, NOW())
ON CONFLICT (id) DO NOTHING;

-- Final verification - all keys should show type=array and count=0 (empty) or their defaults
SELECT id,
       CASE WHEN jsonb_typeof(value) = 'array' THEN jsonb_array_length(value) ELSE -1 END as count,
       LEFT(value::text, 100) as preview
FROM app_kv
WHERE id LIKE 'crazyTown_%'
ORDER BY id;