import { db } from '../db.js';
import { esc, fmtDate } from '../lib.js';
import { icon } from '../lib-icons.js';
import { confirmDialog } from '../lib-confirm.js';
import { toast } from '../lib-toast.js';

const JABATAN = ['Kepala Sekolah', 'Wakil Kepala', 'Guru Kelas', 'Guru Mapel', 'Guru BK', 'Bendahara', 'Tenaga Administrasi', 'Pustakawan', 'Penjaga Sekolah', 'Lainnya'];
const STATUS = ['PNS', 'PPPK', 'GTT', 'PTT', 'Honorer'];
const PENDIDIKAN = ['SMA/SMK', 'D3', 'S1', 'S2', 'S3'];

export async function renderStaff(main) {
  main.innerHTML = `
    <div class="page-head">
      <h1>Kepegawaian</h1>
      <button class="btn primary" id="btn-add">${icon('Plus', { size: 16 })} Tambah Pegawai</button>
    </div>
    <div class="card">
      <input type="search" id="q" placeholder="Cari nama, NIP, jabatan…"
             style="width:100%;padding:9px 12px;border:1px solid #E5E7EB;border-radius:8px;margin-bottom:12px">
      <div id="list"></div>
    </div>
    <dialog id="dlg"></dialog>
  `;

  const list = main.querySelector('#list');
  const dlg = main.querySelector('#dlg');
  const q = main.querySelector('#q');

  async function refresh() {
    const all = await db.staff.reverse().sortBy('createdAt');
    const term = q.value.trim().toLowerCase();
    const rows = all.filter(s =>
      !term || [s.name, s.nip, s.jabatan, s.status, s.waliKelas].some(v => (v || '').toLowerCase().includes(term))
    );

    if (!rows.length) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">${icon('UserCog', { size: 28 })}</div>
          <div class="empty-title">Belum ada data pegawai</div>
          <div class="empty-hint">Klik "Tambah Pegawai" untuk menambahkan data guru atau staf.</div>
        </div>
      `;
      return;
    }

    list.innerHTML = `
      <div class="table-responsive">
        <table class="table">
          <thead>
            <tr><th>Nama</th><th>NIP/NUPTK</th><th>Jabatan</th><th>Status</th><th>Kontak</th><th></th></tr>
          </thead>
          <tbody>
            ${rows.map(s => `
              <tr>
                <td><strong>${esc(s.name)}</strong>${s.gender ? ` <span class="muted">(${esc(s.gender)})</span>` : ''}</td>
                <td>${esc(s.nip || '-')}${s.nuptk ? `<br><span class="muted" style="font-size:12px">${esc(s.nuptk)}</span>` : ''}</td>
                <td>
                  ${esc(s.jabatan || '-')}
                  ${s.waliKelas ? `<br><span class="chip" style="margin-top:4px;font-size:11px">Wali ${esc(s.waliKelas)}</span>` : ''}
                </td>
                <td>${s.status ? `<span class="chip">${esc(s.status)}</span>` : '-'}</td>
                <td>${s.phone ? esc(s.phone) : '-'}</td>
                <td class="actions">
                  <button class="btn sm" data-act="edit" data-id="${s.id}">${icon('PenLine', { size: 13 })} Ubah</button>
                  <button class="btn sm danger" data-act="del" data-id="${s.id}">${icon('Trash2', { size: 13 })} Hapus</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  q.addEventListener('input', refresh);
  main.querySelector('#btn-add').addEventListener('click', () => openForm());

  list.addEventListener('click', async e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    if (btn.dataset.act === 'del') {
      const ok = await confirmDialog({
        title: 'Hapus data pegawai?',
        message: 'Data akan dihapus permanen.',
        confirmText: 'Hapus',
        danger: true,
      });
      if (!ok) return;
      await db.staff.delete(id);
      toast.success('Data pegawai dihapus.');
      refresh();
    } else if (btn.dataset.act === 'edit') {
      openForm(await db.staff.get(id));
    }
  });

  function openForm(existing) {
    const s = existing || {};
    dlg.innerHTML = `
      <form method="dialog" class="form" style="max-height:88vh;overflow-y:auto">
        <h2>${existing ? 'Ubah' : 'Tambah'} Data Pegawai</h2>
        <label>Nama Lengkap <input name="name" value="${esc(s.name || '')}" required></label>
        <label>NIP <input name="nip" value="${esc(s.nip || '')}" placeholder="opsional"></label>
        <label>NUPTK <input name="nuptk" value="${esc(s.nuptk || '')}" placeholder="opsional"></label>
        <label>Jenis Kelamin
          <select name="gender">
            <option value="">-</option>
            <option value="L" ${s.gender === 'L' ? 'selected' : ''}>Laki-laki</option>
            <option value="P" ${s.gender === 'P' ? 'selected' : ''}>Perempuan</option>
          </select>
        </label>
        <label>Jabatan
          <select name="jabatan">
            <option value="">-</option>
            ${JABATAN.map(j => `<option ${s.jabatan === j ? 'selected' : ''}>${j}</option>`).join('')}
          </select>
        </label>
        <label>Wali Kelas <input name="waliKelas" value="${esc(s.waliKelas || '')}" placeholder="mis. 1A, VII-B (opsional)"></label>
        <label>Mata Pelajaran <input name="mapel" value="${esc(s.mapel || '')}" placeholder="opsional"></label>
        <label>Status Kepegawaian
          <select name="status">
            <option value="">-</option>
            ${STATUS.map(st => `<option ${s.status === st ? 'selected' : ''}>${st}</option>`).join('')}
          </select>
        </label>
        <label>Pendidikan Terakhir
          <select name="pendidikan">
            <option value="">-</option>
            ${PENDIDIKAN.map(p => `<option ${s.pendidikan === p ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </label>
        <label>No. HP <input name="phone" value="${esc(s.phone || '')}" placeholder="opsional"></label>
        <label>Email <input name="email" type="email" value="${esc(s.email || '')}" placeholder="opsional"></label>
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
        nip: fd.get('nip'),
        nuptk: fd.get('nuptk'),
        gender: fd.get('gender'),
        jabatan: fd.get('jabatan'),
        waliKelas: fd.get('waliKelas'),
        mapel: fd.get('mapel'),
        status: fd.get('status'),
        pendidikan: fd.get('pendidikan'),
        phone: fd.get('phone'),
        email: fd.get('email'),
        updatedAt: Date.now(),
      };
      if (existing) {
        await db.staff.update(existing.id, data);
        toast.success('Data pegawai diperbarui.');
      } else {
        data.createdAt = Date.now();
        await db.staff.add(data);
        toast.success('Pegawai ditambahkan.');
      }
      dlg.close();
      refresh();
    });
  }

  await refresh();
  return () => dlg.close();
}
