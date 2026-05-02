import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://gldwdwcpzcxcvqpcpiol.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsZHdkd2NwemN4Y3ZxcGNwaW9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjE4NjAsImV4cCI6MjA5Mjg5Nzg2MH0.clwYiXpRG-2ZPC_WmGC56DdoVEiyVu2RgVe5yppxJ2E';

// Create and export supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export supabase client - available as both named and default export
export { supabase };
export default supabase;

// ============================================
// AUTH FUNCTIONS
// ============================================

export async function registerUser(email, password, metadata = {}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: metadata }
  });
  if (error) throw error;
  return data;
}

export async function loginUser(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function logoutUser() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data || !data.user) return null;
    return data.user;
  } catch (e) {
    return null;
  }
}

// ============================================
// DEFENSIVE DATABASE FUNCTIONS
// ============================================
// Fixed: Validate arrays using Array.isArray() to prevent "n.unshift is not a function" errors

// Keys that should always be arrays (for validation)
const ARRAY_KEYS = [
  'crazyTown_users',
  'crazyTown_activity',
  'crazyTown_orders',
  'crazyTown_cart',
  'crazyTown_coupons',
  'crazyTown_inventory',
  'crazyTown_news',
  'crazyTown_friends',
  'crazyTown_chat',
  'crazyTown_teams',
  'crazyTown_tournaments',
  'crazyTown_tournament_regs',
  'crazyTown_leaderboard',
  'crazyTown_bookings'
];

/**
 * Check if a key should be an array
 */
function isArrayKey(key) {
  return ARRAY_KEYS.includes(key);
}

/**
 * Safely convert value to array - prevents crashes when data is null
 */
function safeArray(value, fallback = []) {
  // If it's already an array, return it
  if (Array.isArray(value)) {
    return value;
  }
  // If it's a valid array-like string, try to parse it
  if (typeof value === 'string' && value.trim().startsWith('[')) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      console.warn('Failed to parse array string:', value);
    }
  }
  // If null or undefined, return empty array
  if (value === null || value === undefined) {
    return [];
  }
  // Otherwise return fallback
  return fallback;
}

/**
 * Get KV value with defensive array validation
 * @param {string} key - The key to retrieve
 * @param {any} fallback - Default value if key doesn't exist
 * @param {boolean} forceArray - If true, always return array (for array keys)
 */
export async function getKV(key, fallback = null, forceArray = false) {
  try {
    const { data, error } = await supabase
      .from('app_kv')
      .select('value')
      .eq('id', key)
      .single();

    if (error) {
      // Key doesn't exist - return appropriate fallback
      if (forceArray || isArrayKey(key)) {
        return [];
      }
      return fallback;
    }

    const value = data?.value;

    // For array keys, always ensure we return an array
    if (forceArray || isArrayKey(key)) {
      return safeArray(value, []);
    }

    // For non-array keys, return value or fallback
    return value !== null && value !== undefined ? value : fallback;

  } catch (e) {
    console.error('getKV error for key:', key, e);
    // On error, return array for array keys, otherwise fallback
    if (forceArray || isArrayKey(key)) {
      return [];
    }
    return fallback;
  }
}

/**
 * Set KV value with validation
 * @param {string} key - The key to set
 * @param {any} value - The value to store
 */
export async function setKV(key, value) {
  try {
    // For array keys, ensure we're storing a valid array
    let safeValue = value;
    if (isArrayKey(key)) {
      safeValue = safeArray(value, []);
    }

    const { error } = await supabase
      .from('app_kv')
      .upsert({
        id: key,
        value: safeValue,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.error('setKV upsert error:', error);
      throw error;
    }

  } catch (e) {
    console.error('setKV error for key:', key, e);
    throw e;
  }
}

export async function getItems(table, query = {}) {
  let request = supabase.from(table).select('*');
  if (query.match) request = request.match(query.match);
  if (query.order) request = request.order(query.order.column, { ascending: query.order.ascending });
  if (query.limit) request = request.limit(query.limit);
  const { data, error } = await request;
  if (error) throw error;
  return data;
}

export async function insertItem(table, item) {
  const { data, error } = await supabase.from(table).insert(item).select().single();
  if (error) throw error;
  return data;
}

export async function updateItem(table, id, updates) {
  const { data, error } = await supabase.from(table).update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteItem(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

export function subscribeToTable(table, callback, eventFilter = '*') {
  return supabase.channel(`${table}-changes`)
    .on('postgres_changes', { event: eventFilter, schema: 'public', table }, callback)
    .subscribe((status) => console.log(`Subscription ${table}: ${status}`));
}

// ============================================
// USER MANAGEMENT HELPERS (for Supabase Auth sync)
// ============================================

/**
 * Get all users from crazyTown_users array
 */
export async function getUsers() {
  return await getKV('crazyTown_users', [], true);
}

/**
 * Save users array to crazyTown_users
 */
export async function saveUsers(users) {
  if (!Array.isArray(users)) {
    console.error('saveUsers: users must be an array');
    return;
  }
  await setKV('crazyTown_users', users);
}

/**
 * Find user by email in crazyTown_users array
 */
export async function findUserByEmail(email) {
  const users = await getUsers();
  return users.find(u => u.email === email);
}

/**
 * Add a new user to crazyTown_users array
 * Uses try/catch to prevent UI crash if database fails
 */
export async function addUserToKV(user) {
  try {
    const users = await getKV('crazyTown_users', [], true);

    // 2. التأكد الصارم إنها Array
    if (!Array.isArray(users)) {
      console.warn('addUserToKV: users was not an array, initializing empty array');
    }
    const safeUsers = Array.isArray(users) ? users : [];

    // 3. الآن يمكنك استخدام push بأمان
    safeUsers.push(user);
    await setKV('crazyTown_users', safeUsers);
    return true;
  } catch (error) {
    console.error('addUserToKV error:', error);
    return false;
  }
}

// ============================================
// ACTIVITY LOGGING HELPER
// ============================================

/**
 * Add activity entry with defensive array handling
 * Uses try/catch to prevent UI crash
 */
export async function addActivityEntry(action, actor = 'System') {
  try {
    // 1. جلب البيانات مع وضع مصفوفة فارغة كاحتياط
    let arr = await getKV('crazyTown_activity', [], true);

    // 2. التأكد الصارم إنها Array (هنا سر الحل)
    if (!Array.isArray(arr)) {
      arr = [];
    }

    // 3. الآن يمكنك استخدام unshift بأمان
    arr.unshift({
      id: Date.now(),
      action,
      actor,
      at: new Date().toISOString()
    });

    // 4. حفظ البيانات المحدثة
    await setKV('crazyTown_activity', arr.slice(0, 200));
    return true;
  } catch (error) {
    console.error('Activity error:', error);
    return false;
  }
}

// ============================================
// LOGIN & REGISTER WRAPPERS (for HTML onclick events)
// ============================================
// These wrapper functions use Supabase Auth and sync with crazyTown_users array
// They include try/catch to prevent UI crashes

/**
 * Handle user login - finds user in Supabase Auth and syncs with crazyTown_users
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {object} { success: boolean, user: object|null, error: string|null }
 */
export async function handleLogin(email, password) {
  try {
    // Authenticate with Supabase
    const { data, error } = await loginUser(email, password);
    if (error) {
      return { success: false, user: null, error: error.message };
    }

    // Find user profile in crazyTown_users
    const users = await getUsers();
    const safeUsers = Array.isArray(users) ? users : [];
    const user = safeUsers.find(u => u.email === email);

    if (!user) {
      // User exists in Supabase Auth but not in crazyTown_users - create profile
      const newUser = {
        id: data.user.id,
        name: data.user.user_metadata?.name || email.split('@')[0],
        email: data.user.email,
        phone: data.user.user_metadata?.phone || '',
        rank: 'Recruit',
        roles: ['player'],
        profileImage: '',
        balance: 0,
        isBanned: false,
        joined: new Date().toISOString()
      };

      try {
        safeUsers.push(newUser);
        await setKV('crazyTown_users', safeUsers);
        return { success: true, user: newUser, error: null };
      } catch (saveError) {
        console.error('Failed to save user profile:', saveError);
        return { success: true, user: newUser, error: null }; // Still return success
      }
    }

    if (user.isBanned) {
      await logoutUser();
      return { success: false, user: null, error: 'Account banned. Contact admin.' };
    }

    return { success: true, user, error: null };
  } catch (error) {
    console.error('handleLogin error:', error);
    return { success: false, user: null, error: error.message || 'Login failed' };
  }
}

/**
 * Handle user registration - creates Supabase Auth user and saves profile to crazyTown_users
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {object} metadata - Additional user data (name, phone)
 * @returns {object} { success: boolean, user: object|null, error: string|null }
 */
export async function handleRegister(email, password, metadata = {}) {
  try {
    // Check if email already exists
    const existingUsers = await getUsers();
    const safeUsers = Array.isArray(existingUsers) ? existingUsers : [];

    if (safeUsers.some(u => u.email === email)) {
      return { success: false, user: null, error: 'Email already registered' };
    }

    // Create user in Supabase Auth
    const { data, error } = await registerUser(email, password, metadata);
    if (error) {
      return { success: false, user: null, error: error.message };
    }

    // Create user profile in crazyTown_users
    const newUser = {
      id: data.user?.id || `u-${Date.now()}`,
      name: metadata.name || email.split('@')[0],
      email: email,
      phone: metadata.phone || '',
      rank: 'Recruit',
      roles: ['player'],
      profileImage: '',
      balance: 0,
      isBanned: false,
      joined: new Date().toISOString()
    };

    try {
      const updatedUsers = [...safeUsers, newUser];
      await setKV('crazyTown_users', updatedUsers);
    } catch (saveError) {
      console.error('Failed to save new user profile:', saveError);
    }

    return { success: true, user: newUser, error: null };
  } catch (error) {
    console.error('handleRegister error:', error);
    return { success: false, user: null, error: error.message || 'Registration failed' };
  }
}

// ============================================
// GLOBAL SCOPING - Attach to window object
// ============================================
// Makes all database and Auth functions accessible from HTML onclick events
// Essential for production build on Vercel

if (typeof window !== 'undefined') {
  // Supabase client
  window.supabase = supabase;

  // Auth functions
  window.registerUser = registerUser;
  window.loginUser = loginUser;
  window.logoutUser = logoutUser;
  window.getCurrentUser = getCurrentUser;

  // Database core functions with defensive array handling
  window.getKV = getKV;
  window.setKV = setKV;
  window.getItems = getItems;
  window.insertItem = insertItem;
  window.updateItem = updateItem;
  window.deleteItem = deleteItem;
  window.subscribeToTable = subscribeToTable;

  // User management helpers
  window.getUsers = getUsers;
  window.saveUsers = saveUsers;
  window.findUserByEmail = findUserByEmail;
  window.addUserToKV = addUserToKV;

  // Activity logging
  window.addActivityEntry = addActivityEntry;

  // Login & Register wrappers (with try/catch and Supabase Auth integration)
  window.handleLogin = handleLogin;
  window.handleRegister = handleRegister;

  // Helper functions for defensive array handling
  window.safeArray = safeArray;
  window.isArrayKey = isArrayKey;
  window.ARRAY_KEYS = ARRAY_KEYS;
}