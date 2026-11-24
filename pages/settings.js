import JSZip from 'https://esm.sh/jszip@3.10.1';
import { db, getSetting, setSetting } from '../db.js';
import { download, toISODate } from '../lib.js';
import { icon } from '../lib-icons.js';
import { toast } from '../lib-toast.js';
import { confirmDialog } from '../lib-confirm.js';

export async function renderSettings(main) {
  const lastBackup = await getSetting('last_backup_at');

  main.innerHTML = `
    <div class="page-head"><h1>Pengaturan</h1></div>

    <div class="card" style="border-left:4px solid var(--teal)">
      <h2>Profil Sekolah</h2>
      <p class="muted">Identitas, kop surat, logo, tanda tangan, data guru/siswa, dan Rapor Pendidikan kini dikelola di satu menu khusus.</p>
      <a class="btn primary" href="#/profil">${icon('Building2', { size: 16 })} Buka Profil Sekolah →</a>
    </div>

    <div class="card">
      <h2>Backup &amp; Restore</h2>
      <p class="muted">Data tersimpan di perangkat ini. Unduh backup secara rutin.
        ${lastBackup ? `Backup terakhir: ${new Date(lastBackup).toLocaleString('id-ID')}.` : '<strong>Belum pernah backup.</strong>'}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
        <button class="btn primary" id="backup">${icon('Download', { size: 16 })} Unduh Backup (.admira)</button>
        <label class="btn">${icon('Upload', { size: 16 })} Restore dari Backup <input type="file" id="restore" accept=".admira,.zip" hidden></label>
      </div>
    </div>
  `;

  // Backup
  main.querySelector('#backup').addEventListener('click', async () => {
    const zip = new JSZip();
    const tables = [
      'settings', 'letters', 'letter_numbering', 'letter_templates', 'wa_templates',
      'dispositions', 'meetings', 'tasks', 'staff', 'students',
      'ksp_documents', 'ksp_indicators', 'ksp_assessments', 'ksp_approvals', 'ksp_team',
      'ksp_snapshots', 'ksp_references', 'ksp_reference_files',
    ];
    const data = {};
    for (const t of tables) {
      if (t === 'ksp_reference_files') {
        const files = await db.ksp_reference_files.toArray();
        data[t] = await Promise.all(files.map(async f => ({
          ...f, blob: await blobToDataUrl(f.blob),
        })));
      } else {
        data[t] = await db.table(t).toArray();
      }
    }

    const attachments = await db.attachments.toArray();
    for (const a of attachments) {
      zip.folder('attachments').file(`${a.id}-${a.name}`, a.blob);
    }
    data._attachmentsMeta = attachments.map(({ blob, ...rest }) => rest);

    zip.file('data.json', JSON.stringify(data, null, 2));
    zip.file('manifest.json', JSON.stringify({
      app: 'admira', schema: 4, exportedAt: Date.now(),
      workspace: data.settings.find(s => s.key === 'workspace')?.value,
    }, null, 2));

    const blob = await zip.generateAsync({ type: 'blob' });
    download(blob, `admira-backup-${toISODate()}.admira`);
    await setSetting('last_backup_at', Date.now());
    window.__admira?.updateBackupStatus?.();
  });

  // Restore
  main.querySelector('#restore').addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = await confirmDialog({
      title: 'Pulihkan dari backup?',
      message: 'Seluruh data saat ini akan DIGANTI dengan isi file backup. Tindakan ini tidak dapat dibatalkan.',
      confirmText: 'Pulihkan',
      danger: true,
    });
    if (!ok) return;

    const zip = await JSZip.loadAsync(file);
    const dataFile = zip.file('data.json');
    if (!dataFile) { toast.error('File backup tidak valid.'); return; }
    const data = JSON.parse(await dataFile.async('string'));

    const restoreTables = [
      'letters', 'letter_numbering', 'letter_templates', 'wa_templates',
      'dispositions', 'meetings', 'tasks', 'attachments', 'staff', 'students',
      'ksp_documents', 'ksp_indicators', 'ksp_assessments', 'ksp_approvals', 'ksp_team',
      'ksp_snapshots', 'ksp_references', 'ksp_reference_files',
    ];
    for (const t of restoreTables) await db.table(t).clear();

    for (const t of restoreTables) {
      if (t === 'attachments' || t === 'ksp_reference_files') continue;
      for (const row of data[t] || []) await db.table(t).put(row);
    }

    for (const f of data.ksp_reference_files || []) {
      const { blob, ...meta } = f;
      const restored = blob ? await dataUrlToBlob(blob) : new Blob([]);
      await db.ksp_reference_files.put({ ...meta, blob: restored });
    }

    for (const meta of data._attachmentsMeta || []) {
      const entry = zip.file(`attachments/${meta.id}-${meta.name}`);
      if (!entry) continue;
      const blob = await entry.async('blob');
      await db.attachments.put({ ...meta, blob });
    }

    await setSetting('last_backup_at', Date.now());
    toast.success('Restore selesai. Memuat ulang…', { duration: 2000 });
    setTimeout(() => location.reload(), 900);
  });

  return () => {};
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function dataUrlToBlob(dataUrl) {
  const res = await fetch(dataUrl);
  return res.blob();
}
