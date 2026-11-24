// Halaman Profil Sekolah — satu tempat untuk identitas, pimpinan, kurikulum,
// data guru/siswa, dan Rapor Pendidikan Kemdikbud.

import { db } from '../db.js';
import { esc, currentAcademicYear } from '../lib.js';
import { icon } from '../lib-icons.js';
import { toast } from '../lib-toast.js';
import { confirmDialog } from '../lib-confirm.js';
import { loadSchoolProfile, saveSchoolProfile, profileCompleteness } from '../school-profile.js';
import { openCsvImport } from '../lib-csv-import.js';
import {
  parseRaporXlsx, loadRaporReport, saveRaporReport, clearRaporReport,
  listRaporYears, linkRaporReport, syncRaporToProfile, raporNarrative,
} from '../lib-rapor.js';

const TABS = [
  ['identitas', 'Identitas', 'Building2'],
  ['pimpinan', 'Pimpinan & TTD', 'UserCog'],
  ['kurikulum', 'Kurikulum', 'BookOpen'],
  ['guru', 'Data Guru', 'Users'],
  ['siswa', 'Data Siswa', 'GraduationCap'],
  ['rapor', 'Rapor Pendidikan', 'ChartColumn'],
];

const JABATAN = ['Kepala Sekolah', 'Wakil Kepala', 'Guru Kelas', 'Guru Mapel', 'Guru BK', 'Bendahara', 'Tenaga Administrasi', 'Pustakawan', 'Penjaga Sekolah', 'Lainnya'];
const STATUS_GURU = ['PNS', 'PPPK', 'GTT', 'PTT', 'Honorer'];
const PENDIDIKAN = ['SMA/SMK', 'D3', 'S1', 'S2', 'S3'];

const GURU_HEADERS = ['Nama', 'NIP', 'NUPTK', 'Jenis Kelamin', 'Jabatan', 'Wali Kelas', 'Mata Pelajaran', 'Status', 'Pendidikan', 'No HP', 'Email'];
const GURU_SAMPLE = [
  ['Nama Kepala Sekolah', 'NIP Contoh', '', 'L', 'Kepala Sekolah', '', '', 'PNS', 'S1', '', ''],
  ['Nama Guru', '', '', 'P', 'Guru Kelas', 'Contoh Kelas', 'Mata Pelajaran Contoh', 'GTT', 'S1', '', ''],
];

const SISWA_HEADERS = ['Nama', 'NISN', 'NIS', 'Kelas', 'Jenis Kelamin', 'Tempat Lahir', 'Tanggal Lahir', 'Nama Orang Tua', 'No HP Orang Tua', 'Alamat', 'Status'];
const SISWA_SAMPLE = [
  ['Nama Siswa', '0000000000', '0000000', 'Contoh Kelas', 'L', 'Kota Contoh', '2015-01-01', 'Nama Orang Tua', '08xxxxxxxxxx', 'Alamat Contoh', 'Aktif'],
  ['Nama Siswa Lain', '0000000001', '0000001', 'Contoh Kelas', 'P', 'Kota Contoh', '2015-01-01', 'Nama Orang Tua', '08xxxxxxxxxx', 'Alamat Contoh', 'Aktif'],
];

let activeTab = 'identitas';
let profilMain = null;
let profile = {};
let raporReport = null;
let raporYears = [];
let guru = [];
let siswa = [];
let teamNames = new Set();

function normGender(v) {
  const s = String(v || '').trim().toLowerCase();
  if (['l', 'laki-laki', 'laki laki', 'male', 'm'].includes(s)) return 'L';
  if (['p', 'perempuan', 'female', 'f'].includes(s)) return 'P';
  return '';
}

function normDate(v) {
  const s = String(v || '').trim();
  if (!s || /^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : s;
}

function field(name, label, value, opts = {}) {
  const input = opts.textarea
    ? `<textarea name="${name}" rows="${opts.rows || 3}" placeholder="${esc(opts.placeholder || '')}">${esc(value || '')}</textarea>`
    : `<input name="${name}" value="${esc(value || '')}" placeholder="${esc(opts.placeholder || '')}" ${opts.type ? `type="${opts.type}"` : ''}>`;
  return `<label>${label}${opts.hint ? ` <small class="muted">${opts.hint}</small>` : ''}${input}</label>`;
}

function imageField(key, label, hint = 'PNG transparan') {
  const src = profile[key];
  return `
    <div class="profil-image">
      ${src
        ? `<img src="${esc(src)}" alt="${esc(label)}">`
        : `<div class="profil-image-empty">${icon('Image', { size: 22 })}<small>Belum ada</small></div>`}
      <div>
        <strong style="font-size:13px">${esc(label)}</strong>
        <p class="muted" style="margin:2px 0 6px;font-size:12px">${esc(hint)}</p>
        <label class="btn sm" style="cursor:pointer;margin:0">
          ${icon('Upload', { size: 13 })} Ganti
          <input type="file" data-image="${key}" accept="image/png,image/jpeg,image/svg+xml" hidden>
        </label>
        ${src ? `<button type="button" class="btn sm danger" data-act="remove-image" data-key="${key}" style="margin-left:6px">Hapus</button>` : ''}
      </div>
    </div>`;
}

function renderPanel() {
  const el = document.getElementById('profil-panel');
  if (!el) return;
  const views = {
    identitas: viewIdentitas,
    pimpinan: viewPimpinan,
    kurikulum: viewKurikulum,
    guru: viewGuru,
    siswa: viewSiswa,
    rapor: viewRapor,
  };
  el.innerHTML = (views[activeTab] || viewIdentitas)();

  profilMain?.querySelectorAll('#profil-tabs-main [data-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === activeTab);
  });
}

function viewIdentitas() {
  return `
    <div class="card">
      <h2>Identitas Sekolah</h2>
      <p class="muted">Data ini dipakai bersama oleh surat, laporan, dan generator dokumen KSP.</p>
      <form class="form" id="profil-form-identitas">
        ${field('name', 'Nama Sekolah', profile.name, { placeholder: 'NAMA SEKOLAH' })}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${field('npsn', 'NPSN', profile.npsn, { placeholder: '00000000' })}
          ${field('nss', 'NSS', profile.nss, { placeholder: '000000000000' })}
          ${field('akreditasi', 'Akreditasi', profile.akreditasi, { placeholder: 'A / B / C' })}
          ${field('statusSekolah', 'Status Sekolah', profile.statusSekolah, { placeholder: 'Negeri / Swasta' })}
          ${field('city', 'Kota / Kabupaten', profile.city, { placeholder: 'Kota / Kabupaten' })}
          ${field('dinas', 'Nama Dinas Pendidikan', profile.dinas, { placeholder: 'DINAS PENDIDIKAN' })}
        </div>
        ${field('address', 'Alamat Singkat', profile.address, { placeholder: 'Alamat singkat sekolah' })}
        ${field('alamatLengkap', 'Alamat Lengkap', profile.alamatLengkap, { placeholder: 'Alamat lengkap sekolah' })}
        ${field('contact', 'Kontak', profile.contact, { placeholder: 'Nomor telepon / email sekolah' })}
        ${field('website', 'Website / Link', profile.website, { placeholder: 'https://example.com/sekolah' })}

        <h3 style="margin-top:22px">Kop Surat</h3>
        ${field('kopLine1', 'Baris Atas', profile.kopLine1, { placeholder: 'PEMERINTAH KABUPATEN ...' })}
        ${field('kopLine2', 'Baris Dinas', profile.kopLine2, { placeholder: 'DINAS PENDIDIKAN ...' })}
        <div class="profil-image-grid">
          ${imageField('logoDataUrl', 'Logo Kiri')}
          ${imageField('logoRightDataUrl', 'Logo Kanan')}
        </div>
        <div class="form-actions">${icon('Save', { size: 15 })} <button class="btn primary" type="submit">Simpan Identitas</button></div>
      </form>
    </div>`;
}

function viewPimpinan() {
  return `
    <div class="card">
      <h2>Pimpinan & Tanda Tangan</h2>
      <p class="muted">Nama yang tersetujui pada tab Persetujuan E-KSP akan menggantikan nama di bawah saat mencetak surat.</p>
      <form class="form" id="profil-form-pimpinan">
        <h3>Kepala Sekolah</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${field('headmaster', 'Nama Kepala Sekolah', profile.headmaster)}
          ${field('headmasterNip', 'NIP', profile.headmasterNip)}
        </div>
        ${field('headmasterRank', 'Pangkat / Golongan', profile.headmasterRank, { placeholder: 'Pangkat / Golongan' })}
        <h3 style="margin-top:20px">Komite & Pengawas</h3>
        ${field('ketuaKomite', 'Ketua Komite Sekolah', profile.ketuaKomite)}
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          ${field('pengawas', 'Nama Pengawas Sekolah', profile.pengawas)}
          ${field('nipPengawas', 'NIP Pengawas', profile.nipPengawas)}
        </div>
        <div class="profil-image-grid">
          ${imageField('signatureDataUrl', 'Tanda Tangan Kepala')}
          ${imageField('stampDataUrl', 'Cap Sekolah')}
          ${imageField('pengawasSignature', 'Tanda Tangan Pengawas')}
        </div>
        <div class="form-actions">${icon('Save', { size: 15 })} <button class="btn primary" type="submit">Simpan Pimpinan</button></div>
      </form>
    </div>`;
}

function viewKurikulum() {
  const years = [];
  const start = Number(String(profile.tahun || currentAcademicYear()).slice(0, 4)) || new Date().getFullYear();
  for (let y = start - 3; y <= start + 2; y++) years.push(`${y}/${y + 1}`);

  return `
    <div class="card">
      <h2>Kurikulum & Visi Sekolah</h2>
      <p class="muted">Tahun ajaran aktif menentukan tahun dokumen yang di-generate.</p>
      <form class="form" id="profil-form-kurikulum">
        <label>Tahun Ajaran Aktif
          <select name="tahun">${years.map(y => `<option value="${y}" ${y === profile.tahun ? 'selected' : ''}>${y}</option>`).join('')}</select>
        </label>
        ${field('visi', 'Visi', profile.visi, { textarea: true, rows: 3 })}
        ${field('misi', 'Misi', profile.misi, { textarea: true, rows: 5, hint: '(satu baris per point)' })}
        ${field('tujuan', 'Tujuan Sekolah', profile.tujuan, { textarea: true, rows: 5, hint: '(satu baris per point)' })}
        ${field('dimensi', 'Dimensi Profil Pelajar', profile.dimensi, { textarea: true, rows: 3, hint: '(satu per baris)' })}
        <div class="form-actions">${icon('Save', { size: 15 })} <button class="btn primary" type="submit">Simpan Kurikulum</button></div>
      </form>
    </div>`;
}

function viewGuru() {
  return `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <div><h2 style="margin:0">Data Guru & Staf</h2><p class="muted" style="margin:4px 0 0">${guru.length} orang tercatat. Centang Tim untuk dimasukkan ke Tim Pengembang KSP ${esc(profile.tahun)}.</p></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn" data-act="import-guru" type="button">${icon('FileSpreadsheet', { size: 15 })} Impor CSV</button>
          <button class="btn primary" data-act="add-guru" type="button">${icon('Plus', { size: 15 })} Tambah Guru</button>
        </div>
      </div>
      ${guru.length ? `
        <div class="table-responsive" style="margin-top:14px">
          <table class="table">
            <thead><tr><th style="width:120px">Tim</th><th>Nama</th><th>NIP/NUPTK</th><th>Jabatan</th><th>Mapel / Wali</th><th></th></tr></thead>
            <tbody>${guru.map(g => `
              <tr>
                <td><label class="profil-check"><input type="checkbox" data-team="${g.id}" ${teamNames.has(g.name) ? 'checked' : ''}> Tim</label></td>
                <td><strong>${esc(g.name)}</strong></td>
                <td>${esc(g.nip || '-')}${g.nuptk ? `<br><small class="muted">${esc(g.nuptk)}</small>` : ''}</td>
                <td>${esc(g.jabatan || '-')}</td>
                <td>${esc(g.mapel || '')}${g.waliKelas ? ` / ${esc(g.waliKelas)}` : ''}</td>
                <td class="actions">
                  <button class="btn sm" data-act="edit-guru" data-id="${g.id}" type="button">${icon('PenLine', { size: 13 })}</button>
                  <button class="btn sm danger" data-act="del-guru" data-id="${g.id}" type="button">${icon('Trash2', { size: 13 })}</button>
                </td>
              </tr>`).join('')}</tbody>
          </table>
        </div>` : '<div class="empty-state"><div class="empty-icon">'+icon('Users', { size: 28 })+'</div><div class="empty-title">Belum ada data guru</div><div class="empty-hint">Tambah manual atau impor dari CSV.</div></div>'}
      <p class="muted" style="margin:12px 0 0"><a href="#/staff">Kelola kepegawaian lengkap →</a></p>
    </div>`;
}

function viewSiswa() {
  const total = siswa.length;
  const classes = [...new Set(siswa.map(s => s.kelas).filter(Boolean))].sort();
  return `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap">
        <div><h2 style="margin:0">Data Siswa</h2><p class="muted" style="margin:4px 0 0">${total} siswa • ${classes.length} kelas. Jumlah per kelas otomatis dipakai generator KSP.</p></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn primary" data-act="import-siswa" type="button">${icon('FileSpreadsheet', { size: 15 })} Impor CSV</button>
          <a class="btn" href="#/students">${icon('PenLine', { size: 15 })} Kelola Siswa</a>
        </div>
      </div>
      ${classes.length ? `
        <div class="profil-class-grid" style="margin-top:14px">
          ${classes.map(k => `<div class="profil-class"><strong>${esc(k)}</strong><span>${siswa.filter(s => s.kelas === k).length} siswa</span></div>`).join('')}
        </div>` : '<div class="empty-state"><div class="empty-icon">'+icon('GraduationCap', { size: 28 })+'</div><div class="empty-title">Belum ada data siswa</div><div class="empty-hint">Impor CSV untuk mengisi jumlah siswa per kelas.</div></div>'}
    </div>`;
}

const RAPOR_ASPEK = [
  ['literasi', 'Hasil Belajar — Literasi'],
  ['literasiSkor', 'Nilai Rerata Literasi'],
  ['numerasi', 'Hasil Belajar — Numerasi'],
  ['numerasiSkor', 'Nilai Rerata Numerasi'],
  ['karakter', 'Hasil Belajar — Karakter'],
  ['kualitasPembelajaran', 'Kualitas Pembelajaran'],
  ['refleksiGuru', 'Refleksi & Perbaikan Guru'],
  ['kepemimpinan', 'Kepemimpinan Instruksional'],
  ['iklimKeamanan', 'Iklim Keamanan Satuan Pendidikan'],
  ['kesetaraanGender', 'Iklim Kesetaraan Gender'],
  ['kebinekaan', 'Iklim Kebinekaan'],
  ['inklusivitas', 'Iklim Inklusivitas'],
  ['kesiapsiagaan', 'Kesiapsiagaan Bencana & Perubahan Iklim'],
  ['kebiasaan', 'Tujuh Kebiasaan Anak Indonesia Hebat'],
  ['partisipasi', 'Partisipasi Warga Satuan Pendidikan'],
  ['sumberDaya', 'Pemanfaatan Sumber Daya Sekolah'],
  ['tikAnggaran', 'Pemanfaatan TIK untuk Pengelolaan Anggaran'],
  ['programKebijakan', 'Program & Kebijakan Satuan Pendidikan'],
  ['fasilitas', 'Indeks Fasilitas Satuan Pendidikan'],
  ['rombel', 'Kesesuaian Rombongan Belajar'],
  ['pelatihanPTK', 'Pengalaman Pelatihan PTK'],
  ['kompetensiPTK', 'Kompetensi Pendidik & PTK'],
  ['kompetensiSosial', 'Kompetensi Sosial (karakteristik PTK)'],
  ['ketersediaanBuku', 'Ketersediaan Buku Pendidikan'],
];

function raporBadge(status, level) {
  const cls = ['merah', 'kuning', 'hijau', 'abu'].includes(status) ? status : 'abu';
  return `<span class="rapor-badge ${cls}">${esc(level || '-')}</span>`;
}

function raporImportButton(label = 'Impor Rapor .xlsx') {
  return `<label class="btn primary" style="cursor:pointer;margin:0">
    ${icon('Upload', { size: 15 })} ${label}
    <input type="file" id="rapor-file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden>
  </label>`;
}

function raporYearSelect(current = '', includeEmpty = false) {
  return `<select id="rapor-year-select" aria-label="Tahun laporan tersimpan">
    ${includeEmpty ? '<option value="">- Pilih tahun -</option>' : ''}
    ${raporYears.map(y => `<option value="${esc(y)}" ${y === current ? 'selected' : ''}>${esc(y)}</option>`).join('')}
  </select>`;
}

function viewRapor() {
  if (!raporReport) {
    return `
      <div class="card">
        <h2>Rapor Pendidikan Kemdikbud</h2>
        <p class="muted">Impor berkas unduhan Rapor Pendidikan / PBD format <code>.xlsx</code>. Seluruh indikator, temuan kuning–merah, akar masalah, dan 12 rekomendasi prioritas akan tersimpan per tahun ajaran dan langsung dipakai generator KSP.</p>
        <div class="rapor-import-empty">
          ${icon('ChartColumn', { size: 34 })}
          <h3>Belum ada Rapor Pendidikan untuk Tahun Ajaran ${esc(profile.tahun || '-')}</h3>
          <p class="muted">Berkas asli tidak diubah. Data dibaca lalu disimpan sebagai laporan terstruktur di perangkat ini.</p>
          ${raporYears.length ? `
            <p class="muted" style="margin-bottom:8px">Ada ${raporYears.length} laporan tersimpan. Pilih tahun untuk memakainya:</p>
            <div class="rapor-year-picker">${raporYearSelect('', true)}</div>
          ` : ''}
          <div class="rapor-year-picker">${raporImportButton()}</div>
        </div>
      </div>`;
  }

  const r = raporReport;
  const s = r.summary || {};
  const main = [
    ['Hasil Belajar — Literasi', s.literasi, s.literasi?.capaianTeks, 'Capaian kompetensi minimum'],
    ['Hasil Belajar — Numerasi', s.numerasi, s.numerasi?.capaianTeks, 'Capaian kompetensi minimum'],
    ['Hasil Belajar — Karakter', s.karakter, s.karakter?.skorTeks, 'Nilai rerata karakter'],
  ].map(([label, item, value, hint]) => `
    <div class="rapor-main-card">
      <span class="muted">${esc(label)}</span>
      <strong>${esc(value || '-')}</strong>
      <small class="muted">${esc(hint)}</small>
      <div>${raporBadge(item?.status, item?.level)} <small class="muted">Rerata ${esc(item?.skorTeks || '-')}</small></div>
      <small class="muted">${esc(item?.perubahan || '-')}</small>
    </div>`).join('');

  const aspekRows = RAPOR_ASPEK.map(([key, label]) => [label, s[key]])
    .filter(([, item]) => item)
    .map(([label, item]) => `
      <tr>
        <td>${esc(label)}</td>
        <td>${esc(item.capaianTeks || item.skorTeks || '-')}</td>
        <td>${esc(item.skorTeks || '-')}</td>
        <td>${raporBadge(item.status, item.level)}</td>
        <td>${esc(item.perubahan || '-')}</td>
        <td>${esc(item.peringkatKab || '-')}</td>
      </tr>`).join('');

  const issueRows = (r.issues || []).map(i => `
    <tr>
      <td>${esc(i.code)}</td>
      <td>${esc(i.name)}</td>
      <td>${esc(i.capaian || i.skorTeks || '-')}</td>
      <td>${esc(i.skorTeks || '-')}</td>
      <td>${raporBadge(i.status, i.level)}</td>
      <td>${esc(i.peringkatKab || '-')}</td>
    </tr>`).join('');

  const prioritas = (r.priorities || []).map(p => `
    <div class="rapor-prioritas">
      <div class="rapor-prioritas-head">
        <span class="rapor-no">${p.no}</span>
        <strong>${esc(p.indikator)}</strong>
        ${raporBadge(/kurang/i.test(p.capaian) ? 'merah' : /sedang/i.test(p.capaian) ? 'kuning' : /baik/i.test(p.capaian) ? 'hijau' : 'abu', p.capaian)}
      </div>
      <p><strong>Akar masalah:</strong> ${esc(p.akarLevel2 || '-')}</p>
      <p>${esc(p.benahi || '-')}</p>
      <details>
        <summary>Inspirasi kegiatan &amp; padanan ARKAS</summary>
        <p><strong>Inspirasi:</strong> ${esc(p.inspirasi || '-')}</p>
        <p><strong>ARKAS:</strong> ${esc(p.arkas || '-')}</p>
        ${p.referensi ? `<p><a href="${esc(p.referensi)}" target="_blank" rel="noopener">Referensi benahi ↗</a></p>` : ''}
      </details>
    </div>`).join('');

  const akar = (r.rootCauses || []).map(x => `
    <li><strong>${esc(x.name)}</strong> <span class="muted">(${x.count} prioritas)</span></li>`).join('');

  const semuaRows = (r.indicators || []).map(i => `
    <tr>
      <td>${esc(i.code)}</td><td>${esc(i.name)}</td>
      <td>${esc(i.capaian || '-')}</td><td>${esc(i.skorTeks || '-')}</td>
      <td>${raporBadge(i.status, i.level)}</td><td>${esc(i.perubahan || '-')}</td>
    </tr>`).join('');

  return `
    <div class="card">
      <div class="rapor-head">
        <div>
          <h2 style="margin-bottom:4px">Rapor Pendidikan Kemdikbud — ${esc(r.tahun || '-')}</h2>
          <p class="muted" style="margin:0">${esc(r.namaSekolah || profile.name || '')} • diperbarui ${esc(r.diperbarui || '-')} • ${(r.indicators || []).length} indikator, ${(r.priorities || []).length} prioritas</p>
        </div>
        <div class="rapor-head-actions">
          ${raporYears.length ? `<label class="muted" style="font-size:12px">Tersimpan: ${raporYearSelect(r.tahun)}</label>` : ''}
          ${raporImportButton('Ganti berkas')}
          <button class="btn sm danger" data-act="clear-rapor" type="button">${icon('Trash2', { size: 13 })} Lepaskan</button>
        </div>
      </div>
      <p>${esc(raporNarrative(r))}</p>
      <p class="muted" style="font-size:12px">Sumber: ${esc(r.fileName || '-')}</p>
      <div class="rapor-main-grid">${main}</div>
      <p class="muted" style="font-size:12px;margin:14px 0 0">Indikator bertanda <strong>Tidak Tersedia</strong> pada berkas PBD tidak dibaca sebagai nilai 0 dan tidak dimasukkan sebagai temuan kuning/merah.</p>
    </div>

    <details class="rapor-detail" open>
      <summary>Ringkasan seluruh aspek (${aspekRows ? RAPOR_ASPEK.filter(([k]) => s[k]).length : 0})</summary>
      <table class="ksp-table"><thead><tr>
        <th>Aspek</th><th>Capaian</th><th>Skor</th><th>Level</th><th>Perubahan</th><th>Peringkat Kab/Kota</th>
      </tr></thead><tbody>${aspekRows}</tbody></table>
    </details>

    <details class="rapor-detail" open>
      <summary>Temuan perlu perhatian (${(r.issues || []).length} indikator kuning/merah)</summary>
      <table class="ksp-table"><thead><tr>
        <th>Kode</th><th>Indikator</th><th>Capaian</th><th>Skor</th><th>Status</th><th>Peringkat</th>
      </tr></thead><tbody>${issueRows || '<tr><td colspan="6">Tidak ada temuan.</td></tr>'}</tbody></table>
    </details>

    <details class="rapor-detail">
      <summary>Akar masalah paling sering muncul</summary>
      <ol>${akar || '<li>Belum ada rekomendasi.</li>'}</ol>
    </details>

    <details class="rapor-detail">
      <summary>Rekomendasi prioritas Kemendikdasmen (${(r.priorities || []).length})</summary>
      <div class="rapor-prioritas-grid">${prioritas}</div>
    </details>

    <details class="rapor-detail">
      <summary>Seluruh indikator (${(r.indicators || []).length})</summary>
      <table class="ksp-table"><thead><tr>
        <th>Kode</th><th>Indikator</th><th>Capaian</th><th>Skor</th><th>Status</th><th>Perubahan</th>
      </tr></thead><tbody>${semuaRows}</tbody></table>
    </details>`;
}

function openGuruForm(existing) {
  const dlg = document.getElementById('dlg-guru');
  const g = existing || {};
  dlg.innerHTML = `
    <button type="button" class="modal-close" data-close aria-label="Tutup">${icon('X', { size: 18 })}</button>
    <form class="form" style="max-height:88vh;overflow-y:auto">
      <h2>${existing ? 'Ubah' : 'Tambah'} Data Guru</h2>
      ${field('name', 'Nama Lengkap', g.name)}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${field('nip', 'NIP', g.nip)}
        ${field('nuptk', 'NUPTK', g.nuptk)}
        ${field('gender', 'Jenis Kelamin', g.gender)}
        ${field('jabatan', 'Jabatan', g.jabatan)}
      </div>
      ${field('waliKelas', 'Wali Kelas', g.waliKelas, { placeholder: 'mis. 1A' })}
      ${field('mapel', 'Mata Pelajaran', g.mapel)}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
        ${field('status', 'Status Kepegawaian', g.status)}
        ${field('pendidikan', 'Pendidikan Terakhir', g.pendidikan)}
      </div>
      ${field('phone', 'No. HP', g.phone)}
      ${field('email', 'Email', g.email, { type: 'email' })}
      <div class="form-actions">
        <button type="button" class="btn" data-close>Batal</button>
        <button type="submit" class="btn primary">Simpan</button>
      </div>
    </form>`;
  // select options untuk field yang sudah punya daftar
  const selects = {
    gender: [['', '-'], ['L', 'Laki-laki'], ['P', 'Perempuan']],
    jabatan: [['', '-'], ...JABATAN.map(j => [j, j])],
    status: [['', '-'], ...STATUS_GURU.map(s => [s, s])],
    pendidikan: [['', '-'], ...PENDIDIKAN.map(p => [p, p])],
  };
  for (const [name, opts] of Object.entries(selects)) {
    const input = dlg.querySelector(`[name="${name}"]`);
    if (!input) continue;
    const current = input.getAttribute('value') || '';
    input.outerHTML = `<select name="${name}">${opts.map(([v, l]) => `<option value="${esc(v)}" ${v === current ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  }
  dlg.showModal();
  dlg.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => dlg.close()));
  dlg.querySelector('form').addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target).entries());
    data.name = String(data.name || '').trim();
    if (!data.name) { toast.error('Nama wajib diisi.'); return; }
    data.updatedAt = Date.now();
    if (existing) await db.staff.update(existing.id, data);
    else await db.staff.add({ ...data, createdAt: Date.now() });
    dlg.close();
    await loadData(); renderPanel();
    toast.success(existing ? 'Data guru diperbarui.' : 'Guru ditambahkan.');
  });
}

async function loadData() {
  profile = await loadSchoolProfile();
  [raporReport, raporYears] = await Promise.all([
    loadRaporReport(profile.tahun), listRaporYears(),
  ]);
  [guru, siswa] = await Promise.all([
    db.staff.orderBy('name').toArray(),
    db.students.orderBy('kelas').toArray(),
  ]);
  teamNames = new Set((await db.ksp_team.where('year').equals(profile.tahun).toArray()).map(t => t.name));
}

async function saveProfile(fd) {
  const patch = Object.fromEntries(fd.entries());
  if (patch.tahun) {
    patch.academicYear = patch.tahun;
    await saveSchoolProfile({ tahun: patch.tahun });
  }
  profile = await saveSchoolProfile(patch);
  raporReport = await loadRaporReport(profile.tahun);
  teamNames = new Set((await db.ksp_team.where('year').equals(profile.tahun).toArray()).map(t => t.name));
  renderPanel();
  toast.success('Profil sekolah tersimpan.');
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function renderProfil(main) {
  profilMain = main;
  await loadData();
  const complete = profileCompleteness(profile);
  const summary = TABS.slice(0, 3).concat([TABS[5]]).map(([key, label]) => `
    <div class="profil-summary"><span>${esc(label)}</span><strong>${complete[key].pct}%</strong></div>`).join('');

  main.innerHTML = `
    <div class="page-head">
      <h1>Profil Sekolah</h1>
      <span class="muted">Sumber data terpusat untuk seluruh dokumen</span>
    </div>
    <div class="profil-summary-grid">${summary}</div>
    <div class="ksp-tabs" id="profil-tabs-main" style="margin-bottom:16px">
      ${TABS.map(([key, label, ico]) => `
        <button class="ksp-tab ${activeTab === key ? 'active' : ''}" data-tab="${key}" type="button">
          ${icon(ico, { size: 16 })} ${label}
        </button>`).join('')}
    </div>
    <div id="profil-panel"></div>
    <dialog id="dlg-guru" class="dialog-wide"></dialog>
    <dialog id="dlg-import" class="dialog-wide"></dialog>
  `;

  const onClick = async e => {
    const tab = e.target.closest('[data-tab]');
    if (tab) {
      activeTab = tab.dataset.tab;
      profilMain?.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b === tab));
      renderPanel();
      return;
    }

    const act = e.target.closest('[data-act]');
    if (!act) return;
    const id = Number(act.dataset.id);
    if (act.dataset.act === 'add-guru') openGuruForm();
    else if (act.dataset.act === 'edit-guru') openGuruForm(guru.find(g => g.id === id));
    else if (act.dataset.act === 'del-guru') {
      const ok = await confirmDialog({ title: 'Hapus data guru?', message: 'Data akan dihapus permanen.', confirmText: 'Hapus', danger: true });
      if (!ok) return;
      await db.staff.delete(id);
      await loadData(); renderPanel();
      toast.success('Data guru dihapus.');
    } else if (act.dataset.act === 'clear-rapor') {
      const ok = await confirmDialog({
        title: 'Hapus Rapor Pendidikan?',
        message: `Rapor ${raporReport?.tahun || '-'} tidak lagi dipakai untuk Tahun Ajaran ${profile.tahun || '-'}. Berkas asli dan arsip tahun lain tidak terpengaruh.`,
        confirmText: 'Lepaskan', danger: true,
      });
      if (!ok) return;
      await clearRaporReport(profile.tahun);
      await saveSchoolProfile({
        raporTahun: '', raporLiterasi: '', raporNumerasi: '', raporKarakter: '',
        raporLevelLiterasi: '', raporLevelNumerasi: '', raporLevelKarakter: '',
        raporCatatan: '',
      });
      profile = await loadSchoolProfile();
      raporReport = null;
      renderPanel();
      toast.success(`Rapor dilepaskan dari Tahun Ajaran ${profile.tahun || '-'}. Arsip tetap tersimpan.`);
    } else if (act.dataset.act === 'remove-image') {
      await saveSchoolProfile({ [act.dataset.key]: '' });
      profile = await loadSchoolProfile();
      renderPanel();
    } else if (act.dataset.act === 'import-guru') {
      openCsvImport({
        dlg: document.getElementById('dlg-import'),
        title: 'Impor Data Guru',
        headers: GURU_HEADERS,
        sample: GURU_SAMPLE,
        required: ['Nama'],
        table: db.staff,
        fileName: 'template-guru-admira.csv',
        label: 'guru',
        previewColumns: [['Nama', 'name'], ['NIP', 'nip'], ['Jabatan', 'jabatan'], ['Mapel', 'mapel']],
        parseRow: get => {
          const name = get('Nama');
          if (!name) return null;
          return {
            name, nip: get('NIP'), nuptk: get('NUPTK'),
            gender: normGender(get('Jenis Kelamin')),
            jabatan: get('Jabatan'), waliKelas: get('Wali Kelas'), mapel: get('Mata Pelajaran'),
            status: get('Status'), pendidikan: get('Pendidikan'),
            phone: get('No HP'), email: get('Email'), createdAt: Date.now(),
          };
        },
        onDone: async () => { await loadData(); renderPanel(); },
      });
    } else if (act.dataset.act === 'import-siswa') {
      openCsvImport({
        dlg: document.getElementById('dlg-import'),
        title: 'Impor Data Siswa',
        headers: SISWA_HEADERS,
        sample: SISWA_SAMPLE,
        required: ['Nama', 'Kelas'],
        table: db.students,
        fileName: 'template-siswa-admira.csv',
        label: 'siswa',
        previewColumns: [['Nama', 'name'], ['Kelas', 'kelas'], ['NISN', 'nisn'], ['L/P', 'gender']],
        parseRow: get => {
          const name = get('Nama');
          const kelas = get('Kelas');
          if (!name || !kelas) return null;
          return {
            name, nisn: get('NISN'), nis: get('NIS'), kelas,
            gender: normGender(get('Jenis Kelamin')),
            birthPlace: get('Tempat Lahir'), birthDate: normDate(get('Tanggal Lahir')),
            parentName: get('Nama Orang Tua'), parentPhone: get('No HP Orang Tua'),
            address: get('Alamat'), status: get('Status') || 'Aktif', createdAt: Date.now(),
          };
        },
        onDone: async () => { await loadData(); renderPanel(); },
      });
    }
  };

  const onChange = async e => {
    if (e.target.matches('#rapor-file')) {
      const file = e.target.files?.[0];
      if (!file) return;
      toast.info('Membaca Rapor Pendidikan…');
      try {
        const report = await parseRaporXlsx(file);
        await saveRaporReport(report, profile.tahun || report.tahun);
        profile = await saveSchoolProfile(syncRaporToProfile(report));
        await loadData();
        renderPanel();
        toast.success(`Rapor ${report.tahun} diimpor: ${report.indicators.length} indikator, ${report.priorities.length} prioritas.`);
      } catch (err) {
        console.error(err);
        toast.error(err?.message || 'Gagal membaca berkas Rapor Pendidikan.');
        e.target.value = '';
      }
      return;
    }
    if (e.target.matches('#rapor-year-select')) {
      const year = e.target.value;
      if (!year) return;
      const linked = await linkRaporReport(profile.tahun, year);
      if (!linked) { toast.error('Laporan tahun tersebut tidak ditemukan.'); return; }
      profile = await saveSchoolProfile(syncRaporToProfile(linked));
      raporReport = linked;
      renderPanel();
      toast.success(`Rapor ${year} dipakai untuk Tahun Ajaran ${profile.tahun || '-'}.`);
      return;
    }
    const check = e.target.closest('[data-team]');
    if (check) {
      const g = guru.find(x => x.id === Number(check.dataset.team));
      if (!g) return;
      if (check.checked) {
        const exists = await db.ksp_team.where('year').equals(profile.tahun).filter(t => t.name === g.name).first();
        if (!exists) {
          await db.ksp_team.add({
            year: profile.tahun, name: g.name, nip: g.nip || '',
            role: g.jabatan || 'Anggota Tim', createdAt: Date.now(),
          });
        }
      } else {
        const rows = await db.ksp_team.where('year').equals(profile.tahun).filter(t => t.name === g.name).toArray();
        for (const r of rows) await db.ksp_team.delete(r.id);
      }
      teamNames = new Set((await db.ksp_team.where('year').equals(profile.tahun).toArray()).map(t => t.name));
      toast.success(check.checked ? 'Ditambahkan ke Tim Pengembang.' : 'Dikeluarkan dari Tim Pengembang.');
      return;
    }
    if (e.target.matches('[data-image]')) {
      const file = e.target.files?.[0];
      if (!file) return;
      const dataUrl = await fileToDataUrl(file);
      await saveSchoolProfile({ [e.target.dataset.image]: dataUrl });
      profile = await loadSchoolProfile();
      renderPanel();
      toast.success('Gambar tersimpan.');
    }
  };

  const onSubmit = async e => {
    if (!e.target.id.startsWith('profil-form-')) return;
    e.preventDefault();
    await saveProfile(new FormData(e.target));
  };

  main.addEventListener('click', onClick);
  main.addEventListener('change', onChange);
  main.addEventListener('submit', onSubmit);
  renderPanel();

  return () => {
    main.removeEventListener('click', onClick);
    main.removeEventListener('change', onChange);
    main.removeEventListener('submit', onSubmit);
    document.getElementById('dlg-guru')?.close();
    document.getElementById('dlg-import')?.close();
  };
}
