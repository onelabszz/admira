import Dexie from 'https://esm.sh/dexie@4.0.8';
import { DEFAULT_TEMPLATES, DEFAULT_WA_TEMPLATES } from './templates.js';

export const DB_NAME = 'admira_v1';
export const db = new Dexie(DB_NAME);

// Skema dasar. Versi berikutnya hanya menambahkan tabel lewat `base({...})`.
function base(extra = {}) {
  return {
    settings: 'key',
    letters: '++id, type, date, number, subject, createdAt',
    letter_numbering: 'id',
    meetings: '++id, date, createdAt',
    tasks: '++id, status, dueDate, meetingId',
    attachments: '++id, letterId',
    ...extra,
  };
}

const LETTER_TEMPLATES = '++id, name, category';
const WA_TEMPLATES = '++id, name, category';
const DISPOSITIONS = '++id, letterId, status, createdAt';
const STAFF = '++id, name, nip, jabatan, status, createdAt';
const STUDENTS = '++id, name, nisn, nis, kelas, status, createdAt';

// Riwayat versi dipertahankan agar database lama tetap bisa di-upgrade.
db.version(1).stores(base());

db.version(2).stores(base({
  letter_templates: LETTER_TEMPLATES,
  dispositions: DISPOSITIONS,
}));

db.version(3).stores(base({
  letter_templates: LETTER_TEMPLATES,
  dispositions: DISPOSITIONS,
  staff: STAFF,
  students: STUDENTS,
}));

// V4-V6: perubahan isi template, bukan struktur tabel.
db.version(4).stores(base({
  letter_templates: LETTER_TEMPLATES,
  dispositions: DISPOSITIONS,
  staff: STAFF,
  students: STUDENTS,
}));

db.version(5).stores(base({
  letter_templates: LETTER_TEMPLATES,
  dispositions: DISPOSITIONS,
  staff: STAFF,
  students: STUDENTS,
}));

db.version(6).stores(base({
  letter_templates: LETTER_TEMPLATES,
  dispositions: DISPOSITIONS,
  staff: STAFF,
  students: STUDENTS,
})).upgrade(async tx => {
  // Jangan hapus template buatan pengguna: hanya isi jika masih kosong.
  const templates = tx.table('letter_templates');
  if (await templates.count() === 0) {
    await templates.bulkAdd(DEFAULT_TEMPLATES.map(t => ({ ...t })));
  }
});

db.version(7).stores(base({
  letter_templates: LETTER_TEMPLATES,
  dispositions: DISPOSITIONS,
  staff: STAFF,
  students: STUDENTS,
  wa_templates: WA_TEMPLATES,
}));

// Penanda versi seed: template bawaan baru ditambahkan sekali, sehingga
// template yang sengaja dihapus pengguna tidak muncul lagi setiap boot.
const LETTER_SEED_VERSION = 2;
const LETTER_BASIS_VERSION = 1;
const WA_SEED_VERSION = 1;
const WA_BUILTIN_VERSION = 1;

async function seedMissing(table, defaults) {
  const existing = await table.toArray();
  const names = new Set(existing.map(t => t.name));
  const missing = defaults.filter(t => !names.has(t.name));
  if (!missing.length) return 0;
  const now = Date.now();
  await table.bulkAdd(missing.map((t, i) => ({ ...t, createdAt: now + i })));
  return missing.length;
}

/**
 * Pastikan template surat bawaan tersedia. Dipanggil saat boot agar instalasi
 * baru (database dibuat langsung di versi terakhir, tanpa upgrade) tetap punya
 * template, dan database lama mendapat template tambahan tanpa duplikasi.
 */
export async function ensureLetterTemplates() {
  const row = await db.settings.get('letter_templates_seed');
  if ((row?.value || 0) < LETTER_SEED_VERSION) {
    await seedMissing(db.letter_templates, DEFAULT_TEMPLATES);
    await db.settings.put({ key: 'letter_templates_seed', value: LETTER_SEED_VERSION });
  }

  // Database lama bisa sudah punya template bawaan tanpa kolom `basis`.
  // Lengkapi dasar hukumnya tanpa menimpa isi yang mungkin sudah diubah.
  const basisRow = await db.settings.get('letter_templates_basis');
  if ((basisRow?.value || 0) >= LETTER_BASIS_VERSION) return;
  for (const t of DEFAULT_TEMPLATES) {
    const rows = await db.letter_templates.where('name').equals(t.name).toArray();
    for (const r of rows) {
      if (!Array.isArray(r.basis) || !r.basis.length) {
        await db.letter_templates.update(r.id, { basis: t.basis });
      }
    }
  }
  await db.settings.put({ key: 'letter_templates_basis', value: LETTER_BASIS_VERSION });
}

export async function ensureWaTemplates() {
  const row = await db.settings.get('wa_templates_seed');
  if ((row?.value || 0) < WA_SEED_VERSION) {
    await seedMissing(db.wa_templates, DEFAULT_WA_TEMPLATES);
    await db.settings.put({ key: 'wa_templates_seed', value: WA_SEED_VERSION });
  }

  const builtInRow = await db.settings.get('wa_templates_builtIn');
  if ((builtInRow?.value || 0) >= WA_BUILTIN_VERSION) return;
  const defaultNames = new Set(DEFAULT_WA_TEMPLATES.map(t => t.name));
  const rows = await db.wa_templates.toArray();
  for (const r of rows) {
    if (defaultNames.has(r.name) && r.builtIn !== true) {
      await db.wa_templates.update(r.id, { builtIn: true });
    }
  }
  await db.settings.put({ key: 'wa_templates_builtIn', value: WA_BUILTIN_VERSION });
}

export async function getSetting(key, def = null) {
  const row = await db.settings.get(key);
  return row ? row.value : def;
}
export async function setSetting(key, value) {
  return db.settings.put({ key, value });
}

export async function peekNextLetterNumber(type, year) {
  const row = await db.letter_numbering.get(`${type}_${year}`);
  const n = (row?.value || 0) + 1;
  return String(n).padStart(3, '0');
}
export async function bumpLetterNumber(type, year) {
  return db.transaction('rw', db.letter_numbering, async () => {
    const key = `${type}_${year}`;
    const row = await db.letter_numbering.get(key);
    await db.letter_numbering.put({ id: key, type, year, value: (row?.value || 0) + 1 });
  });
}

export async function saveAttachment(letterId, file) {
  return db.attachments.add({
    letterId,
    name: file.name,
    type: file.type,
    size: file.size,
    blob: file,
    createdAt: Date.now(),
  });
}
export async function getAttachments(letterId) {
  return db.attachments.where('letterId').equals(letterId).toArray();
}
export async function deleteAttachment(id) {
  return db.attachments.delete(id);
}
