/**
 * TKA Studio — supabase/client.js
 * © 2026 Ekwan Nugroho — Wonogiri
 */
let _client = null;

export async function getSupabase() {
  if (_client) return _client;
  
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  
  const SUPABASE_URL = 'https://zrzbitqfrvtgmxeqnyhi.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyemJpdHFmcnZ0Z214ZXFueWhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2NDA1ODUsImV4cCI6MjEwODIxNjU4NX0.xGZesUy6jrkcXGGg3N-uYgqNjRl7jtHEbqoBQN1IEpQ';
  
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storageKey: 'tka-studio-auth',
    },
  });
  
  return _client;
}