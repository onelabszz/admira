import { db } from '../db.js';
import { esc, download, parseCSV, toCSV } from '../lib.js';
import { icon } from '../lib-icons.js';
import { confirmDialog } from '../lib-confirm.js';
import { toast } from '../lib-toast.js';

const STATUS = ['Aktif', 'Lulus', 'Pindah', 'Keluar'];

const CSV_HEADERS = ['Nama', 'NISN', 'NIS', 'Kelas', 'Jenis Kelamin', 'Tempat Lahir', 'Tanggal Lahir', 'Nama Orang Tua', 'No HP Orang Tua', 'Alamat', 'Status'];
const CSV_SAMPLE = [
  ['Ahmad Fauzi', '0012345678', '2024001', '1A', 'L', 'Jakarta', '2015-05-12', 'Budi Santoso', '081234567890', 'Jl. Merdeka No. 1', 'Aktif'],
  ['Siti Aminah', '0012345679', '2024002', '1A', 'P', 'Bandung', '2015-08-20', 'Rina Wati', '081298765432', 'Jl. Sudirman No. 5', 'Aktif'],
];

function normalizeGender(v) {
  const s = String(v || '').trim().toLowerCase();
  if (['l', 'laki-laki', 'laki laki', 'male', 'm'].includes(s)) return 'L';
  if (['p', 'perempuan', 'female', 'f'].includes(s)) return 'P';
  return '';
}

function normalizeDate(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return s;
}

export async function renderStudents(main) {
  main.innerHTML = `
    <div class="page-head">
      <h1>Siswa</h1>
      <div class="page-actions">
        <button class="btn" id="btn-import">${icon('FileSpreadsheet', { size: 16 })} Impor CSV</button>
        <button class="btn primary" id="btn-add">${icon('Plus', { size: 16 })} Tambah Siswa</button>
      </div>
    </div>
    <div class="card">
      <input type="search" id="q" placeholder="Cari nama, NISN, kelas…"
             style="width:100%;padding:9px 12px;border:1px solid #E5E7EB;border-radius:8px;margin-bottom:12px">
      <div id="list"></div>
    </div>
    <dialog id="dlg"></dialog>
    <dialog id="dlg-import" class="dialog-wide"></dialog>
  `;

  const list = main.querySelector('#list');
  const dlg = main.querySelector('#dlg');
  const dlgImport = main.querySelector('#dlg-import');
  const q = main.querySelector('#q');

  async function refresh() {
    const all = await db.students.reverse().sortBy('createdAt');
    const term = q.value.trim().toLowerCase();
    const rows = all.filter(s =>
      !term || [s.name, s.nisn, s.nis, s.kelas].some(v => (v || '').toLowerCase().includes(term))
    );

    if (!rows.length) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">${icon('GraduationCap', { size: 28 })}</div>
          <div class="empty-title">Belum ada data siswa</div>
          <div class="empty-hint">Tambah manual atau impor dari CSV.</div>
        </div>
      `;
      return;
    }

    list.innerHTML = `
      <div class="table-responsive">
        <table class="table">
          <thead><tr><th>Nama</th><th>NISN</th><th>Kelas</th><th>L/P</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${rows.map(s => `
              <tr>
                <td><strong>${esc(s.name)}</strong>${s.nis ? `<br><span class="muted" style="font-size:12px">NIS ${esc(s.nis)}</span>` : ''}</td>
                <td>${esc(s.nisn || '-')}</td>
                <td>${esc(s.kelas || '-')}</td>
                <td>${esc(s.gender || '-')}</td>
                <td>${s.status ? `<span class="chip ${s.status === 'Aktif' ? '' : 'amber'}">${esc(s.status)}</span>` : '-'}</td>
                <td class="actions">
                  <button class="btn sm" data-act="edit" data-id="${s.id}">${icon('PenLine', { size: 13 })} Ubah</button>
                  <button class="btn sm danger" data-act="del" data-id="${s.id}">${icon('Trash2', { size: 13 })} Hapus</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <p class="muted" style="font-size:12px;margin-top:10px">Total: ${rows.length} siswa</p>
    `;
  }

  q.addEventListener('input', refresh);
  main.querySelector('#btn-add').addEventListener('click', () => openForm());
  main.querySelector('#btn-import').addEventListener('click', () => openImport());

  list.addEventListener('click', async e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    if (btn.dataset.act === 'del') {
      const ok = await confirmDialog({
        title: 'Hapus data siswa?',
        message: 'Data akan dihapus permanen.',
        confirmText: 'Hapus',
        danger: true,
      });
      if (!ok) return;
      await db.students.delete(id);
      toast.success('Data siswa dihapus.');
      refresh();
    } else if (btn.dataset.act === 'edit') {
      openForm(await db.students.get(id));
    }
  });

  function openForm(existing) {
    const s = existing || {};
    dlg.innerHTML = `
      <form method="dialog" class="form" style="max-height:88vh;overflow-y:auto">
        <h2>${existing ? 'Ubah' : 'Tambah'} Data Siswa</h2>
        <label>Nama Lengkap <input name="name" value="${esc(s.name || '')}" required></label>
        <label>NISN <input name="nisn" value="${esc(s.nisn || '')}"></label>
        <label>NIS <input name="nis" value="${esc(s.nis || '')}"></label>
        <label>Kelas <input name="kelas" value="${esc(s.kelas || '')}" placeholder="mis. 1A, VII-B" required></label>
        <label>Jenis Kelamin
          <select name="gender">
            <option value="">-</option>
            <option value="L" ${s.gender === 'L' ? 'selected' : ''}>Laki-laki</option>
            <option value="P" ${s.gender === 'P' ? 'selected' : ''}>Perempuan</option>
          </select>
        </label>
        <label>Tempat Lahir <input name="birthPlace" value="${esc(s.birthPlace || '')}"></label>
        <label>Tanggal Lahir <input name="birthDate" type="date" value="${esc(s.birthDate || '')}"></label>
        <label>Nama Orang Tua/Wali <input name="parentName" value="${esc(s.parentName || '')}"></label>
        <label>No. HP Orang Tua <input name="parentPhone" value="${esc(s.parentPhone || '')}"></label>
        <label>Alamat <textarea name="address" rows="2">${esc(s.address || '')}</textarea></label>
        <label>Status
          <select name="status">
            ${STATUS.map(st => `<option ${(s.status || 'Aktif') === st ? 'selected' : ''}>${st}</option>`).join('')}
          </select>
        </label>
        <div class="form-actions">
          <button type="button" class="btn" data-close>Batal</button>
          <button type="submit" class="btn primary">Simpan</button>
        </div>
      </form>
    `;
    dlg.showModal();
    dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());

    dlg.querySelector('form').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = {
        name: fd.get('name'),
        nisn: fd.get('nisn'),
        nis: fd.get('nis'),
        kelas: fd.get('kelas'),
        gender: fd.get('gender'),
        birthPlace: fd.get('birthPlace'),
        birthDate: fd.get('birthDate'),
        parentName: fd.get('parentName'),
        parentPhone: fd.get('parentPhone'),
        address: fd.get('address'),
        status: fd.get('status') || 'Aktif',
        updatedAt: Date.now(),
      };
      if (existing) {
        await db.students.update(existing.id, data);
        toast.success('Data siswa diperbarui.');
      } else {
        data.createdAt = Date.now();
        await db.students.add(data);
        toast.success('Siswa ditambahkan.');
      }
      dlg.close();
      refresh();
    });
  }

  function openImport() {
    dlgImport.innerHTML = `
      <div class="form" style="max-height:88vh;overflow-y:auto">
        <h2>Impor Data Siswa</h2>
        <p class="muted" style="margin:0 0 16px;line-height:1.6">
          Unduh template CSV, isi data sesuai kolom, lalu unggah kembali.
          Jangan ubah nama kolom header.
        </p>

        <div class="card" style="background:#F8FAFC;margin-bottom:16px;padding:16px">
          <strong style="font-size:13px">Kolom yang dibutuhkan:</strong>
          <p style="margin:6px 0 0;font-size:12.5px;color:var(--muted);line-height:1.6">
            Nama, NISN, NIS, Kelas, Jenis Kelamin (L/P), Tempat Lahir, Tanggal Lahir (YYYY-MM-DD),
            Nama Orang Tua, No HP Orang Tua, Alamat, Status (Aktif/Lulus/Pindah/Keluar).
            <br>Kolom wajib: <strong>Nama</strong> dan <strong>Kelas</strong>.
          </p>
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn" id="btn-template">${icon('Download', { size: 16 })} Unduh Template CSV</button>
          <label class="btn primary" style="cursor:pointer">
            ${icon('Upload', { size: 16 })} Pilih File CSV
            <input type="file" id="file-import" accept=".csv,text/csv" hidden>
          </label>
        </div>

        <div id="preview-area" style="margin-top:20px"></div>

        <div class="form-actions">
          <button type="button" class="btn" data-close>Batal</button>
        </div>
      </div>
    `;
    dlgImport.showModal();
    dlgImport.querySelector('[data-close]').addEventListener('click', () => dlgImport.close());

    dlgImport.querySelector('#btn-template').addEventListener('click', () => {
      const csv = '\uFEFF' + toCSV(CSV_HEADERS, CSV_SAMPLE);
      download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'template-siswa-admira.csv');
      toast.success('Template CSV diunduh.');
    });

    dlgImport.querySelector('#file-import').addEventListener('change', async e => {
      const file = e.target.files?.[0];
      if (!file) return;
      let text = await file.text();
      text = text.replace(/^\uFEFF/, '');
      const rows = parseCSV(text);
      if (!rows.length) { toast.error('File kosong.'); return; }

      const header = rows[0].map(h => h.trim());
      const dataRows = rows.slice(1).filter(r => r.some(c => String(c).trim()));

      const idx = {};
      header.forEach((h, i) => idx[h.toLowerCase()] = i);

      const need = ['nama', 'kelas'];
      const missing = need.filter(k => !(k in idx));
      if (missing.length) {
        toast.error(`Kolom wajib hilang: ${missing.join(', ')}`);
        return;
      }

      const parsed = [];
      const errors = [];
      for (let i = 0; i < dataRows.length; i++) {
        const r = dataRows[i];
        const get = (k) => {
          const key = Object.keys(idx).find(x => x === k.toLowerCase());
          return key !== undefined ? (r[idx[key]] || '').trim() : '';
        };
        const name = get('nama');
        const kelas = get('kelas');
        if (!name || !kelas) {
          errors.push(`Baris ${i + 2}: Nama/Kelas kosong`);
          continue;
        }
        parsed.push({
          name,
          nisn: get('nisn'),
          nis: get('nis'),
          kelas,
          gender: normalizeGender(get('jenis kelamin')),
          birthPlace: get('tempat lahir'),
          birthDate: normalizeDate(get('tanggal lahir')),
          parentName: get('nama orang tua'),
          parentPhone: get('no hp orang tua'),
          address: get('alamat'),
          status: get('status') || 'Aktif',
          createdAt: Date.now(),
        });
      }

      const previewArea = dlgImport.querySelector('#preview-area');
      if (!parsed.length) {
        previewArea.innerHTML = `<div class="card" style="border-left:4px solid var(--danger)">
          <strong class="error">Tidak ada baris valid.</strong>
          ${errors.length ? `<p class="muted" style="font-size:12.5px;margin-top:6px">${errors.slice(0, 5).join('<br>')}</p>` : ''}
        </div>`;
        return;
      }

      previewArea.innerHTML = `
        <div class="card" style="padding:14px;margin-bottom:10px">
          <strong>File: ${esc(file.name)}</strong><br>
          <span class="muted" style="font-size:13px">
            ${parsed.length} baris valid
            ${errors.length ? ` • <span class="error">${errors.length} baris tidak valid</span>` : ''}
          </span>
        </div>
        <div class="table-responsive" style="max-height:260px;overflow-y:auto;border:1px solid var(--border);border-radius:10px">
          <table class="table" style="font-size:12.5px">
            <thead><tr><th>Nama</th><th>Kelas</th><th>NISN</th><th>L/P</th></tr></thead>
            <tbody>
              ${parsed.slice(0, 10).map(p => `
                <tr><td>${esc(p.name)}</td><td>${esc(p.kelas)}</td><td>${esc(p.nisn || '-')}</td><td>${esc(p.gender || '-')}</td></tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        ${parsed.length > 10 ? `<p class="muted" style="font-size:12px;margin-top:6px">…dan ${parsed.length - 10} baris lainnya</p>` : ''}
        <div style="display:flex;justify-content:flex-end;margin-top:14px">
          <button class="btn primary" id="btn-confirm-import">${icon('Check', { size: 16 })} Impor ${parsed.length} Siswa</button>
        </div>
      `;

      dlgImport.querySelector('#btn-confirm-import').addEventListener('click', async () => {
        const ok = await confirmDialog({
          title: `Impor ${parsed.length} data siswa?`,
          message: 'Data akan ditambahkan ke database. Data lama tidak terhapus.',
          confirmText: 'Impor',
        });
        if (!ok) return;
        await db.students.bulkAdd(parsed);
        toast.success(`${parsed.length} siswa berhasil diimpor.`);
        dlgImport.close();
        refresh();
      });
    });
  }

  await refresh();
  return () => { dlg.close(); dlgImport.close(); };
}
