import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://gldwdwcpzcxcvqpcpiol.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdsZHdkd2NwemN4Y3ZxcGNwaW9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMjE4NjAsImV4cCI6MjA5Mjg5Nzg2MH0.clwYiXpRG-2ZPC_WmGC56DdoVEiyVu2RgVe5yppxJ2E';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) return null;
  return user;
}

export async function getKV(key, fallback = null) {
  try {
    const { data, error } = await supabase
      .from('app_kv')
      .select('value')
      .eq('id', key)
      .single();
    if (error) return fallback;
    return data?.value || fallback;
  } catch (e) {
    console.error('getKV error:', e);
    return fallback;
  }
}

export async function setKV(key, value) {
  const { error } = await supabase
    .from('app_kv')
    .upsert({ id: key, value: value, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  if (error) throw error;
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

export { supabase };
export default {
  supabase,
  registerUser, loginUser, logoutUser, getCurrentUser,
  getKV, setKV,
  getItems, insertItem, updateItem, deleteItem,
  subscribeToTable
};

