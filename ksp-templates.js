// Pustaka 11 template KSP bersih, mengikuti format dokumen KSP Kemdikdasmen.
// Bukan salinan verbatim: data tetap diambil dari Profil Sekolah, tim, guru,
// siswa, dokumen, dan hasil verval. Inkonsistensi dokumen asli dicatat pada
// `corrections` dan otomatis diperbaiki lewat token/data dinamis.

import { buildKspPrintHtml, formatDateId } from './lib-print.js';
import { buildKspDocumentHtml } from './lib-ksp-doc.js';

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[c]);

const dash = (v, fallback = '—') => {
  const s = String(v ?? '').trim();
  return s || fallback;
};

const norm = s => String(s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

function num(v) {
  if (v === '' || v === null || v === undefined) return null;
  const match = String(v).replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

function average(values) {
  const nums = values.map(num).filter(n => n !== null);
  return nums.length ? Math.round((nums.reduce((a, b) => a + b, 0) / nums.length) * 10) / 10 : null;
}

function table(headers, rows, attrs = '') {
  if (!rows.length) return '<p class="placeholder">[Belum ada data.]</p>';
  return `<table class="data" ${attrs}>
    <thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>`;
}

function kv(rows) {
  return `<table style="margin-left:16px;margin-bottom:14px">
    ${rows.map(([k, v]) => `<tr><td style="width:150px">${esc(k)}</td><td>: ${v}</td></tr>`).join('')}
  </table>`;
}

function list(lines, fallback = '[Belum diisi.]') {
  const rows = String(lines || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  return rows.length ? `<ol>${rows.map(r => `<li>${esc(r)}</li>`).join('')}</ol>` : `<p>${fallback}</p>`;
}

export const KSP_TEMPLATE_GROUPS = [
  ['surat', 'Surat & SK (token)'],
  ['rekap', 'Form & Rekap (data dinamis)'],
  ['induk', 'Dokumen Induk'],
];

export const KSP_TEMPLATE_TOKENS = [
  ['sekolah', 'Nama sekolah', 'Profil Sekolah → Identitas'],
  ['npsn', 'NPSN', 'Profil Sekolah → Identitas'],
  ['nss', 'NSS', 'Profil Sekolah → Identitas'],
  ['akreditasi', 'Akreditasi', 'Profil Sekolah → Identitas'],
  ['alamat', 'Alamat lengkap', 'Profil Sekolah → Identitas'],
  ['city', 'Kota / kabupaten', 'Profil Sekolah → Identitas'],
  ['dinas', 'Nama dinas pendidikan', 'Profil Sekolah → Identitas'],
  ['tahun_ajaran', 'Tahun ajaran aktif', 'Profil Sekolah → Kurikulum'],
  ['tanggal', 'Tanggal surat', 'Tanggal hari ini / tanggal dokumen'],
  ['tanggal_musyawarah', 'Tanggal musyawarah', 'Tanggal SK Tim Pengembang'],
  ['nomor_sk', 'Nomor SK Tim Pengembang', 'Dokumen E-KSP'],
  ['nomor_sk_pbm', 'Nomor SK PBM', 'Dokumen E-KSP'],
  ['nomor_sk_kokurikuler', 'Nomor SK Kokurikuler', 'Dokumen E-KSP'],
  ['kepala', 'Nama kepala sekolah', 'Profil Sekolah → Pimpinan / Persetujuan'],
  ['nip_kepala', 'NIP kepala sekolah', 'Profil Sekolah → Pimpinan / Persetujuan'],
  ['pangkat_kepala', 'Pangkat / golongan kepala', 'Profil Sekolah → Pimpinan'],
  ['ketua_komite', 'Ketua komite', 'Profil Sekolah → Pimpinan / Persetujuan'],
  ['pengawas', 'Nama pengawas', 'Profil Sekolah → Pimpinan / Persetujuan'],
  ['nip_pengawas', 'NIP pengawas', 'Profil Sekolah → Pimpinan / Persetujuan'],
  ['rapor_tahun', 'Tahun asesmen Rapor Pendidikan', 'Profil Sekolah → Rapor Pendidikan'],
  ['rapor_literasi', 'Capaian/skor literasi', 'Impor XLSX → ringkasan aspek'],
  ['rapor_numerasi', 'Capaian/skor numerasi', 'Impor XLSX → ringkasan aspek'],
  ['rapor_karakter', 'Skor karakter', 'Impor XLSX → ringkasan aspek'],
  ['rapor_level_literasi', 'Level literasi', 'Impor XLSX → ringkasan aspek'],
  ['rapor_level_numerasi', 'Level numerasi', 'Impor XLSX → ringkasan aspek'],
  ['rapor_level_karakter', 'Level karakter', 'Impor XLSX → ringkasan aspek'],
  ['rapor_catatan', 'Catatan temuan kuning/merah', 'Impor XLSX → temuan perhatian'],
  ['rapor_akar_masalah', 'Akar masalah berulang', 'Impor XLSX → rekomendasi prioritas'],
  ['rapor_prioritas', 'Daftar prioritas Kemendikdasmen', 'Impor XLSX → rekomendasi prioritas'],
  ['rapor_jumlah_prioritas', 'Jumlah rekomendasi prioritas', 'Impor XLSX → rekomendasi prioritas'],
  ['rapor_jumlah_temuan', 'Jumlah indikator kuning/merah', 'Impor XLSX → temuan perhatian'],
  ['rapor_program', 'Narasi program prioritas', 'Rapor Pendidikan → KSP BAB I/BAB IV'],
  ['jumlah_guru', 'Jumlah guru/staf', 'Data guru'],
  ['jumlah_siswa', 'Jumlah siswa aktif', 'Data siswa'],
  ['nilai_verval', 'Nilai verval KSP', 'Checklist 33 indikator'],
];

/** Satu konteks token untuk seluruh template. */
export function buildTemplateContext({
  profile = {}, year = '', team = [], staff = [], students = [], approvals = [],
  docs = [], indicators = [], checkedCount = 0, wizard = {}, date,
  raporReport = null,
} = {}) {
  const p = profile || {};
  const docNumber = kind => dash((docs || []).find(d => d.kind === kind)?.number);
  const docDate = kind => (docs || []).find(d => d.kind === kind)?.date || '';
  const stage = type => (approvals || []).find(a => a.type === type && a.status === 'disetujui') || {};
  const approved = stage('kepala');
  const komite = stage('komite');
  const pengawas = stage('pengawas');
  const tanggal = formatDateId(date || new Date());
  const studentCount = (students || []).filter(s => !s.status || s.status === 'Aktif').length;
  const score = (indicators || []).length
    ? Math.round((Number(checkedCount) / indicators.length) * 100) : 0;
  const rapor = raporReport?.summary ? raporTokensFromReport(raporReport) : {};

  return {
    // Identitas
    sekolah: dash(p.name || p.ws?.name, 'NAMA SEKOLAH'),
    npsn: dash(p.npsn),
    nss: dash(p.nss),
    akreditasi: dash(p.akreditasi),
    alamat: dash(p.alamatLengkap || p.address),
    city: dash(p.city),
    dinas: dash(p.dinas || p.kopLine2 || 'DINAS PENDIDIKAN'),
    contact: dash(p.contact),
    website: dash(p.website),
    tahun_ajaran: dash(year || p.tahun || p.academicYear),
    tahun: String(year || p.tahun || '').slice(0, 4),
    tanggal,
    tanggal_musyawarah: formatDateId(docDate('sk-pengembang')) || tanggal,
    nomor_sk: docNumber('sk-pengembang'),
    nomor_sk_pbm: docNumber('sk-pbm'),
    nomor_sk_kokurikuler: docNumber('sk-kokurikuler'),

    // Pimpinan — nama hasil persetujuan menggantikan nama profil
    kepala: dash(approved.name || p.headmaster, '_________________'),
    nip_kepala: dash(approved.nip || p.headmasterNip, '_________________'),
    pangkat_kepala: dash(p.headmasterRank),
    ketua_komite: dash(komite.name || p.ketuaKomite, '_________________'),
    pengawas: dash(pengawas.name || p.pengawas, '_________________'),
    nip_pengawas: dash(pengawas.nip || p.nipPengawas, '_________________'),

    // Kurikulum & Rapor Pendidikan
    visi: dash(p.visi),
    misi: dash(p.misi),
    tujuan: dash(p.tujuan),
    dimensi: dash(p.dimensi),
    rapor_tahun: rapor.rapor_tahun || dash(p.raporTahun),
    rapor_literasi: rapor.rapor_literasi || dash(p.raporLiterasi),
    rapor_level_literasi: rapor.rapor_level_literasi || dash(p.raporLevelLiterasi),
    rapor_numerasi: rapor.rapor_numerasi || dash(p.raporNumerasi),
    rapor_level_numerasi: rapor.rapor_level_numerasi || dash(p.raporLevelNumerasi),
    rapor_karakter: rapor.rapor_karakter || dash(p.raporKarakter),
    rapor_level_karakter: rapor.rapor_level_karakter || dash(p.raporLevelKarakter),
    rapor_catatan: rapor.rapor_catatan || dash(p.raporCatatan),
    rapor_akar_masalah: rapor.rapor_akar_masalah || '',
    rapor_prioritas: rapor.rapor_prioritas || '',
    rapor_jumlah_prioritas: rapor.rapor_jumlah_prioritas || '0',
    rapor_jumlah_temuan: rapor.rapor_jumlah_temuan || '0',
    rapor_program: rapor.rapor_program || '',

    // Data mentah dipakai blok dinamis dokumen induk.
    raporReport: raporReport || null,

    // Ringkasan data dinamis
    jumlah_guru: (staff || []).length,
    jumlah_siswa: studentCount,
    jumlah_kelas: new Set((students || []).filter(s => !s.status || s.status === 'Aktif').map(s => s.kelas).filter(Boolean)).size,
    jumlah_tim: (team || []).length,
    jumlah_indikator: (indicators || []).length,
    nilai_verval: score,
    wizard_final: (() => {
      const phases = ['f1', 'f2', 'f3', 'f4'];
      if (phases.some(k => wizard?.[k])) {
        return phases.filter(k => wizard[k]?.status === 'final').length;
      }
      return Object.values(wizard || {}).filter(s => s?.status === 'final').length;
    })(),
  };
}

/** Ganti token dengan nilai Already-escaped. Token tanpa data ditandai. */
export function tokenizeTemplate(body, ctx) {
  return String(body || '').replace(/\{\{([a-z0-9_]+)\}\}/gi, (match, key) => {
    if (!(key in ctx)) return `<span class="tpl-missing">${match}</span>`;
    const v = ctx[key];
    return v === '' || v === null || v === undefined
      ? `<span class="tpl-missing">${match}</span>` : esc(v);
  });
}

function studentsByClass(ctx) {
  const map = {};
  for (const s of ctx.students || []) {
    if (s.status && s.status !== 'Aktif') continue;
    const k = String(s.kelas || '').trim();
    if (k) map[k] = (map[k] || 0) + 1;
  }
  return map;
}

function mapelGuru(staff) {
  const m = norm(staff.mapel || staff.jabatan || '');
  if (/pai|agama|akidah/.test(m)) return 'PAI';
  if (/pjok|penjas|olahraga/.test(m)) return 'PJOK';
  return dash(staff.mapel || staff.jabatan);
}

function nilaiFromDoc(docs, name) {
  const d = (docs || []).find(x =>
    x.kind === 'modul' && norm(x.title).includes(norm(name).slice(0, 10)));
  if (!d) return { silabus: '', rpp: '' };
  const text = `${d.catatan || ''}`;
  const nums = text.match(/\d+([.,]\d+)?/g) || [];
  return { silabus: nums[0] || '', rpp: nums[1] || nums[0] || '' };
}

function raporFallback(ctx) {
  const scores = [
    ['Literasi', num(ctx.rapor_literasi), ctx.rapor_level_literasi],
    ['Numerasi', num(ctx.rapor_numerasi), ctx.rapor_level_numerasi],
    ['Karakter', num(ctx.rapor_karakter), ctx.rapor_level_karakter],
  ].filter(x => x[1] !== null);
  if (!scores.length) return '';
  scores.sort((a, b) => a[1] - b[1]);
  const [aspek, nilai, level] = scores[0];
  return `Berdasarkan Rapor Pendidikan Kemdikbud Tahun ${ctx.rapor_tahun || '-'}, aspek ${aspek} menjadi perhatian utama dengan skor ${nilai}${level ? ` (${level})` : ''}. Program prioritas Tahun Ajaran ${ctx.tahun_ajaran} diarahkan pada peningkatan ${aspek.toLowerCase()} melalui pembelajaran berdiferensiasi, asesmen formatif berkelanjutan, dan pendampingan guru. ${ctx.rapor_catatan || ''}`.trim();
}

/** Token turunan laporan hasil impor XLSX (tanpa mengubah berkas asli). */
function raporTokensFromReport(report) {
  const s = report?.summary || {};
  const val = (key, prop = 'skorTeks') => s[key]?.[prop] || '';
  const issues = (report?.issues || []).slice(0, 4)
    .map(i => `${i.name} (${i.skorTeks || i.capaian}${i.level ? `, ${i.level}` : ''})`);
  const roots = (report?.rootCauses || []).slice(0, 5)
    .map(x => `${x.name} (${x.count} prioritas)`);
  const priorities = (report?.priorities || []).map(p =>
    `${p.no}. ${p.indikator} → ${p.akarLevel2}`);
  const program = [
    `Rapor Pendidikan Tahun ${report?.tahun || '-'} menghasilkan ${(report?.priorities || []).length} rekomendasi prioritas.`,
    roots.length ? `Akar masalah yang berulang: ${roots.join('; ')}.` : '',
    `Kegiatan benahi dan padanan ARKAS ditindaklanjuti melalui KSP, RKT, RKJP, dan RKAS Tahun Ajaran berjalan.`,
  ].filter(Boolean).join(' ');

  return {
    rapor_tahun: report?.tahun || '',
    rapor_literasi: val('literasi', 'capaianTeks') || val('literasi'),
    rapor_numerasi: val('numerasi', 'capaianTeks') || val('numerasi'),
    rapor_karakter: val('karakter'),
    rapor_level_literasi: val('literasi', 'level'),
    rapor_level_numerasi: val('numerasi', 'level'),
    rapor_level_karakter: val('karakter', 'level'),
    rapor_catatan: issues.length ? `Perlu perhatian: ${issues.join('; ')}.` : '',
    rapor_akar_masalah: roots.join('; '),
    rapor_prioritas: priorities.join('\n'),
    rapor_jumlah_prioritas: String((report?.priorities || []).length),
    rapor_jumlah_temuan: String((report?.issues || []).length),
    rapor_program: program,
  };
}

export const KSP_TEMPLATES = {
  penetapan: {
    id: 'penetapan',
    name: 'Surat Penetapan KSP',
    group: 'surat',
    kind: 'penetapan',
    source: 'Format surat penetapan KSP',
    summary: 'Penetapan berlakunya KSP untuk tahun ajaran berjalan.',
    tokens: ['sekolah', 'kepala', 'nip_kepala', 'tahun_ajaran', 'city', 'tanggal', 'ketua_komite'],
    corrections: [
      { before: 'NIP kepala pada berkas referensi', after: 'NIP diambil dari Profil Sekolah', note: 'Format NIP diseragamkan antardokumen.' },
      { before: 'Tanggal tetap pada berkas referensi', after: '{{tanggal}}', note: 'Tanggal mengikuti tahun ajaran aktif.' },
    ],
    signers: ['kepala', 'komite'],
    body: c => `
      <p style="text-align:center"><strong>SURAT PENETAPAN KURIKULUM SATUAN PENDIDIKAN (KSP)</strong><br>${esc(c.sekolah)}</p>
      <p>Saya yang bertanda tangan di bawah ini:</p>
      ${kv([
        ['Nama', `{{kepala}}`], ['NIP', `{{nip_kepala}}`],
        ['Jabatan', 'Kepala Sekolah'], ['Unit kerja', `{{sekolah}}`],
      ])}
      <p>Menetapkan dokumen Kurikulum Satuan Pendidikan {{sekolah}} dinyatakan berlaku untuk Tahun Pelajaran {{tahun_ajaran}} setelah melalui proses penyusunan oleh Tim Pengembang Kurikulum, verifikasi pengawas sekolah, dan pertimbangan Komite Sekolah.</p>
      <p>Demikian penetapan ini dibuat untuk dapat digunakan sebagai pedoman penyelenggaraan kurikulum di {{sekolah}}.</p>
      <p>Ditetapkan di {{city}} pada tanggal {{tanggal}}.</p>`,
  },

  pernyataan: {
    id: 'pernyataan',
    name: 'Surat Pernyataan Pengembangan KSP',
    group: 'surat',
    kind: 'pernyataan',
    source: 'Format surat pernyataan pengembangan KSP',
    summary: 'Pernyataan kepala sekolah atas proses pengembangan KSP.',
    tokens: ['kepala', 'nip_kepala', 'sekolah', 'tahun_ajaran', 'pengawas'],
    corrections: [
      { before: 'Cakupan “Dokumen II dan Dokumen III”', after: 'Dokumen I, II, dan III', note: 'Diselaraskan dengan cakupan berita acara.' },
      { before: 'Nama pengawas tidak disebut', after: '{{pengawas}}', note: 'Diambil dari Profil Sekolah / persetujuan.' },
    ],
    signers: ['kepala'],
    body: () => `
      <p style="text-align:center"><strong>SURAT PERNYATAAN PENGEMBANGAN KURIKULUM SATUAN PENDIDIKAN (KSP)</strong></p>
      <p>Saya yang bertanda tangan di bawah ini:</p>
      ${kv([
        ['Nama', '{{kepala}}'], ['NIP', '{{nip_kepala}}'],
        ['Jabatan', 'Kepala Sekolah'], ['Unit kerja', '{{sekolah}}'],
      ])}
      <p>Menyatakan bahwa seluruh proses pengembangan KSP Tahun Pelajaran {{tahun_ajaran}} telah dilakukan sesuai ketentuan, meliputi:</p>
      <ol>
        <li>Menyusun Tim Pengembang Kurikulum sekolah;</li>
        <li>Melakukan analisis regulasi, daya dukung, dan kebutuhan peserta didik;</li>
        <li>Melakukan review dan/atau menyusun draf dokumen KSP melalui workshop;</li>
        <li>Melibatkan narasumber yang relevan;</li>
        <li>Melakukan verifikasi Dokumen I, Dokumen II, dan Dokumen III oleh pengawas sekolah; dan</li>
        <li>Melakukan finalisasi dokumen kurikulum.</li>
      </ol>
      <p>Demikian surat pernyataan ini dibuat dengan sebenar-benarnya dan penuh tanggung jawab.</p>
      <p>Ditetapkan di {{city}} pada tanggal {{tanggal}}.</p>`,
  },

  berita_acara: {
    id: 'berita_acara',
    name: 'Berita Acara Verval KSP',
    group: 'surat',
    kind: 'berita-acara',
    source: 'Format berita acara verval KSP',
    summary: 'Berita acara verifikasi Dokumen I–III oleh pengawas.',
    tokens: ['sekolah', 'kepala', 'nip_kepala', 'pengawas', 'nip_pengawas', 'tahun_ajaran', 'city', 'tanggal'],
    corrections: [
      { before: 'NIP kepala pada berkas referensi', after: '{{nip_kepala}}', note: 'Format NIP diambil dari Profil Sekolah.' },
      { before: 'Nama pengawas pada berkas referensi', after: '{{pengawas}}', note: 'Ejaan diambil dari Profil Sekolah / persetujuan.' },
      { before: 'Cakupan verifikasi tidak konsisten dengan surat pernyataan', after: 'Dokumen I, II, dan III', note: 'Cakupan kini sama pada kedua format.' },
    ],
    signers: ['kepala', 'pengawas'],
    body: () => `
      <p style="text-align:center"><strong>BERITA ACARA VERIFIKASI KURIKULUM SATUAN PENDIDIKAN</strong><br>{{sekolah}}</p>
      <p>Yang bertanda tangan di bawah ini:</p>
      ${kv([
        ['Nama', '{{kepala}}'], ['NIP', '{{nip_kepala}}'],
        ['Jabatan', 'Kepala Sekolah'], ['Keterangan', 'Pihak Pertama'],
      ])}
      ${kv([
        ['Nama', '{{pengawas}}'], ['NIP', '{{nip_pengawas}}'],
        ['Jabatan', 'Pengawas Sekolah'], ['Keterangan', 'Pihak Kedua'],
      ])}
      <p>Pihak Kedua melakukan verifikasi kepada Pihak Pertama atas Dokumen I, Dokumen II, dan Dokumen III Kurikulum Satuan Pendidikan {{sekolah}} Tahun Pelajaran {{tahun_ajaran}}.</p>
      <p>Pihak Kedua menerima berkas/dokumen tersebut untuk dipergunakan sebagai bahan verifikasi kurikulum dan menyampaikan hasilnya sebagai tindak lanjut.</p>
      <p>Demikian berita acara ini dibuat untuk digunakan sebagaimana mestinya.</p>
      <p>Dibuat di {{city}} pada tanggal {{tanggal}}.</p>`,
  },

  rekomendasi: {
    id: 'rekomendasi',
    name: 'Surat Rekomendasi Pengawas',
    group: 'surat',
    kind: 'rekomendasi',
    source: 'Format rekomendasi pengawas',
    summary: 'Rekomendasi pengesahan KSP dari pengawas sekolah.',
    tokens: ['sekolah', 'city', 'dinas', 'tahun_ajaran', 'pengawas', 'nip_pengawas', 'tanggal'],
    corrections: [
      { before: 'Nama, NIP, dan tanggal pengawas kosong', after: '{{pengawas}}, {{nip_pengawas}}, {{tanggal}}', note: 'Identitas diambil dari Profil Sekolah / persetujuan.' },
    ],
    signers: ['pengawas'],
    body: () => `
      <p style="text-align:center"><strong>SURAT REKOMENDASI PENGESAHAN KSP</strong></p>
      <p>Yang bertanda tangan di bawah ini:</p>
      ${kv([
        ['Nama', '{{pengawas}}'], ['NIP', '{{nip_pengawas}}'],
        ['Jabatan', 'Pengawas Sekolah'],
        ['Unit kerja', '{{dinas}}'],
      ])}
      <p>Menyatakan bahwa {{sekolah}} telah melakukan seluruh proses penyusunan dan pengembangan Kurikulum Satuan Pendidikan Tahun Pelajaran {{tahun_ajaran}} sesuai ketentuan yang berlaku.</p>
      <p>Selanjutnya dokumen KSP tersebut direkomendasikan untuk disahkan oleh {{dinas}}.</p>
      <p>Demikian surat rekomendasi ini dibuat untuk digunakan sebagaimana mestinya.</p>
      <p>{{city}}, {{tanggal}}</p>`,
  },

  'sk-pengembang': {
    id: 'sk-pengembang',
    name: 'SK Tim Pengembang KSP',
    group: 'surat',
    kind: 'sk-pengembang',
    source: 'Format SK tim pengembang KSP',
    summary: 'SK pembentukan tim pengembang beserta lampiran susunan tim.',
    tokens: ['nomor_sk', 'sekolah', 'tahun_ajaran', 'city', 'dinas', 'tanggal', 'tanggal_musyawarah', 'kepala'],
    corrections: [
      { before: 'Tanggal musyawarah pada berkas referensi', after: '{{tanggal_musyawarah}} (default: tanggal SK)', note: 'Tanggal mengikuti dokumen tahun berjalan.' },
      { before: 'Daftar regulasi disalin utuh', after: 'Pokok regulasi ringkas', note: 'Daftar lengkap tetap ada pada berkas referensi di Arsip & Referensi.' },
      { before: 'Tanggal SK pada berkas referensi', after: '{{tanggal}}', note: 'Mengikuti tanggal dokumen tahun berjalan.' },
    ],
    signers: ['kepala'],
    body: c => `
      <p style="text-align:center"><strong>KEPUTUSAN KEPALA ${esc(c.sekolah).toUpperCase()}</strong><br>NOMOR : {{nomor_sk}}</p>
      <p style="text-align:center"><strong>TENTANG</strong><br>PEMBENTUKAN TIM PENGEMBANG KURIKULUM SATUAN PENDIDIKAN<br>{{sekolah}}<br>TAHUN AJARAN {{tahun_ajaran}}</p>
      <p><strong>Kepala {{sekolah}}</strong></p>
      <p><strong>Menimbang</strong> : bahwa dalam rangka penyusunan Kurikulum Satuan Pendidikan Tahun Ajaran {{tahun_ajaran}}, perlu membentuk tim pengembang di tingkat sekolah.</p>
      <p><strong>Mengingat</strong> :</p>
      <ol>
        <li>Undang-Undang Nomor 20 Tahun 2003 tentang Sistem Pendidikan Nasional;</li>
        <li>Peraturan Pemerintah Nomor 57 Tahun 2021 tentang Standar Nasional Pendidikan sebagaimana telah diubah dengan Peraturan Pemerintah Nomor 4 Tahun 2022;</li>
        <li>Peraturan Menteri Pendidikan, Kebudayaan, Riset, dan Teknologi Nomor 21 Tahun 2022 tentang Standar Penilaian Pendidikan;</li>
        <li>Keputusan Kepala Badan Standar, Kurikulum, dan Asesmen Pendidikan tentang Capaian Pembelajaran; dan</li>
        <li>Surat Edaran Kepala {{dinas}} tentang Penyelenggaraan Tahun Ajaran {{tahun_ajaran}}.</li>
      </ol>
      <p><strong>Memperhatikan</strong> : hasil musyawarah kepala sekolah, dewan guru, dan Komite Sekolah pada tanggal {{tanggal_musyawarah}}.</p>
      <p style="text-align:center"><strong>MEMUTUSKAN</strong></p>
      <p><strong>Menetapkan</strong> :</p>
      <ol>
        <li>Pembentukan Tim Pengembang Kurikulum {{sekolah}} Tahun Pelajaran {{tahun_ajaran}} sebagaimana lampiran I;</li>
        <li>Tugas pokok dan fungsi tim sebagaimana lampiran II;</li>
        <li>Penyusunan kurikulum berpedoman pada regulasi {{dinas}};</li>
        <li>Petugas melaporkan pelaksanaan tugas secara tertulis setelah selesai;</li>
        <li>Biaya yang timbul dibebankan pada anggaran sekolah yang tersedia; dan</li>
        <li>Keputusan ini mulai berlaku sejak tanggal ditetapkan.</li>
      </ol>
      <p>Ditetapkan di {{city}} pada tanggal {{tanggal}}.</p>
      <h3 style="margin-top:20px">LAMPIRAN I — SUSUNAN TIM PENGEMBANG</h3>
      ${table(['No', 'Nama', 'NIP', 'Peran'], (c.team || []).map((t, i) => [
        i + 1, esc(t.name), esc(dash(t.nip)), esc(dash(t.role)),
      ]))}
      <h3 style="margin-top:16px">LAMPIRAN II — TUGAS TIM</h3>
      <ol>
        <li>Menentukan arah, prinsip, dan cakupan pengembangan kurikulum sekolah;</li>
        <li>Melakukan analisis regulasi, daya dukung, dan kebutuhan peserta didik;</li>
        <li>Menyusun dan menelaah dokumen KSP beserta lampirannya;</li>
        <li>Melaksanakan uji publik dan menyampaikan masukan pengawas; dan</li>
        <li>Menyiapkan finalisasi dokumen untuk ditetapkan oleh kepala sekolah.</li>
      </ol>`,
  },

  'sk-pbm': {
    id: 'sk-pbm',
    name: 'SK Pembagian Tugas Guru',
    group: 'surat',
    kind: 'sk-pbm',
    source: 'Format SK pembagian tugas guru',
    summary: 'SK pembagian tugas guru dan jadwal mengajar tahun berjalan.',
    tokens: ['nomor_sk_pbm', 'sekolah', 'tahun_ajaran', 'city', 'dinas', 'tanggal', 'kepala'],
    corrections: [
      { before: 'Pemetaan PAI/PJOK pada berkas referensi', after: 'Diambil dari field Mata Pelajaran data guru', note: 'Sumber kebenaran adalah SK PBM dan Data Guru.' },
      { before: 'Jumlah siswa per kelas statis', after: 'Dihitung dari Data Siswa aktif', note: 'Wali kelas memakai field Wali Kelas pada data guru.' },
    ],
    signers: ['kepala'],
    body: c => {
      const counts = studentsByClass(c);
      const rows = (c.staff || []).filter(s => dash(s.name) !== '—').map((s, i) => {
        const mapel = mapelGuru(s);
        const isWali = /guru kelas|wali/i.test(norm(s.jabatan));
        const kelas = isWali ? dash(s.waliKelas || s.mapel) : mapel;
        const jumlah = counts[String(kelas).trim()] ?? '';
        return [
          i + 1,
          `${esc(s.name)}${s.nip ? `<br><small>${esc(s.nip)}</small>` : ''}`,
          esc(dash(s.pendidikan || s.jabatan)),
          esc(dash(kelas)),
          jumlah !== '' ? jumlah : '-',
          esc(dash(s.jabatan)),
        ];
      });
      return `
        <p style="text-align:center"><strong>KEPUTUSAN KEPALA ${esc(c.sekolah).toUpperCase()}</strong><br>NOMOR : {{nomor_sk_pbm}}</p>
        <p style="text-align:center"><strong>TENTANG</strong><br>PEMBAGIAN TUGAS GURU DALAM KEGIATAN BELAJAR MENGAJAR<br>TAHUN PELAJARAN {{tahun_ajaran}}</p>
        <p><strong>Menimbang</strong> : bahwa untuk memperlancar proses belajar mengajar di {{sekolah}}, perlu menetapkan pembagian tugas guru.</p>
        <p><strong>Mengingat</strong> : peraturan perundang-undangan tentang Standar Nasional Pendidikan dan Surat Edaran Kepala {{dinas}} tentang Penyelenggaraan Tahun Ajaran {{tahun_ajaran}}.</p>
        <p><strong>Menetapkan</strong> :</p>
        <ol>
          <li>Pembagian tugas guru sebagaimana lampiran Keputusan ini;</li>
          <li>Setiap guru wajib melaksanakan tugas dan melaporkan hasilnya secara tertulis kepada Kepala Sekolah;</li>
          <li>Segala biaya yang timbul dibebankan pada anggaran yang sesuai; dan</li>
          <li>Keputusan ini berlaku sejak tanggal ditetapkan.</li>
        </ol>
        <p>Ditetapkan di {{city}} pada tanggal {{tanggal}}.</p>
        <h3 style="margin-top:20px">LAMPIRAN — PEMBAGIAN TUGAS GURU<br>TAHUN PELAJARAN {{tahun_ajaran}}</h3>
        ${table(['No', 'Nama / NIP', 'Pendidikan', 'Kelas / Mapel', 'Jml Siswa', 'Jabatan'], rows)}
        <p class="muted">Jumlah guru: ${c.jumlah_guru} orang. Data diambil dari menu Profil Sekolah → Data Guru.</p>`;
    },
  },

  'sk-kokurikuler': {
    id: 'sk-kokurikuler',
    name: 'SK Tim Kerja Kokurikuler',
    group: 'surat',
    kind: 'sk-kokurikuler',
    source: 'Format SK tim kerja kokurikuler',
    summary: 'SK pembentukan tim kerja kokurikuler beserta rincian tugas.',
    tokens: ['nomor_sk_kokurikuler', 'sekolah', 'tahun_ajaran', 'city', 'tanggal', 'ketua_komite'],
    corrections: [
      { before: 'Tahun ajaran pada lampiran berbeda dengan induk', after: '{{tahun_ajaran}}', note: 'Dokumen induk dan lampiran kini memakai tahun ajaran yang sama.' },
      { before: 'Tahun ajaran pada bagian Menimbang berbeda', after: '{{tahun_ajaran}}', note: 'Inkonsistensi lain pada berkas referensi.' },
    ],
    signers: ['kepala'],
    body: c => {
      const rows = [
        ...(c.team || []).map((t, i) => [
          i + 1, esc(t.name), esc(dash(t.role || 'Anggota Tim')),
        ]),
        [ (c.team || []).length + 1, '{{ketua_komite}}', 'Mitra Kerja' ],
      ];
      return `
        <p style="text-align:center"><strong>KEPUTUSAN KEPALA ${esc(c.sekolah).toUpperCase()}</strong><br>NOMOR : {{nomor_sk_kokurikuler}}</p>
        <p style="text-align:center"><strong>TENTANG</strong><br>PEMBENTUKAN TIM KERJA KOKURIKULER<br>TAHUN PELAJARAN {{tahun_ajaran}}</p>
        <p><strong>Menimbang</strong> : bahwa demi kelancaran pelaksanaan pembelajaran kokurikuler di {{sekolah}}, perlu membentuk Tim Kerja Kokurikuler Tahun Pelajaran {{tahun_ajaran}}.</p>
        <p><strong>Mengingat</strong> : peraturan perundang-undangan tentang Standar Isi, Standar Proses, dan Capaian Pembelajaran pada Kurikulum Merdeka.</p>
        <p><strong>Menetapkan</strong> :</p>
        <ol>
          <li>Membentuk Tim Kerja Kokurikuler {{sekolah}} Tahun Pelajaran {{tahun_ajaran}};</li>
          <li>Susunan tim sebagaimana lampiran I;</li>
          <li>Rincian tugas tim sebagaimana lampiran II; dan</li>
          <li>Biaya yang timbul dibebankan pada anggaran sekolah dan sumber lain yang sah.</li>
        </ol>
        <p>Ditetapkan di {{city}} pada tanggal {{tanggal}}.</p>
        <h3 style="margin-top:20px">LAMPIRAN I — SUSUNAN TIM KERJA KOKURIKULER<br>TAHUN PELAJARAN {{tahun_ajaran}}</h3>
        ${table(['No', 'Nama', 'Tugas dalam Tim'], rows)}
        <h3 style="margin-top:16px">LAMPIRAN II — RINCIAN TUGAS</h3>
        <ol>
          <li><strong>Penanggung jawab:</strong> memimpin penyusunan regulasi, menentukan koordinator, dan memimpin analisis kebutuhan dimensi profil pelajar;</li>
          <li><strong>Koordinator:</strong> mengelola pelaksanaan kegiatan, mengundang narasumber, dan memastikan kolaborasi antarguru;</li>
          <li><strong>Fasilitator:</strong> menyusun dan melaksanakan kegiatan serta melakukan asesmen kokurikuler;</li>
          <li><strong>Sarana prasarana:</strong> menyiapkan sarana pendukung kegiatan; dan</li>
          <li><strong>Mitra kerja:</strong> ikut menjaga ekosistem kondusif di lingkungan sekolah.</li>
        </ol>`;
    },
  },

  'verval-ksp': {
    id: 'verval-ksp',
    name: 'Instrumen Verval KSP (33 Indikator)',
    group: 'rekap',
    kind: 'verval',
    source: 'Format lembar verval KSP',
    summary: 'Lembar pemeriksaan indikator dengan status dari checklist E-KSP.',
    tokens: ['sekolah', 'tahun_ajaran', 'nilai_verval', 'jumlah_indikator', 'pengawas', 'nip_pengawas'],
    corrections: [
      { before: 'Baris hasil ekstraksi berulang', after: 'Indikator resmi E-KSP', note: 'Baris kosong hasil ekstraksi diabaikan.' },
      { before: 'Cakupan kelas pada berkas referensi', after: 'Mengikuti Data Siswa aktif', note: 'Lembar pengesahan memakai kelas yang benar-benar ada.' },
    ],
    signers: ['pengawas', 'kepala'],
    body: c => {
      const groups = [];
      for (const ind of c.indicators || []) {
        let g = groups.find(x => x.name === ind.group);
        if (!g) { g = { name: ind.group, rows: [] }; groups.push(g); }
        g.rows.push(ind);
      }
      const rows = groups.flatMap(g => [
        [`<strong>${esc(g.name)}</strong>`, '', ''],
        ...g.rows.map(i => [i.code, esc(i.label), c.checkedCodes?.has(i.id) ? 'Ada' : 'Belum']),
      ]);
      return `
        <p style="text-align:center"><strong>INSTRUMEN VERIFIKASI KURIKULUM SATUAN PENDIDIKAN</strong><br>{{sekolah}} — {{tahun_ajaran}}</p>
        ${kv([
          ['Jumlah indikator', '{{jumlah_indikator}}'],
          ['Nilai verval', '{{nilai_verval}}'],
          ['Pengawas', '{{pengawas}}'],
        ])}
        ${table(['No', 'Komponen yang dinilai', 'Status'], rows)}
        <p class="muted">Status diambil otomatis dari checklist menu Verval KSP. Penilaian akhir tetap menjadi kewenangan pengawas sekolah.</p>`;
    },
  },

  'modul-ajar': {
    id: 'modul-ajar',
    name: 'Form Telaah RPP & Observasi Pembelajaran',
    group: 'rekap',
    kind: 'modul',
    source: 'Format instrumen observasi pembelajaran',
    summary: 'Form rekap umpan balik RPP dan observasi pembelajaran per guru.',
    tokens: ['sekolah', 'tahun_ajaran', 'jumlah_guru', 'pengawas'],
    corrections: [
      { before: 'Beberapa sheet instrumen terpisah', after: 'Satu form rekap per guru', note: 'Sheet duplikat digabung agar mudah dicetak.' },
    ],
    signers: ['pengawas', 'kepala'],
    body: c => {
      const rows = (c.staff || []).filter(s => dash(s.name) !== '—').map((s, i) => [
        i + 1,
        esc(s.name),
        esc(mapelGuru(s)),
        '[Diisi saat telaah]',
        '[Diisi saat observasi]',
        '[Tindak lanjut]',
      ]);
      return `
        <p style="text-align:center"><strong>FORM TELAAH RPP DAN OBSERVASI PEMBELAJARAN</strong><br>{{sekolah}} — {{tahun_ajaran}}</p>
        <p>Jumlah guru/staf: ${c.jumlah_guru} orang. Isi kolom penilaian berdasarkan instrumen umpan balik dan observasi yang dilakukan pengawas.</p>
        ${table(['No', 'Nama Guru', 'Mapel / Wali', 'Umpan Balik RPP', 'Observasi', 'Tindak Lanjut'], rows)}`;
    },
  },

  'rekap-verval': {
    id: 'rekap-verval',
    name: 'Rekapitulasi Verval ATP & Modul Ajar',
    group: 'rekap',
    kind: 'rekap',
    source: 'Format rekap verval ATP dan modul ajar',
    summary: 'Rekap nilai ATP/Modul per guru dihitung dari data guru dan dokumen.',
    tokens: ['sekolah', 'tahun_ajaran', 'pengawas', 'nip_pengawas', 'kepala', 'nip_kepala'],
    corrections: [
      { before: 'Pemetaan PAI/PJOK pada berkas referensi', after: 'Pemetaan sesuai SK PBM dan Data Guru', note: 'Sumber kebenaran: SK PBM dan field Mata Pelajaran data guru.' },
      { before: 'Nomor urut ganda', after: 'Nomor urut otomatis', note: 'Baris ganda diberi nomor berurutan.' },
      { before: 'Baris kosong bernilai 100', after: 'Baris tanpa nama diabaikan', note: 'Baris tanpa nama tidak ikut direkap.' },
    ],
    signers: ['pengawas', 'kepala'],
    body: c => {
      const seen = new Set();
      const rows = [];
      for (const s of c.staff || []) {
        const name = String(s.name || '').trim();
        if (!name || seen.has(norm(name))) continue;
        seen.add(norm(name));
        const n = nilaiFromDoc(c.docs, name);
        const avg = average([n.silabus, n.rpp]);
        rows.push([
          rows.length + 1,
          esc(name),
          esc(mapelGuru(s)),
          esc(dash(n.silabus)),
          esc(dash(n.rpp)),
          avg === null ? '—' : avg,
          avg === null ? 'Belum dinilai' : avg >= 91 ? 'Amat Baik' : avg >= 76 ? 'Baik' : avg >= 61 ? 'Cukup' : 'Perlu Perbaikan',
        ]);
      }
      return `
        <p style="text-align:center"><strong>REKAPITULASI HASIL VERIFIKASI ATP DAN MODUL AJAR</strong><br>{{sekolah}}<br>TAHUN {{tahun_ajaran}}</p>
        ${table(['No', 'Nama Guru', 'Mata Pelajaran', 'ATP', 'Modul', 'Rata-rata', 'Kelayakan'], rows)}
        <p class="muted">Baris tanpa nama guru tidak dihitung. Nilai diambil dari catatan hasil telaah pada dokumen E-KSP.</p>
        <p>{{city}}, {{tanggal}}</p>`;
    },
  },

  ksp: {
    id: 'ksp',
    name: 'Dokumen KSP Lengkap (BAB I–VI + Lampiran)',
    group: 'induk',
    kind: 'ksp',
    source: 'Format dokumen induk KSP',
    summary: 'Dokumen induk yang disusun ulang dari data Profil Sekolah, catatan fase, dan lampiran.',
    tokens: ['sekolah', 'npsn', 'nss', 'akreditasi', 'tahun_ajaran', 'visi', 'misi', 'tujuan', 'rapor_tahun', 'rapor_literasi', 'rapor_numerasi', 'rapor_karakter'],
    corrections: [
      { before: 'Lembar pengesahan hanya memuat sebagian kelas', after: 'Lembar pengesahan memakai data kelas aktif', note: 'Semua kelas aktif tetap tercantum.' },
      { before: 'Rapor Pendidikan hanya berupa beberapa angka', after: 'Impor XLSX → indikator, temuan kuning/merah, akar masalah, prioritas, RKJP/ARKAS', note: 'BAB I, BAB IV, dan lampiran memakai laporan PBD terstruktur.' },
      { before: 'Visi/misi/alamat dapat berubah tiap tahun', after: 'Semua dibaca dari Profil Sekolah', note: 'Tidak ada lagi teks identitas yang disalin statis.' },
    ],
    signers: [],
    body: () => '',
  },
};

/** Body template: override pengguna bila ada, jika tidak render dari data. */
export function getTemplateBody(id, ctx, { fresh = false, overrides = {} } = {}) {
  const def = KSP_TEMPLATES[id];
  if (!def) return '';
  if (!fresh && overrides[id]?.body) return overrides[id].body;
  return def.body(ctx);
}

/** Tanda tangan sesuai jenis template. */
export function templateSigners(id, ctx) {
  const def = KSP_TEMPLATES[id];
  const p = ctx.profile || {};
  const make = type => {
    if (type === 'kepala') return {
      role: `Kepala ${ctx.sekolah}`,
      name: ctx.kepala, nip: ctx.nip_kepala,
      image: p.signatureDataUrl || '', stamp: p.stampDataUrl || '',
    };
    if (type === 'komite') return {
      role: 'Ketua Komite Sekolah', name: ctx.ketua_komite, nip: '',
    };
    return {
      role: 'Pengawas Sekolah', name: ctx.pengawas, nip: ctx.nip_pengawas,
      image: p.pengawasSignature || '',
    };
  };
  return (def?.signers || []).map(make);
}

/** Hasil akhir siap dicetak/unduh. */
export function renderKspTemplate(id, ctx) {
  const def = KSP_TEMPLATES[id];
  if (!def) return '';
  if (id === 'ksp') {
    return buildKspDocumentHtml({
      year: ctx.tahun_ajaran,
      workspace: ctx.profile || {},
      profile: ctx.profile || {},
      studentsByClass: studentsByClass(ctx),
      team: ctx.team || [],
      docs: ctx.docs || [],
      wizard: ctx.wizard || {},
      indicators: ctx.indicators || [],
      checkedCount: ctx.checkedCount || 0,
      penetapanHtml: ctx.penetapanHtml || '',
      raporReport: ctx.raporReport || null,
      rapor: {
        tahun: ctx.rapor_tahun,
        literasi: ctx.rapor_literasi, levelLiterasi: ctx.rapor_level_literasi,
        numerasi: ctx.rapor_numerasi, levelNumerasi: ctx.rapor_level_numerasi,
        karakter: ctx.rapor_karakter, levelKarakter: ctx.rapor_level_karakter,
        catatan: ctx.rapor_catatan,
        program: raporFallback(ctx),
      },
    });
  }
  return buildKspPrintHtml({
    workspace: ctx.profile || {},
    title: def.name,
    subject: def.summary,
    date: ctx.tanggal,
    body: tokenizeTemplate(ctx.renderedBody ?? def.body(ctx), ctx),
    signers: templateSigners(id, ctx),
  });
}
