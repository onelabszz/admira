/**
 * TKA Studio — lib/tka-schema.test.js
 * © 2026 Ekwan Nugroho — Wonogiri
 * All rights reserved.
 *
 * Test suite tanpa framework — cukup jalan di browser.
 */
import { normalizePaket, validatePaket, toLocalHostFormat } from './tka-schema.js';

function assert(name, fn) {
  try {
    fn();
    return { name, ok: true };
  } catch (e) {
    return { name, ok: false, message: String(e?.message ?? e) };
  }
}

function eq(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function requirePaket(result, label) {
  if (!result.paket) {
    const msg = (result.errors || []).map((e) => e.message).join('; ') || 'unknown error';
    throw new Error(`${label}: normalize gagal → ${msg}`);
  }
  return result.paket;
}

export function runSchemaTests() {
  const results = [];

  // ---------- Valid fixtures ----------
  results.push(assert('PG valid: diterima', () => {
    const raw = {
      version: '1.0', id: 'tes-pg', judul: 'Tes PG', mapel: 'Matematika',
      durasiMenit: 30, acakMode: 'per-tipe', latihanMandiri: false,
      soal: [{ id: 's1', tipe: 'pg', q: 'Hasil 1+1?',
        options: ['1','2','3','4'], key: 1, pembahasan: 'Dua.' }],
    };
    const p = requirePaket(normalizePaket(raw), 'PG valid');
    const v = validatePaket(p);
    if (!v.valid) throw new Error('validate gagal: ' + v.errors.map(e => e.message).join(', '));
  }));

  results.push(assert('MCMA valid: diterima', () => {
    const raw = { id: 'tes-mcma', judul: 'Tes MCMA', mapel: 'Matematika', durasiMenit: 30,
      soal: [{ id: 's1', tipe: 'mcma', q: 'Pilih yang genap?',
        options: ['1','2','3','4'], key: [1,3], pembahasan: 'Genap.' }] };
    const p = requirePaket(normalizePaket(raw), 'MCMA valid');
    const v = validatePaket(p);
    if (!v.valid) throw new Error('validate gagal: ' + v.errors.map(e => e.message).join(', '));
  }));

  results.push(assert('BS valid: diterima', () => {
    const raw = { id: 'tes-bs', judul: 'Tes BS', mapel: 'IPA', durasiMenit: 15,
      soal: [{ id: 's1', tipe: 'bs', q: 'Tentukan B/S',
        pernyataan: [
          { teks: 'Bumi bulat', key: true },
          { teks: 'Bulan bercahaya sendiri', key: false },
        ], pembahasan: 'Sesuai fakta.' }] };
    const p = requirePaket(normalizePaket(raw), 'BS valid');
    const v = validatePaket(p);
    if (!v.valid) throw new Error('validate gagal: ' + v.errors.map(e => e.message).join(', '));
  }));

  // ---------- Auto-fix cases ----------
  results.push(assert('Auto-fix: huruf kecil "PG" → "pg"', () => {
    const raw = { id: 'tes', judul: 'X', mapel: 'Y', durasiMenit: 10,
      soal: [{ tipe: 'PG', q: 'Q', options: ['a','b'], key: 0 }] };
    const p = requirePaket(normalizePaket(raw), 'auto-fix PG');
    eq(p.soal[0].tipe, 'pg', 'tipe');
  }));

  results.push(assert('Auto-fix: MCMA key tidak urut → diurutkan', () => {
    const raw = { id: 'tes', judul: 'X', mapel: 'Y', durasiMenit: 10,
      soal: [{ tipe: 'mcma', q: 'Q', options: ['a','b','c','d'], key: [3,1,2] }] };
    const r = normalizePaket(raw);
    const p = requirePaket(r, 'auto-fix MCMA urut');
    eq(JSON.stringify(p.soal[0].key), '[1,2,3]', 'key sorted');
    if (r.warnings.length === 0) throw new Error('harus ada warning');
  }));

  results.push(assert('Auto-fix: key PG "B" → indeks 1', () => {
    const raw = { id: 'tes', judul: 'X', mapel: 'Y', durasiMenit: 10,
      soal: [{ tipe: 'pg', q: 'Q', options: ['a','b','c','d'], key: 'B' }] };
    const p = requirePaket(normalizePaket(raw), 'auto-fix PG letter');
    eq(p.soal[0].key, 1, 'key converted');
  }));

  results.push(assert('Auto-fix: BS key "B"/"S" → boolean', () => {
    const raw = { id: 'tes', judul: 'X', mapel: 'Y', durasiMenit: 10,
      soal: [{ tipe: 'bs', q: 'Q', pernyataan: [
        { teks: 'A', key: 'B' }, { teks: 'B', key: 'S' }] }] };
    const p = requirePaket(normalizePaket(raw), 'auto-fix BS');
    eq(p.soal[0].pernyataan[0].key, true, 'B → true');
    eq(p.soal[0].pernyataan[1].key, false, 'S → false');
  }));

  results.push(assert('Auto-fix: id soal duplikat → s1..sN', () => {
    const raw = { id: 'tes', judul: 'X', mapel: 'Y', durasiMenit: 10,
      soal: [
        { id: 's1', tipe: 'pg', q: 'Q1', options: ['a','b'], key: 0 },
        { id: 's1', tipe: 'pg', q: 'Q2', options: ['a','b'], key: 0 },
      ] };
    const p = requirePaket(normalizePaket(raw), 'auto-fix duplikat id');
    eq(p.soal[0].id, 's1', 'soal 1 id');
    eq(p.soal[1].id, 's2', 'soal 2 id');
  }));

  results.push(assert('Auto-fix: id paket "Matematika Kelas 6" → slug', () => {
    const raw = { id: 'Matematika Kelas 6', judul: 'X', mapel: 'Y', durasiMenit: 10,
      soal: [{ tipe: 'pg', q: 'Q', options: ['a','b'], key: 0 }] };
    const r = normalizePaket(raw);
    const p = requirePaket(r, 'auto-fix id slug');
    eq(p.id, 'x', 'id slugified from judul');
    if (r.warnings.length === 0) throw new Error('harus ada warning');
  }));

  // ---------- Reject cases ----------
  results.push(assert('Tolak: PG key out-of-bounds', () => {
    const raw = { id: 'tes', judul: 'X', mapel: 'Y', durasiMenit: 10,
      soal: [{ tipe: 'pg', q: 'Q', options: ['a','b','c'], key: 3 }] };
    const r = normalizePaket(raw);
    if (r.errors.length === 0) throw new Error('harus ditolak');
    if (r.paket !== null) throw new Error('paket harus null');
  }));

  results.push(assert('Tolak: MCMA key hanya 1 item', () => {
    const raw = { id: 'tes', judul: 'X', mapel: 'Y', durasiMenit: 10,
      soal: [{ tipe: 'mcma', q: 'Q', options: ['a','b','c'], key: [1] }] };
    const r = normalizePaket(raw);
    if (r.errors.length === 0) throw new Error('harus ditolak');
  }));

  results.push(assert('Tolak: BS pernyataan < 2', () => {
    const raw = { id: 'tes', judul: 'X', mapel: 'Y', durasiMenit: 10,
      soal: [{ tipe: 'bs', q: 'Q', pernyataan: [{ teks: 'A', key: true }] }] };
    const r = normalizePaket(raw);
    if (r.errors.length === 0) throw new Error('harus ditolak');
  }));

  results.push(assert('Tolak: PG options < 2', () => {
    const raw = { id: 'tes', judul: 'X', mapel: 'Y', durasiMenit: 10,
      soal: [{ tipe: 'pg', q: 'Q', options: ['a'], key: 0 }] };
    const r = normalizePaket(raw);
    if (r.errors.length === 0) throw new Error('harus ditolak');
  }));

  results.push(assert('Tolak: tanpa soal', () => {
    const raw = { id: 'tes', judul: 'X', mapel: 'Y', durasiMenit: 10, soal: [] };
    const r = normalizePaket(raw);
    if (r.errors.length === 0) throw new Error('harus ditolak');
  }));

  results.push(assert('Auto-fix: durasiMenit ≤ 0 → default 30', () => {
    const raw = { id: 'tes', judul: 'X', mapel: 'Y', durasiMenit: 0,
      soal: [{ tipe: 'pg', q: 'Q', options: ['a','b'], key: 0 }] };
    const r = normalizePaket(raw);
    const p = requirePaket(r, 'auto-fix durasi');
    eq(p.durasiMenit, 30, 'default durasi');
    if (r.warnings.length === 0) throw new Error('harus ada warning');
  }));

  // ---------- Export ----------
  results.push(assert('toLocalHostFormat: strip field kosong', () => {
    const raw = { id: 'tes', judul: 'X', mapel: 'Y', durasiMenit: 10,
      soal: [{ tipe: 'pg', q: 'Q', options: ['a','b'], key: 0 }] };
    const p = requirePaket(normalizePaket(raw), 'export');
    const out = toLocalHostFormat(p);
    eq(out.version, '1.0', 'version');
    eq(out.soal[0].tipe, 'pg', 'tipe');
    if ('img' in out.soal[0]) throw new Error('img kosong harusnya tidak ada');
  }));

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  return { passed, failed, results };
}