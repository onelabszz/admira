import JSZip from 'https://esm.sh/jszip@3.10.1';
import { db, getSetting, setSetting } from '../db.js';
import { esc, download, currentAcademicYear, toISODate } from '../lib.js';
import { icon } from '../lib-icons.js';
import { toast } from '../lib-toast.js';
import { confirmDialog } from '../lib-confirm.js';

export async function renderSettings(main) {
  const ws = await getSetting('workspace', {});
  const lastBackup = await getSetting('last_backup_at');

  // Selalu baca workspace terbaru dari database agar perubahan yang baru
  // disimpan (nama sekolah, NIP, kop) tidak tertimpa oleh upload logo/TTD.
  async function updateWorkspace(patch = {}, removeKeys = []) {
    const current = await getSetting('workspace', {});
    const next = { ...current, ...patch };
    for (const key of removeKeys) delete next[key];
    await setSetting('workspace', next);
    return next;
  }

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
        <label>Pangkat/Golongan Kepala Sekolah <input name="headmasterRank" value="${esc(ws.headmasterRank || '')}" placeholder="mis. Penata Muda Tk.I / III b"></label>
        <label>Tahun Ajaran Aktif <input name="academicYear" value="${esc(ws.academicYear || currentAcademicYear())}" placeholder="mis. 2026/2027"></label>

        <h3 style="margin-top:16px">Kop Surat</h3>
        <label>Baris 1 (Instansi Atas) <input name="kopLine1" value="${esc(ws.kopLine1 || '')}" placeholder="PEMERINTAH KABUPATEN ..."></label>
        <label>Baris 2 (Dinas) <input name="kopLine2" value="${esc(ws.kopLine2 || '')}" placeholder="DINAS PENDIDIKAN DAN KEBUDAYAAN"></label>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
          <div>
            <h4 style="margin:0 0 8px">Logo Kiri</h4>
            ${ws.logoDataUrl
              ? `<img src="${ws.logoDataUrl}" alt="logo" style="width:60px;height:60px;object-fit:contain;border:1px solid #E5E7EB;border-radius:8px;margin-bottom:8px">`
              : '<div style="height:60px;display:flex;align-items:center" class="muted">Belum ada</div>'}
            <input type="file" id="logo-file" accept="image/png,image/jpeg,image/svg+xml" style="font-size:12px">
            ${ws.logoDataUrl ? `<button type="button" class="btn sm danger" id="logo-del" style="margin-top:4px">Hapus</button>` : ''}
          </div>
          <div>
            <h4 style="margin:0 0 8px">Logo Kanan</h4>
            ${ws.logoRightDataUrl
              ? `<img src="${ws.logoRightDataUrl}" alt="logo" style="width:60px;height:60px;object-fit:contain;border:1px solid #E5E7EB;border-radius:8px;margin-bottom:8px">`
              : '<div style="height:60px;display:flex;align-items:center" class="muted">Belum ada</div>'}
            <input type="file" id="logo-right-file" accept="image/png,image/jpeg,image/svg+xml" style="font-size:12px">
            ${ws.logoRightDataUrl ? `<button type="button" class="btn sm danger" id="logo-right-del" style="margin-top:4px">Hapus</button>` : ''}
          </div>
        </div>

        <h3 style="margin-top:24px">Tanda Tangan & Cap</h3>
        <div style="display:flex;gap:12px;align-items:center;margin-bottom:8px">
          ${ws.signatureDataUrl
            ? `<img src="${ws.signatureDataUrl}" alt="ttd" style="max-height:80px;border:1px solid #E5E7EB;border-radius:8px;background:#fff;padding:4px">`
            : '<span class="muted">Belum ada tanda tangan</span>'}
        </div>
        <label>Unggah Tanda Tangan <small class="muted">(PNG transparan)</small>
          <input type="file" id="sig-file" accept="image/png,image/jpeg"></label>
        ${ws.signatureDataUrl ? `<button type="button" class="btn sm danger" id="sig-del">Hapus tanda tangan</button>` : ''}

        <div style="display:flex;gap:12px;align-items:center;margin-top:12px;margin-bottom:8px">
          ${ws.stampDataUrl
            ? `<img src="${ws.stampDataUrl}" alt="cap" style="width:72px;height:72px;object-fit:contain;border:1px solid #E5E7EB;border-radius:8px;background:#fff">`
            : '<span class="muted">Belum ada cap</span>'}
        </div>
        <label>Unggah Cap Sekolah <small class="muted">(PNG transparan)</small>
          <input type="file" id="stamp-file" accept="image/png"></label>
        ${ws.stampDataUrl ? `<button type="button" class="btn sm danger" id="stamp-del">Hapus cap</button>` : ''}

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
    await updateWorkspace(Object.fromEntries(fd.entries()));
    toast.success('Pengaturan tersimpan.');
  });

  // Logo upload
  main.querySelector('#logo-file').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    const dataUrl = await fileToDataUrl(f);
    await updateWorkspace({ logoDataUrl: dataUrl });
    await renderSettings(main);
  });

  const logoDel = main.querySelector('#logo-del');
  if (logoDel) logoDel.addEventListener('click', async () => {
    await updateWorkspace({}, ['logoDataUrl']);
    await renderSettings(main);
  });

  // Logo Kanan
  main.querySelector('#logo-right-file').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    const dataUrl = await fileToDataUrl(f);
    await updateWorkspace({ logoRightDataUrl: dataUrl });
    await renderSettings(main);
  });

  const logoRightDel = main.querySelector('#logo-right-del');
  if (logoRightDel) logoRightDel.addEventListener('click', async () => {
    await updateWorkspace({}, ['logoRightDataUrl']);
    await renderSettings(main);
  });

  // Cap Sekolah
  main.querySelector('#stamp-file').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    const dataUrl = await fileToDataUrl(f);
    await updateWorkspace({ stampDataUrl: dataUrl });
    await renderSettings(main);
  });

  const stampDel = main.querySelector('#stamp-del');
  if (stampDel) stampDel.addEventListener('click', async () => {
    await updateWorkspace({}, ['stampDataUrl']);
    await renderSettings(main);
  });

  // Tanda tangan upload
  main.querySelector('#sig-file').addEventListener('change', async e => {
    const f = e.target.files[0];
    if (!f) return;
    const dataUrl = await fileToDataUrl(f);
    await updateWorkspace({ signatureDataUrl: dataUrl });
    await renderSettings(main);
  });

  const sigDel = main.querySelector('#sig-del');
  if (sigDel) sigDel.addEventListener('click', async () => {
    await updateWorkspace({}, ['signatureDataUrl']);
    await renderSettings(main);
  });

  // Backup
  main.querySelector('#backup').addEventListener('click', async () => {
    const zip = new JSZip();
    const tables = ['settings', 'letters', 'letter_numbering', 'letter_templates', 'dispositions', 'meetings', 'tasks', 'staff', 'students'];
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

    for (const t of ['letters', 'letter_numbering', 'letter_templates', 'dispositions', 'meetings', 'tasks', 'attachments', 'staff', 'students']) {
      await db.table(t).clear();
    }

    for (const s of data.settings || []) await db.settings.put(s);
    for (const l of data.letters || []) await db.letters.put(l);
    for (const n of data.letter_numbering || []) await db.letter_numbering.put(n);
    for (const t of data.letter_templates || []) await db.letter_templates.put(t);
    for (const d of data.dispositions || []) await db.dispositions.put(d);
    for (const m of data.meetings || []) await db.meetings.put(m);
    for (const t of data.tasks || []) await db.tasks.put(t);
    for (const s of data.staff || []) await db.staff.put(s);
    for (const s of data.students || []) await db.students.put(s);

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

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
