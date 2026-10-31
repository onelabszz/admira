/**
 * TKA Studio — supabase/auth.js
 * © 2026 Ekwan Nugroho — Wonogiri
 */
import { getSupabase } from './client.js';

export async function getSession() {
  const client = await getSupabase();
  const { data } = await client.auth.getSession();
  return data?.session || null;
}

export async function getProfile(userId) {
  const client = await getSupabase();
  const { data, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data;
}

export async function signIn(email, password) {
  const client = await getSupabase();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return data.session;
}

export async function signOut() {
  const client = await getSupabase();
  await client.auth.signOut();
}

export async function registerUser(nama, email, wa, sekolah) {
  const client = await getSupabase();
  // Panggil Edge Function 'register'
  const res = await fetch('https://zrzbitqfrvtgmxeqnyhi.supabase.co/functions/v1/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyemJpdHFmcnZ0Z214ZXFueWhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2NDA1ODUsImV4cCI6MjEwODIxNjU4NX0.xGZesUy6jrkcXGGg3N-uYgqNjRl7jtHEbqoBQN1IEpQ',
    },
    body: JSON.stringify({ nama, email, wa, sekolah }),
  });
  
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Gagal mendaftar');
  return data;
}