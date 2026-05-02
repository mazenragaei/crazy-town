-- ============================================
-- CRAZY TOWN - DATABASE TRIGGER FOR AUTO USER SYNC
-- ============================================
-- This trigger automatically adds new users to crazyTown_users
-- whenever a new user signs up via Supabase Auth
-- ============================================

-- 1. Create the function that will be called by the trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  existing_users JSONB;
  user_array JSONB;
  new_user JSONB;
BEGIN
  -- Get current users array from app_kv
  SELECT value INTO existing_users
  FROM app_kv
  WHERE id = 'crazyTown_users';

  -- If no users array exists, create empty array
  IF existing_users IS NULL THEN
    user_array := '[]'::JSONB;
  ELSIF JSONB_TYPEOF(existing_users) != 'array' THEN
    -- If it's not an array, create empty array
    user_array := '[]'::JSONB;
  ELSE
    user_array := existing_users;
  END IF;

  -- Build the new user object from auth.users metadata
  new_user := JSONB_BUILD_OBJECT(
    'id', NEW.id,
    'name', COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'email', NEW.email,
    'phone', COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'rank', 'Recruit',
    'roles', '["player"]'::JSONB,
    'profileImage', '',
    'balance', 0,
    'isBanned', FALSE,
    'joined', NOW()::TEXT
  );

  -- Append new user to array
  user_array := user_array || JSONB_BUILD_ARRAY(new_user);

  -- Upsert into app_kv
  INSERT INTO app_kv (id, value, updated_at)
  VALUES ('crazyTown_users', user_array, NOW())
  ON CONFLICT (id) DO UPDATE
  SET value = app_kv.value,
      updated_at = NOW();

  -- Also add activity log entry
  INSERT INTO app_kv (id, value, updated_at)
  VALUES (
    'crazyTown_activity',
    (
      SELECT COALESCE(
        CASE WHEN JSONB_TYPEOF(value) = 'array' THEN
          value || '["' || REPLACE(NEW.raw_user_meta_data->>'name', '"', '\"') || ' registered via Auth"]'::JSONB
        ELSE
          '[]'::JSONB || '["' || REPLACE(NEW.raw_user_meta_data->>'name', '"', '\"') || ' registered via Auth"]'::JSONB
        END,
        '[]'::JSONB
      )
      FROM app_kv WHERE id = 'crazyTown_activity'
    ),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET value = app_kv.value,
      updated_at = NOW();

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the signup
  RAISE NOTICE 'Trigger error (non-fatal): %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the trigger that fires on new user creation in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Verification query
SELECT 'Trigger created successfully' as status;