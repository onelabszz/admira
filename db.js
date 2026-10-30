import Dexie from 'https://esm.sh/dexie@4.0.8';

export const DB_NAME = 'admira_v1';
export const db = new Dexie(DB_NAME);

db.version(1).stores({
  settings: 'key',
  letters: '++id, type, date, number, subject, createdAt',
  letter_numbering: 'id',
  meetings: '++id, date, createdAt',
  tasks: '++id, status, dueDate, meetingId',
  attachments: '++id, letterId',
});

db.version(2).stores({
  settings: 'key',
  letters: '++id, type, date, number, subject, createdAt',
  letter_numbering: 'id',
  letter_templates: '++id, name, category',
  dispositions: '++id, letterId, status, createdAt',
  meetings: '++id, date, createdAt',
  tasks: '++id, status, dueDate, meetingId',
  attachments: '++id, letterId',
}).upgrade(async tx => {
  await tx.table('letter_templates').bulkAdd([
    {
      name: 'Surat Tugas',
      category: 'internal',
      body: `Yang bertanda tangan di bawah ini, Kepala {{sekolah}}, dengan ini menugaskan kepada:

Nama          : {{nama}}
NIP           : {{nip}}
Jabatan       : {{jabatan}}

Untuk melaksanakan tugas {{keperluan}} pada:

Hari/Tanggal  : {{tanggal}}
Tempat        : {{tempat}}

Demikian surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab.`,
    },
    {
      name: 'Surat Undangan',
      category: 'internal',
      body: `Dengan hormat,

Sehubungan dengan {{keperluan}}, kami mengundang Bapak/Ibu untuk hadir pada:

Hari/Tanggal  : {{tanggal}}
Waktu         : {{waktu}}
Tempat        : {{tempat}}
Acara         : {{keperluan}}

Mengingat pentingnya acara tersebut, kami mengharapkan kehadiran Bapak/Ibu tepat pada waktunya.

Demikian undangan ini kami sampaikan, atas perhatian dan kerja samanya kami ucapkan terima kasih.`,
    },
    {
      name: 'Surat Keterangan',
      category: 'internal',
      body: `Yang bertanda tangan di bawah ini, Kepala {{sekolah}}, dengan ini menerangkan bahwa:

Nama          : {{nama}}
NIP/NISN      : {{nip}}
Jabatan       : {{jabatan}}

Adalah benar yang bersangkutan {{keperluan}}.

Demikian surat keterangan ini dibuat dengan sebenarnya, untuk dapat dipergunakan sebagaimana mestinya.`,
    },
  ]);
});

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
