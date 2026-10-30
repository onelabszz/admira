import JSZip from 'https://esm.sh/jszip@3.10.1';
import { db, getSetting, setSetting } from '../db.js';
import { esc, download } from '../lib.js';
import { icon } from '../lib-icons.js';

export async function renderSettings(main) {
  const ws = await getSetting('workspace', {});
  const lastBackup = await getSetting('last_backup_at');

  main.innerHTML = `
    <div class="page-head"><h1>Pengaturan</h1></div>

    <div class="card">
      <h2>Profil Sekolah</h2>
      <form class="form" id="ws-form">
        <label>Nama Sekolah <input name="name" value="${esc(ws.name || '')}" required></label>
        <label>NPSN <input name="npsn" value="${esc(ws.npsn || '')}"></label>
        <label>Alamat <input name="address" value="${esc(ws.address || '')}"></label>
        <label>Kota <small class="muted">(untuk tanggal di surat)</small>
          <input name="city" value="${esc(ws.city || '')}" placeholder="Jakarta"></label>
        <label>Kontak <small class="muted">(telepon / email / website)</small>
          <input name="contact" value="${esc(ws.contact || '')}" placeholder="(021) 1234567 • email@sekolah.sch.id"></label>

        <h3 style="margin-top:16px">Kepala Sekolah</h3>
        <label>Nama Kepala Sekolah <input name="headmaster" value="${esc(ws.headmaster || '')}"></label>
        <label>NIP Kepala Sekolah <input name="headmasterNip" value="${esc(ws.headmasterNip || '')}"></label>

        <h3 style="margin-top:16px">Logo Sekolah</h3>
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:8px">
          ${ws.logoDataUrl
            ? `<img src="${ws.logoDataUrl}" alt="logo" style="width:72px;height:72px;object-fit:contain;border:1px solid #E5E7EB;border-radius:8px">`
            : '<span class="muted">Belum ada logo</span>'}
        </div>
        <label>Unggah Logo <input type="file" id="logo-file" accept="image/png,image/jpeg,image/svg+xml"></label>
        ${ws.logoDataUrl ? `<button type="button" class="btn sm danger" id="logo-del">Hapus logo</button>` : ''}

        <h3 style="margin-top:16px">Tanda Tangan</h3>
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:8px">
          ${ws.signatureDataUrl
            ? `<img src="${ws.signatureDataUrl}" alt="ttd" style="max-height:80px;border:1px solid #E5E7EB;border-radius:8px;background:#fff;padding:4px">`
            : '<span class="muted">Belum ada tanda tangan</span>'}
        </div>
        <label>Unggah Tanda Tangan <small class="muted">(PNG transparan disarankan)</small>
          <input type="file" id="sig-file" accept="image/png,image/jpeg"></label>
        ${ws.signatureDataUrl ? `<button type="button" class="btn sm danger" id="sig-del">Hapus tanda tangan</button>` : ''}

        <div class="form-actions" style="margin-top:16px">
          <button class="btn primary" type="submit">${icon('Save', { size: 16 })} Simpan Pengaturan</button>
        </div>
      </form>
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

  // Simpan profil
  main.querySelector('#ws-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const updated = { ...ws, ...Object.fromEntries(fd.entries()) };
    await setSetting('workspace', updated);
    alert('Pengaturan tersimpan.');
  });

  // Logo upload
  main.querySelector('#logo-file').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    const dataUrl = await fileToDataUrl(f);
    await setSetting('workspace', { ...ws, logoDataUrl: dataUrl });
    renderSettings(main);
  });

  const logoDel = main.querySelector('#logo-del');
  if (logoDel) logoDel.addEventListener('click', async () => {
    const w = { ...ws }; delete w.logoDataUrl;
    await setSetting('workspace', w);
    renderSettings(main);
  });

  // Tanda tangan upload
  main.querySelector('#sig-file').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    const dataUrl = await fileToDataUrl(f);
    await setSetting('workspace', { ...ws, signatureDataUrl: dataUrl });
    renderSettings(main);
  });

  const sigDel = main.querySelector('#sig-del');
  if (sigDel) sigDel.addEventListener('click', async () => {
    const w = { ...ws }; delete w.signatureDataUrl;
    await setSetting('workspace', w);
    renderSettings(main);
  });

  // Backup
  main.querySelector('#backup').addEventListener('click', async () => {
    const zip = new JSZip();
    const tables = ['settings', 'letters', 'letter_numbering', 'letter_templates', 'dispositions', 'meetings', 'tasks'];
    const data = {};
    for (const t of tables) data[t] = await db.table(t).toArray();

    const attachments = await db.attachments.toArray();
    for (const a of attachments) {
      zip.folder('attachments').file(`${a.id}-${a.name}`, a.blob);
    }
    data._attachmentsMeta = attachments.map(({ blob, ...rest }) => rest);

    zip.file('data.json', JSON.stringify(data, null, 2));
    zip.file('manifest.json', JSON.stringify({
      app: 'admira', schema: 2, exportedAt: Date.now(),
      workspace: data.settings.find(s => s.key === 'workspace')?.value,
    }, null, 2));

    const blob = await zip.generateAsync({ type: 'blob' });
    const date = new Date().toISOString().slice(0, 10);
    download(blob, `admira-backup-${date}.admira`);
    await setSetting('last_backup_at', Date.now());
    window.__admira?.updateBackupStatus?.();
  });

  // Restore
  main.querySelector('#restore').addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm('Restore akan MENGGANTI semua data saat ini. Lanjutkan?')) return;

    const zip = await JSZip.loadAsync(file);
    const dataFile = zip.file('data.json');
    if (!dataFile) { alert('File backup tidak valid.'); return; }
    const data = JSON.parse(await dataFile.async('string'));

    for (const t of ['letters', 'letter_numbering', 'letter_templates', 'dispositions', 'meetings', 'tasks', 'attachments']) {
      await db.table(t).clear();
    }

    for (const s of data.settings || []) await db.settings.put(s);
    for (const l of data.letters || []) await db.letters.put(l);
    for (const n of data.letter_numbering || []) await db.letter_numbering.put(n);
    for (const t of data.letter_templates || []) await db.letter_templates.put(t);
    for (const d of data.dispositions || []) await db.dispositions.put(d);
    for (const m of data.meetings || []) await db.meetings.put(m);
    for (const t of data.tasks || []) await db.tasks.put(t);

    for (const meta of data._attachmentsMeta || []) {
      const entry = zip.file(`attachments/${meta.id}-${meta.name}`);
      if (!entry) continue;
      const blob = await entry.async('blob');
      await db.attachments.put({ ...meta, blob });
    }

    await setSetting('last_backup_at', Date.now());
    alert('Restore selesai. Aplikasi akan dimuat ulang.');
    location.reload();
  });

  return () => {};
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
