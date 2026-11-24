// Builder draf dokumen KSP lengkap dari data terstruktur E-KSP.
// Output berupa HTML siap cetak ke PDF lewat printHtml() di lib-print.js.

function e(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

function items(text, fallback = '[Belum diisi pada wizard penyusunan.]') {
  const rows = String(text || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  if (!rows.length) return `<p class="placeholder">${fallback}</p>`;
  return `<ol>${rows.map(r => `<li>${e(r)}</li>`).join('')}</ol>`;
}

function paragraph(text, fallback = '[Belum diisi pada wizard penyusunan.]') {
  const s = String(text || '').trim();
  return s ? `<p>${e(s)}</p>` : `<p class="placeholder">${fallback}</p>`;
}

function docList(docs, kinds, empty = '[Belum ada dokumen pada kategori ini.]') {
  const list = docs.filter(d => kinds.includes(d.kind));
  if (!list.length) return `<p class="placeholder">${empty}</p>`;
  return `<table class="data"><thead><tr><th>No</th><th>Judul</th><th>Nomor</th><th>Status</th></tr></thead><tbody>
    ${list.map((d, i) => `<tr>
      <td>${i + 1}</td>
      <td>${e(d.title)}${d.kelas ? `<br><small>${e(d.kelas)}</small>` : ''}</td>
      <td>${e(d.number || '-')}</td>
      <td>${e(d.status || '-')}</td>
    </tr>`).join('')}
  </tbody></table>`;
}

function docCatatan(docs, predicate, label) {
  const d = docs.find(predicate);
  if (!d) return `<p class="placeholder">[Belum ada ${e(label)}.]</p>`;
  return `<p><strong>${e(d.title)}</strong></p>${paragraph(d.catatan, '[Belum ada catatan telaah.]')}`;
}

/* ------------------------------------------------------------------ */
/* Rapor Pendidikan Kemdikbud — identifikasi, refleksi, dan perencanaan */
/* ------------------------------------------------------------------ */

const RAPOR_SUMMARY_ROWS = [
  ['Hasil Belajar — Literasi', 'literasi'],
  ['Nilai Rerata Literasi', 'literasiSkor'],
  ['Hasil Belajar — Numerasi', 'numerasi'],
  ['Nilai Rerata Numerasi', 'numerasiSkor'],
  ['Hasil Belajar — Karakter', 'karakter'],
  ['Kualitas Pembelajaran', 'kualitasPembelajaran'],
  ['Refleksi & Perbaikan Guru', 'refleksiGuru'],
  ['Kepemimpinan Instruksional', 'kepemimpinan'],
  ['Iklim Keamanan Satuan Pendidikan', 'iklimKeamanan'],
  ['Iklim Kesetaraan Gender', 'kesetaraanGender'],
  ['Iklim Kebinekaan', 'kebinekaan'],
  ['Tujuh Kebiasaan Anak Indonesia Hebat', 'kebiasaan'],
  ['Partisipasi Warga Satuan Pendidikan', 'partisipasi'],
  ['Pemanfaatan Sumber Daya Sekolah', 'sumberDaya'],
  ['Pemanfaatan TIK untuk Anggaran', 'tikAnggaran'],
  ['Program & Kebijakan Satuan Pendidikan', 'programKebijakan'],
  ['Fasilitas Satuan Pendidikan', 'fasilitas'],
  ['Kesesuaian Rombongan Belajar', 'rombel'],
  ['Pengalaman Pelatihan PTK', 'pelatihanPTK'],
  ['Kompetensi Pendidik & PTK', 'kompetensiPTK'],
  ['Ketersediaan Buku Pendidikan', 'ketersediaanBuku'],
];

function clip(text, max = 220) {
  const s = String(text ?? '').replace(/\s+/g, ' ').trim();
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

function raporValue(item) {
  if (!item) return '';
  return [item.capaianTeks, item.skorTeks].filter(Boolean).join(' — ');
}

function raporSummaryTable(report, rapor) {
  const rows = report?.summary
    ? RAPOR_SUMMARY_ROWS
      .filter(([, key]) => report.summary[key])
      .map(([label, key]) => {
        const item = report.summary[key];
        return `<tr>
          <td>${e(label)}</td>
          <td>${e(raporValue(item) || '-')}</td>
          <td>${e(item.level || '-')}</td>
          <td>${e(item.perubahan || '-')}</td>
          <td>${e(item.peringkatKab || '-')}</td>
        </tr>`;
      })
    : [
        ['Tahun asesmen', rapor.tahun],
        ['Literasi', [rapor.literasi, rapor.levelLiterasi].filter(Boolean).join(' — ')],
        ['Numerasi', [rapor.numerasi, rapor.levelNumerasi].filter(Boolean).join(' — ')],
        ['Karakter', [rapor.karakter, rapor.levelKarakter].filter(Boolean).join(' — ')],
        ['Catatan', rapor.catatan],
      ].filter(([, value]) => String(value ?? '').trim())
        .map(([label, value]) => `<tr><td>${e(label)}</td><td colspan="4">${e(value)}</td></tr>`);

  rows.push(`<tr>
    <td>Tracer Study / Capaian Khusus</td>
    <td colspan="4">Tidak tersedia pada berkas Rapor Pendidikan yang diimpor (jenjang SD).</td>
  </tr>`);
  if (!rows.length) return '<p class="placeholder">[Isi Rapor Pendidikan Kemdikbud pada menu Profil Sekolah.]</p>';
  return `<table class="data rapor-table">
    <thead><tr><th>Aspek</th><th>Capaian / Skor</th><th>Level</th><th>Perubahan</th><th>Peringkat Kab/Kota</th></tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table>`;
}

function raporIssuesTable(report) {
  const rows = (report?.issues || []).map(i => `<tr>
    <td>${e(i.code)}</td>
    <td>${e(i.name)}</td>
    <td>${e(i.capaian || '-')}</td>
    <td>${e(i.skorTeks || '-')}</td>
    <td>${e(i.level || '-')}</td>
    <td>${e(i.perubahan || '-')}</td>
  </tr>`);
  if (!rows.length) return '<p class="placeholder">[Belum ada laporan Rapor Pendidikan yang diimpor.]</p>';
  return `<table class="data rapor-table">
    <thead><tr><th>Kode</th><th>Indikator</th><th>Capaian</th><th>Skor</th><th>Status</th><th>Perubahan</th></tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table>`;
}

function raporRootCauses(report) {
  const rows = (report?.rootCauses || []).map(x =>
    `<li><strong>${e(x.name)}</strong> — muncul pada ${e(x.count)} prioritas.</li>`);
  return rows.length ? `<ol>${rows.join('')}</ol>`
    : '<p class="placeholder">[Akar masalah belum tersedia.]</p>';
}

function raporNarasi(report) {
  const s = report?.summary || {};
  const val = (key, prop = 'skorTeks') => s[key]?.[prop] || '-';
  const issues = (report?.issues || []).slice(0, 3)
    .map(i => `${i.name} (${i.skorTeks || i.capaian}, ${i.level || '-'})`);
  const roots = (report?.rootCauses || []).slice(0, 2).map(x => x.name);
  return [
    `Berdasarkan Rapor Pendidikan Kemdikbud Tahun ${e(report?.tahun || '-')},`,
    `capaian literasi ${e(val('literasi', 'capaianTeks'))} dengan rerata ${e(val('literasi'))},`,
    `numerasi ${e(val('numerasi', 'capaianTeks'))} dengan rerata ${e(val('numerasi'))},`,
    `serta karakter ${e(val('karakter'))}.`,
    issues.length ? `Indikator yang perlu menjadi perhatian antara lain ${e(issues.join('; '))}.` : '',
    roots.length ? `Akar masalah yang berulang adalah ${e(roots.join(' dan '))}.` : '',
  ].filter(Boolean).join(' ');
}

function raporProgramTable(report) {
  const rows = (report?.priorities || []).map(p => `<tr>
    <td>${e(p.no)}</td>
    <td>${e(clip(p.indikator, 120))}</td>
    <td>${e(clip(p.akarLevel2, 140))}</td>
    <td>${e(clip(p.benahi, 200))}</td>
    <td>${e(clip(p.arkas, 160))}</td>
  </tr>`);
  return `<table class="data rapor-table">
    <thead><tr><th>No</th><th>Indikator Prioritas</th><th>Akar Masalah</th><th>Kegiatan Benahi</th><th>Padanan ARKAS</th></tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table>`;
}

function rkjpTable(report) {
  const rows = (report?.priorities || []).map(p => `<tr>
    <td>${e(p.no)}</td>
    <td>${e(clip(p.indikator, 120))}</td>
    <td>${e(clip(p.akarLevel2, 140))}</td>
    <td>${e(clip(p.benahi, 240))}</td>
    <td>${e(clip(p.inspirasi, 240))}</td>
    <td>${p.arkas ? 'Ya' : 'Perlu kajian'}</td>
  </tr>`);
  if (!rows.length) return '<p class="placeholder">[Belum ada rekomendasi prioritas.]</p>';
  return `<table class="data rapor-table">
    <thead><tr><th>No</th><th>Indikator Prioritas</th><th>Akar Masalah</th><th>Kegiatan Benahi</th><th>Penjelasan Implementasi</th><th>Butuh Biaya</th></tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table>`;
}

function arkasTable(report) {
  const rows = (report?.priorities || []).filter(p => p.arkas).map((p, i) => `<tr>
    <td>${i + 1}</td>
    <td>${e(clip(p.benahi, 200))}</td>
    <td>${e(clip(p.arkas, 260))}</td>
    <td>[Diisi di RKAS]</td><td>[Diisi di RKAS]</td>
    <td>[Diisi di RKAS]</td><td>[Diisi di RKAS]</td><td>[Diisi di RKAS]</td>
  </tr>`);
  if (!rows.length) return '<p class="placeholder">[Belum ada padanan kegiatan ARKAS.]</p>';
  return `<table class="data rapor-table">
    <thead><tr><th>No</th><th>Kegiatan Benahi</th><th>Kegiatan ARKAS</th><th>Bulan</th><th>Jumlah</th><th>Satuan</th><th>Harga Satuan</th><th>Total</th></tr></thead>
    <tbody>${rows.join('')}</tbody>
  </table>`;
}

function subjectRows(docs = []) {
  const notes = docs
    .filter(d => d.kind === 'struktur' || /struktur kurikulum/i.test(String(d.title || '')))
    .map(d => String(d.catatan || ''))
    .join('\n');
  const seen = new Set();
  const subjects = notes.split(/\r?\n/)
    .map(s => s.replace(/^[\s\-•]*(\d+|[a-z]|[ivx]+)[\s.)-]+/i, '').split(':')[0].trim())
    .filter(s => s.length > 2 && !/^(struktur|kurikulum|daftar mapel)$/i.test(s))
    .filter(s => {
      const key = s.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  if (!subjects.length) {
    return '<tr><td colspan="4">[Belum ada daftar mata pelajaran pada dokumen struktur kurikulum.]</td></tr>';
  }
  return subjects.map((m, i) => `
    <tr><td>${i + 1}</td><td>${e(m)}</td><td>[Sesuai data sekolah]</td><td>[Diisi sesuai struktur]</td></tr>`).join('');
}

export function buildKspDocumentHtml({
  year, workspace = {}, profile = {}, studentsByClass = {},
  team = [], docs = [], wizard = {}, indicators = [],
  checkedCount = 0, penetapanHtml = '', rapor = {}, raporReport = null,
}) {
  const ws = workspace;
  const p = profile;
  const score = indicators.length ? Math.round((checkedCount / indicators.length) * 100) : 0;
  const kelas = Object.keys(studentsByClass).sort();
  const totalSiswa = kelas.reduce((n, k) => n + Number(studentsByClass[k] || 0), 0);
  const phases = ['f1', 'f2', 'f3', 'f4'];
  const finalSteps = phases.filter(k => wizard[k]?.status === 'final').length;
  const stepNote = (...keys) => keys.map(k => wizard[k]?.note).find(Boolean) || '';

  const hasRaporReport = Boolean(raporReport?.summary || raporReport?.priorities?.length);
  const lampiranCount = hasRaporReport ? 10 : 8;

  const cover = `
    <section class="page cover">
      ${ws.logoDataUrl ? `<img class="logo" src="${ws.logoDataUrl}" alt="Logo">` : ''}
      <div class="cover-kop">${e(ws.kopLine1 || 'PEMERINTAH DAERAH')}</div>
      <div class="cover-kop">${e(ws.kopLine2 || 'DINAS PENDIDIKAN')}</div>
      <h1>KURIKULUM SATUAN PENDIDIKAN</h1>
      <h2>(KSP)</h2>
      <h2>${e(ws.name || 'NAMA SEKOLAH')}</h2>
      <h3>TAHUN AJARAN ${e(year)}</h3>
      <p class="cover-address">${e(p.alamatLengkap || ws.address || '-')}</p>
      <p class="cover-year">${e(String(year).slice(0, 4) || new Date().getFullYear())}</p>
      ${finalSteps < phases.length ? '<p class="draft">DRAF — fase penyusunan belum lengkap</p>' : ''}
    </section>`;

  const identitas = `
    <section class="page">
      <h2 class="judul">HALAMAN IDENTITAS</h2>
      <table class="identity">
        <tr><td>Nama Sekolah</td><td>: ${e(ws.name || '-')}</td></tr>
        <tr><td>NPSN</td><td>: ${e(ws.npsn || '-')}</td></tr>
        <tr><td>NSS</td><td>: ${e(p.nss || '-')}</td></tr>
        <tr><td>Status Sekolah</td><td>: ${e(p.statusSekolah || p.status || '-')}</td></tr>
        <tr><td>Status Akreditasi</td><td>: ${e(p.akreditasi || '-')}</td></tr>
        <tr><td>Alamat</td><td>: ${e(p.alamatLengkap || ws.address || '-')}</td></tr>
        <tr><td>Kepala Sekolah</td><td>: ${e(ws.headmaster || '-')}</td></tr>
        <tr><td>NIP Kepala Sekolah</td><td>: ${e(ws.headmasterNip || '-')}</td></tr>
        <tr><td>Ketua Komite</td><td>: ${e(p.ketuaKomite || '-')}</td></tr>
        <tr><td>Pengawas Sekolah</td><td>: ${e(p.pengawas || '-')}</td></tr>
        <tr><td>Website / Link</td><td>: ${e(p.website || '-')}</td></tr>
      </table>
    </section>`;

  const penetapan = `
    <section class="page">
      <h2 class="judul">HALAMAN PENETAPAN</h2>
      ${penetapanHtml || '<p class="placeholder">[Isi surat penetapan dibuat dari template pada menu Dokumen & Surat.]</p>'}
    </section>`;

  const pengesahan = `
    <section class="page">
      <h2 class="judul">HALAMAN PENGESAHAN</h2>
      <p>Dokumen Kurikulum Satuan Pendidikan ${e(ws.name || 'Sekolah')} Tahun Ajaran ${e(year)} telah disusun dan ditetapkan untuk digunakan.</p>
      <table class="sign">
        <tr>
          <td>Kepala ${e(ws.name || 'Sekolah')}<br><br><br><strong>${e(ws.headmaster || '_________________')}</strong><br>NIP. ${e(ws.headmasterNip || '-')}</td>
          <td>Ketua Komite Sekolah<br><br><br><strong>${e(p.ketuaKomite || '_________________')}</strong></td>
          <td>Pengawas Sekolah<br><br><br><strong>${e(p.pengawas || '_________________')}</strong><br>NIP. ${e(p.nipPengawas || '-')}</td>
        </tr>
      </table>
    </section>`;

  const validasi = `
    <section class="page">
      <h2 class="judul">LEMBAR VALIDASI</h2>
      <table class="data">
        <tr><th>Jumlah indikator</th><td>${indicators.length}</td></tr>
        <tr><th>Indikator tercentang</th><td>${checkedCount}</td></tr>
        <tr><th>Nilai</th><td>${score}</td></tr>
        <tr><th>Kriteria</th><td>${score >= 91 ? 'Amat Baik' : score >= 76 ? 'Baik' : score >= 61 ? 'Cukup' : 'Perlu Perbaikan'}</td></tr>
      </table>
      <p class="placeholder">[Lembar validasi pengawas asli dapat dilampirkan terpisah dari menu Dokumen & Surat.]</p>
    </section>`;

  const pengantar = `
    <section class="page">
      <h2 class="judul">KATA PENGANTAR</h2>
      ${paragraph(stepNote('f1', 2, 1), 'Kata pengantar dapat diisi pada fase Konteks & Rapor.')}
      <p>Dokumen Kurikulum Satuan Pendidikan ini disusun sebagai acuan penyelenggaraan pembelajaran di ${e(ws.name || 'Sekolah')} Tahun Ajaran ${e(year)}.</p>
    </section>`;

  const daftarIsi = `
    <section class="page">
      <h2 class="judul">DAFTAR ISI</h2>
      <ol class="toc">
        <li><a href="#bab1">BAB I PENDAHULUAN</a></li>
        <li><a href="#bab2">BAB II TUJUAN PENDIDIKAN, VISI, MISI, DAN TUJUAN SEKOLAH</a></li>
        <li><a href="#bab3">BAB III PENGORGANISASIAN PEMBELAJARAN</a></li>
        <li><a href="#bab4">BAB IV PERENCANAAN PEMBELAJARAN</a></li>
        <li><a href="#bab5">BAB V PENDAMPINGAN, EVALUASI, DAN PENGEMBANGAN PROFESIONAL</a></li>
        <li><a href="#bab6">BAB VI PENUTUP</a></li>
        <li>DAFTAR PUSTAKA</li>
        <li>LAMPIRAN 1 – ${lampiranCount}</li>
      </ol>
    </section>`;

  const bab1 = `
    <section class="page" id="bab1">
      <h2 class="bab">BAB I PENDAHULUAN</h2>
      <h3>A. Latar Belakang</h3>
      ${paragraph(stepNote('f1', 2), '[Isi latar belakang penyusunan KSP pada fase Konteks & Rapor.]')}
      <h3>B. Karakteristik Satuan Pendidikan</h3>
      <p>${e(ws.name || 'Sekolah')} berstatus ${e(p.akreditasi || '-')} dengan jumlah peserta didik ${totalSiswa} orang yang tersebar pada kelas ${kelas.map(e).join(', ') || '-'}.</p>
      <table class="data">
        <thead><tr><th>Kelas</th><th>Jumlah Siswa</th></tr></thead>
        <tbody>${kelas.length ? kelas.map(k => `<tr><td>${e(k)}</td><td>${Number(studentsByClass[k] || 0)}</td></tr>`).join('') : '<tr><td colspan="2">[Belum ada data siswa.]</td></tr>'}</tbody>
      </table>
      <h3>C. Analisis Konteks (SWOT)</h3>
      ${paragraph(stepNote('f1', 2), '[Tuliskan analisis kekuatan, kelemahan, peluang, dan ancaman pada fase Konteks & Rapor.]')}
      <h3>D. Hasil Rapor Pendidikan Kemdikbud</h3>
      ${raporReport?.summary ? `<p>${raporNarasi(raporReport)}</p>` : ''}
      <h4>D.1. Ringkasan Indikator</h4>
      ${raporSummaryTable(raporReport, rapor)}
      <h4>D.2. Temuan Kuning dan Merah</h4>
      ${raporIssuesTable(raporReport)}
      <h4>D.3. Refleksi Akar Masalah</h4>
      ${raporRootCauses(raporReport)}
      ${rapor.catatan ? `<p><strong>Catatan Profil Sekolah:</strong> ${e(rapor.catatan)}</p>` : ''}
    </section>`;

  const bab2 = `
    <section class="page" id="bab2">
      <h2 class="bab">BAB II TUJUAN PENDIDIKAN, VISI, MISI, DAN TUJUAN SEKOLAH</h2>
      <h3>A. Tujuan Pendidikan</h3>
      <p>Tujuan Pendidikan Nasional dan Tujuan Pendidikan Dasar menjadi landasan penyusunan kurikulum satuan pendidikan.</p>
      <h3>B. Visi Sekolah</h3>
      ${paragraph(p.visi, '[Visi belum diisi pada menu Identitas Sekolah.]')}
      <h3>C. Misi Sekolah</h3>
      ${items(p.misi)}
      <h3>D. Tujuan Sekolah</h3>
      ${items(p.tujuan)}
      <h3>E. Dimensi Profil Pelajar</h3>
      ${items(p.dimensi, '[Dimensi profil pelajar belum diisi.]')}
    </section>`;

  const bab3 = `
    <section class="page" id="bab3">
      <h2 class="bab">BAB III PENGORGANISASIAN PEMBELAJARAN</h2>
      <h3>A. Struktur Kurikulum</h3>
      ${docCatatan(docs, d => d.kind === 'struktur', 'dokumen struktur kurikulum')}
      <table class="data">
        <thead><tr><th>No</th><th>Mata Pelajaran</th><th>Kelas</th><th>Alokasi</th></tr></thead>
        <tbody>${subjectRows(docs)}</tbody>
      </table>
      <h3>B. Capaian Pembelajaran</h3>
      <p class="placeholder">[Capaian Pembelajaran per elemen/mapel dimuat sesuai regulasi Kurikulum Merdeka yang berlaku.]</p>
      <h3>C. Projek Penguatan Profil Pelajar</h3>
      ${docCatatan(docs, d => d.kind === 'p5', 'dokumen projek P5')}
      <h3>D. Ekstrakurikuler</h3>
      ${paragraph(stepNote('f2', 6), '[Isi daftar ekstrakurikuler pada fase Isi Kurikulum.]')}
    </section>`;

  const bab4 = `
    <section class="page" id="bab4">
      <h2 class="bab">BAB IV PERENCANAAN PEMBELAJARAN</h2>
      <h3>A. Rencana Satu Tahun Pelajaran</h3>
      ${paragraph(stepNote('f2', 5), '[Isi program prioritas tahunan pada fase Isi Kurikulum.]')}
      ${raporReport?.priorities?.length ? `
        <h3>A.1. Program Prioritas Berdasarkan Rapor Pendidikan</h3>
        <p>Identifikasi kuning/merah, refleksi akar masalah, dan rekomendasi prioritas Kemendikdasmen Tahun ${e(raporReport.tahun || '-')} menjadi dasar penetapan program KSP Tahun Ajaran ${e(year)}.</p>
        ${raporProgramTable(raporReport)}
        <h3>A.2. Kaitan dengan RKT dan RKAS</h3>
        <p>Kegiatan benahi pada tabel A.1 ditindaklanjuti melalui Rencana Kerja Tahunan (RKT), Rencana Kerja Jangka Pendek (RKJP), dan Rancangan Anggaran Pendapatan dan Belanja Sekolah (RKAS). Rincian RKJP dan padanan kegiatannya dengan ARKAS disajikan pada Lampiran 9 dan Lampiran 10.</p>
      ` : (rapor.program ? `<h3>A.1. Program Prioritas Berdasarkan Rapor Pendidikan</h3><p>${e(rapor.program)}</p>` : '')}
      <h3>B. Alur Tujuan Pembelajaran</h3>
      ${docList(docs, ['atp'], '[Belum ada ATP terdaftar.]')}
      <h3>C. Modul Ajar</h3>
      ${docList(docs, ['modul'], '[Belum ada Modul Ajar terdaftar.]')}
      <h3>D. Peraturan Akademik</h3>
      ${docCatatan(docs, d => d.kind === 'peraturan-akademik', 'peraturan akademik')}
      <h3>E. Kalender Pendidikan</h3>
      ${docCatatan(docs, d => d.kind === 'kalender', 'kalender pendidikan')}
    </section>`;

  const bab5 = `
    <section class="page" id="bab5">
      <h2 class="bab">BAB V PENDAMPINGAN, EVALUASI, DAN PENGEMBANGAN PROFESIONAL</h2>
      <h3>A. Pendampingan Aspek Pedagogik</h3>
      ${paragraph(stepNote('f3', 7), '[Isi program supervisi akademik pada fase Pendampingan & Evaluasi.]')}
      <h3>B. Evaluasi Program</h3>
      ${paragraph(stepNote('f3', 7), '[Isi mekanisme evaluasi program pada fase Pendampingan & Evaluasi.]')}
      <h3>C. Pengembangan Profesional Guru</h3>
      ${paragraph(stepNote('f3', 7), '[Isi program pengembangan profesi pada fase Pendampingan & Evaluasi.]')}
    </section>`;

  const bab6 = `
    <section class="page" id="bab6">
      <h2 class="bab">BAB VI PENUTUP</h2>
      ${paragraph(stepNote('f4', 8), '[Isi penutup dan harapan ke depan pada fase Penutup & Penetapan.]')}
      <h3>Daftar Pustaka</h3>
      <ol>
        <li>Peraturan Menteri Pendidikan Dasar dan Menengah tentang Kurikulum pada PAUD, Jenjang Pendidikan Dasar, dan Jenjang Pendidikan Menengah.</li>
        <li>Keputusan Kepala Badan Standar, Kurikulum, dan Asesmen Pendidikan tentang Struktur Kurikulum dan Capaian Pembelajaran.</li>
        <li>Dokumen Kurikulum Satuan Pendidikan ${e(ws.name || 'Sekolah')} Tahun Ajaran ${e(year)}.</li>
      </ol>
    </section>`;

  const lampiran = [
    ['Peraturan Akademik', d => d.kind === 'peraturan-akademik'],
    ['Pengembangan Diri', d => /pengembangan diri/i.test(d.title || '')],
    ['Program Unggulan', d => /unggulan/i.test(d.title || '')],
    ['Asesmen dan Pengolahan Hasil Belajar', d => /asesmen|penilaian/i.test(d.title || '')],
    ['Contoh Alur Tujuan Pembelajaran', d => d.kind === 'atp'],
    ['Contoh Modul Ajar', d => d.kind === 'modul'],
    ['Contoh Projek P5', d => d.kind === 'p5'],
    ['SK Tim Pengembang Kurikulum', d => d.kind === 'sk-pengembang'],
  ].map(([title, predicate], i) => `
    <section class="page" id="lampiran${i + 1}">
      <h2 class="bab">LAMPIRAN ${i + 1}</h2>
      <h3>${e(title)}</h3>
      ${docCatatan(docs, predicate, title)}
    </section>`).join('');

  const lampiranRapor = hasRaporReport ? `
    <section class="page" id="lampiran9">
      <h2 class="bab">LAMPIRAN 9</h2>
      <h3>LEMBAR KERJA RENCANA KERJA JANGKA PENDEK (RKJP)</h3>
      <p>Nama Satuan Pendidikan: <strong>${e(ws.name || '-')}</strong> &nbsp; NPSN: <strong>${e(ws.npsn || '-')}</strong></p>
      <p>Daftar prioritas berikut disusun dari identifikasi kuning/merah dan akar masalah Rapor Pendidikan Kemdikbud Tahun ${e(raporReport.tahun || '-')}. Kolom biaya ditentukan saat penyusunan RKAS.</p>
      ${rkjpTable(raporReport)}
    </section>
    <section class="page" id="lampiran10">
      <h2 class="bab">LAMPIRAN 10</h2>
      <h3>LEMBAR KERJA PADANAN KEGIATAN ARKAS</h3>
      <p>Kegiatan benahi pada Lampiran 9 yang membutuhkan biaya dipadankan dengan kegiatan ARKAS. Bulan, jumlah, satuan, harga satuan, dan total diisi pada saat penyusunan RKAS.</p>
      ${arkasTable(raporReport)}
    </section>` : '';

  const tim = team.length ? `<table class="data">
    <thead><tr><th>No</th><th>Nama</th><th>NIP</th><th>Peran</th></tr></thead>
    <tbody>${team.map((t, i) => `<tr><td>${i + 1}</td><td>${e(t.name)}</td><td>${e(t.nip || '-')}</td><td>${e(t.role || '-')}</td></tr>`).join('')}</tbody>
  </table>` : '<p class="placeholder">[Belum ada anggota tim pengembang.]</p>';

  return `<!doctype html>
<html lang="id"><head>
<meta charset="utf-8">
<title>Draf KSP ${e(ws.name || 'Sekolah')} ${e(year)}</title>
<style>
  @page { size: A4; margin: 2cm 2cm 2cm 2.5cm; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.45; color: #000; margin: 0; }
  .page { page-break-before: always; }
  .cover { text-align: center; page-break-before: avoid; padding-top: 40px; }
  .cover img.logo { width: 90px; height: 90px; object-fit: contain; display: block; margin: 0 auto 12px; }
  .cover-kop { font-size: 12pt; text-transform: uppercase; }
  h1 { font-size: 18pt; margin: 60px 0 4px; letter-spacing: .5px; }
  h2 { font-size: 16pt; margin: 4px 0; }
  h3.cover-year { font-size: 14pt; margin-top: 20px; }
  .cover-address { margin-top: 60px; }
  .draft { margin-top: 30px; font-weight: bold; color: #a00; border: 1px solid #a00; display: inline-block; padding: 4px 10px; }
  .judul, .bab { text-align: center; text-transform: uppercase; margin: 0 0 24px; }
  h3 { margin: 18px 0 6px; }
  p { text-align: justify; margin: 0 0 10px; }
  .placeholder { color: #777; font-style: italic; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0 16px; font-size: 10.5pt; }
  table.data th, table.data td, table.identity td, table.sign td { border: 1px solid #999; padding: 5px 7px; vertical-align: top; }
  table.data th { background: #eee; text-align: center; }
  table.rapor-table { font-size: 9pt; }
  table.rapor-table td { line-height: 1.3; }
  h4 { margin: 14px 0 4px; font-size: 10.5pt; }
  table.identity td:first-child { width: 180px; }
  table.sign td { border: 0; width: 33%; text-align: center; vertical-align: bottom; }
  ol { margin: 6px 0 12px 22px; }
  .toc a { color: #000; text-decoration: none; }
  .small { font-size: 9pt; }
</style>
</head><body>
  ${cover}
  ${identitas}
  ${penetapan}
  ${pengesahan}
  ${validasi}
  ${pengantar}
  ${daftarIsi}
  ${bab1}
  ${bab2}
  ${bab3}
  ${bab4}
  ${bab5}
  ${bab6}
  <section class="page"><h2 class="bab">TIM PENGEMBANG KURIKULUM</h2>${tim}</section>
  ${lampiran}
  ${lampiranRapor}
</body></html>`;
}
