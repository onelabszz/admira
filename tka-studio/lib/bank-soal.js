/**
 * TKA Studio — lib/bank-soal.js
 * © 2026 Ekwan Nugroho — Wonogiri
 */
import { getSupabase } from '../supabase/client.js';
import { slugify } from './tka-schema.js';

export async function saveToBank(userId, paket) {
  const client = await getSupabase();
  
  // Pastikan ID unik per user
  const finalId = slugify(paket.judul) + '-' + Math.floor(Math.random() * 1000);
  
  const { data, error } = await client.from('generations').insert({
    user_id: userId,
    paket_id: finalId,
    judul: paket.judul,
    mapel: paket.mapel,
    kelas: paket.mapel, // fallback
    payload: paket,
    status: 'saved'
  }).select().single();

  if (error) throw error;
  return data;
}

export async function getMyBank(userId) {
  const client = await getSupabase();
  const { data, error } = await client
    .from('generations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data || [];
}

export async function deleteFromBank(id) {
  const client = await getSupabase();
  const { error } = await client.from('generations').delete().eq('id', id);
  if (error) throw error;
}

export async function togglePublic(id, isPublic) {
  const client = await getSupabase();
  const { error } = await client.from('generations').update({ is_public: isPublic }).eq('id', id);
  if (error) throw error;
}

export async function getPublicLibrary() {
  const client = await getSupabase();
  const { data, error } = await client
    .from('generations')
    .select(`
      id, judul, mapel, kelas, payload, downloads, created_at,
      profiles ( nama, sekolah )
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false });
    
  if (error) throw error;
  return data || [];
}

export async function copyFromPublic(userId, item) {
  const client = await getSupabase();
  
  // 1. Tambah counter download di paket asli
  await client.rpc('increment_download', { row_id: item.id }).catch(() => {}); 
  // (Catatan: RPC mungkin belum ada, kita bisa update manual jika tidak ada RPC)
  await client.from('generations').update({ downloads: (item.downloads || 0) + 1 }).eq('id', item.id);

  // 2. Copy ke bank user
  const finalId = slugify(item.judul) + '-copy-' + Math.floor(Math.random() * 1000);
  const { error } = await client.from('generations').insert({
    user_id: userId,
    paket_id: finalId,
    judul: item.judul + ' (Salinan)',
    mapel: item.mapel,
    kelas: item.kelas,
    payload: item.payload,
    status: 'saved'
  });

  if (error) throw error;
}
