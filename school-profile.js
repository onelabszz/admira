// Satu sumber kebenaran data sekolah.
// Data identitas/kepala/kop/tanda tangantersimpan di `workspace` (dipakai modul surat),
// sedangkan field KSP dan Rapor Pendidikan ikut disimpan di sana juga.
// `ksp_profile` tetap ditulis sebagai cermin kompatibilitas untuk backup lama.

import { getSetting, setSetting } from './db.js';
import { currentAcademicYear } from './lib.js';

const LEGACY_FIELDS = [
  'nss', 'akreditasi', 'statusSekolah', 'dinas', 'alamatLengkap', 'ketuaKomite',
  'pengawas', 'nipPengawas', 'pengawasSignature', 'visi', 'misi', 'tujuan',
  'dimensi', 'website',
];

export function defaultSchoolProfile() {
  return {
    // Identitas
    name: '', npsn: '', nss: '', akreditasi: '', statusSekolah: '',
    address: '', alamatLengkap: '', city: '', dinas: '', contact: '', website: '',
    kopLine1: '', kopLine2: '',
    logoDataUrl: '', logoRightDataUrl: '',
    // Pimpinan & tanda tangan
    headmaster: '', headmasterNip: '', headmasterRank: '',
    signatureDataUrl: '', stampDataUrl: '',
    ketuaKomite: '', pengawas: '', nipPengawas: '', pengawasSignature: '',
    // Kurikulum
    tahun: currentAcademicYear(), academicYear: currentAcademicYear(),
    visi: '', misi: '', tujuan: '', dimensi: '',
    // Rapor Pendidikan Kemdikbud
    raporTahun: '', raporLiterasi: '', raporNumerasi: '', raporKarakter: '',
    raporLevelLiterasi: '', raporLevelNumerasi: '', raporLevelKarakter: '',
    raporCatatan: '',
  };
}

/** Gabungkan workspace, cermin lama, dan tahun aktif menjadi satu objek profil. */
export async function loadSchoolProfile() {
  const [ws, legacy, activeYear] = await Promise.all([
    getSetting('workspace', {}),
    getSetting('ksp_profile', {}),
    getSetting('ksp_active_year', currentAcademicYear()),
  ]);
  const old = legacy || {};
  const current = ws || {};
  const merged = { ...defaultSchoolProfile(), ...old, ...current };

  // Field lama dan alamat boleh kosong di workspace baru; ambil nilai cadangan.
  for (const key of LEGACY_FIELDS) {
    if (!merged[key] && old[key]) merged[key] = old[key];
  }
  merged.alamatLengkap = current.alamatLengkap || old.alamatLengkap || current.address || old.address || '';
  merged.website = current.website || old.website || '';
  merged.tahun = activeYear;
  merged.academicYear = activeYear;
  return merged;
}

/** Simpan ke workspace (kanonik) + cermin ksp_profile (kompatibilitas). */
export async function saveSchoolProfile(patch = {}) {
  const current = await loadSchoolProfile();
  const next = { ...current, ...patch };
  next.tahun = next.tahun || current.tahun;
  next.academicYear = next.tahun;

  await setSetting('workspace', next);
  await setSetting('ksp_profile', {
    nss: next.nss || '',
    akreditasi: next.akreditasi || '',
    statusSekolah: next.statusSekolah || '',
    dinas: next.dinas || '',
    alamatLengkap: next.alamatLengkap || next.address || '',
    ketuaKomite: next.ketuaKomite || '',
    pengawas: next.pengawas || '',
    nipPengawas: next.nipPengawas || '',
    pengawasSignature: next.pengawasSignature || '',
    visi: next.visi || '',
    misi: next.misi || '',
    tujuan: next.tujuan || '',
    dimensi: next.dimensi || '',
    tahun: next.tahun,
    website: next.website || '',
  });
  if (patch.tahun) await setSetting('ksp_active_year', next.tahun);
  return next;
}

export function profileCompleteness(p) {
  const groups = {
    identitas: ['name', 'npsn', 'akreditasi', 'alamatLengkap'],
    pimpinan: ['headmaster', 'headmasterNip', 'ketuaKomite', 'pengawas'],
    kurikulum: ['visi', 'misi', 'tujuan', 'dimensi'],
    rapor: ['raporTahun', 'raporLiterasi', 'raporNumerasi', 'raporKarakter'],
  };
  const result = {};
  for (const [key, fields] of Object.entries(groups)) {
    const filled = fields.filter(f => String(p[f] ?? '').trim()).length;
    result[key] = { filled, total: fields.length, pct: Math.round((filled / fields.length) * 100) };
  }
  return result;
}
