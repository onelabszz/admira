// Data bawaan untuk fitur E-KSP.
// Indikator mengikuti instrumen verifikasi KSP (33 butir) yang dipakai pengawas.

export const KSP_INDICATORS = [
  { code: 1, group: 'Bagian Awal', label: 'Halaman Judul', desc: 'Judul, tahun ajaran, logo, nama dan alamat sekolah.' },
  { code: 2, group: 'Bagian Awal', label: 'Identitas Satuan Pendidikan', desc: 'NPSN, nama sekolah, alamat, kepala sekolah, komite sekolah.' },
  { code: 3, group: 'Bagian Awal', label: 'Halaman Penetapan', desc: 'Rumusan penetapan, tanda tangan kepala sekolah dan komite.' },
  { code: 4, group: 'Bagian Awal', label: 'Halaman Pengesahan', desc: 'Lembar pengesahan dokumen kurikulum.' },
  { code: 5, group: 'Bagian Awal', label: 'Kata Pengantar', desc: 'Pengantar dan ucapan terima kasih kepada pihak yang berkontribusi.' },
  { code: 6, group: 'Bagian Awal', label: 'Daftar Isi', desc: 'Daftar isi seluruh komponen dokumen.' },
  { code: 7, group: 'Pendahuluan', label: 'Latar Belakang & Karakteristik Sekolah', desc: 'Analisis konteks dan keunikan sekolah (SWOT).' },
  { code: 8, group: 'Visi, Misi, dan Tujuan', label: 'Visi', desc: 'Visi sekolah sebagai tujuan jangka panjang.' },
  { code: 9, group: 'Visi, Misi, dan Tujuan', label: 'Misi', desc: 'Misi yang menjawab bagaimana visi dicapai.' },
  { code: 10, group: 'Visi, Misi, dan Tujuan', label: 'Tujuan', desc: 'Tujuan akhir kurikulum yang selaras dengan misi.' },
  { code: 11, group: 'Pengorganisasian Pembelajaran', label: 'Struktur & Beban Belajar', desc: 'Alokasi waktu intrakurikuler dan kokurikuler.' },
  { code: 12, group: 'Pengorganisasian Pembelajaran', label: 'Capaian Pembelajaran', desc: 'CP kelompok umum, pilihan, P5, dan muatan lokal.' },
  { code: 13, group: 'Pengorganisasian Pembelajaran', label: 'Asesmen dan Pembelajaran', desc: 'Asesmen awal, formatif, dan sumatif.' },
  { code: 14, group: 'Pengorganisasian Pembelajaran', label: 'Pemilihan Mata Pelajaran', desc: 'Penjelasan mekanisme pemilihan mata pelajaran.' },
  { code: 15, group: 'Pengorganisasian Pembelajaran', label: 'Projek Penguatan Profil Pelajar', desc: 'Tema, uraian, dan model kegiatan kokurikuler.' },
  { code: 16, group: 'Pengorganisasian Pembelajaran', label: 'Ekstrakurikuler', desc: 'Jenis, tujuan, dan pelaksanaan ekstrakurikuler.' },
  { code: 17, group: 'Perencanaan Pembelajaran', label: 'Rencana satu tahun pelajaran', desc: 'Alur pembelajaran dan program prioritas sekolah.' },
  { code: 18, group: 'Perencanaan Pembelajaran', label: 'Alur Tujuan Pembelajaran', desc: 'ATP sistematis dan logis hasil analisis CP.' },
  { code: 19, group: 'Perencanaan Pembelajaran', label: 'Modul Ajar', desc: 'Modul ajar berdiferensiasi dari ATP.' },
  { code: 20, group: 'Perencanaan Pembelajaran', label: 'Peraturan Akademik', desc: 'Asesmen, kriteria kenaikan kelas, dan kelulusan.' },
  { code: 21, group: 'Perencanaan Pembelajaran', label: 'Kalender Pendidikan', desc: 'Kalender kegiatan pembelajaran satu tahun ajaran.' },
  { code: 22, group: 'Pendampingan & Evaluasi', label: 'Pendampingan Aspek Pedagogik', desc: 'Supervisi akademik dan supervisi klinis.' },
  { code: 23, group: 'Pendampingan & Evaluasi', label: 'Evaluasi Program', desc: 'Evaluasi terhadap program pembelajaran sekolah.' },
  { code: 24, group: 'Pendampingan & Evaluasi', label: 'Pengembangan Profesional', desc: 'Program peningkatan kompetensi guru.' },
  { code: 25, group: 'Penutup', label: 'Penutup', desc: 'Kesimpulan dan harapan ke depan.' },
  { code: 26, group: 'Lampiran', label: 'Peraturan Akademik', desc: 'Lampiran peraturan akademik.' },
  { code: 27, group: 'Lampiran', label: 'Pengembangan Diri', desc: 'Lampiran program pengembangan diri.' },
  { code: 28, group: 'Lampiran', label: 'Program Unggulan', desc: 'Lampiran program unggulan sekolah.' },
  { code: 29, group: 'Lampiran', label: 'Asesmen & Pengolahan Hasil Belajar', desc: 'Contoh asesmen dan pengolahan nilai.' },
  { code: 30, group: 'Lampiran', label: 'Contoh Alur Tujuan Pembelajaran', desc: 'Satu contoh ATP lengkap.' },
  { code: 31, group: 'Lampiran', label: 'Contoh Modul Ajar', desc: 'Satu contoh modul ajar lengkap.' },
  { code: 32, group: 'Lampiran', label: 'Contoh Projek P5', desc: 'Contoh projek dengan tema dan isu spesifik.' },
  { code: 33, group: 'Lampiran', label: 'SK Tim Pengembang Kurikulum', desc: 'Surat keputusan pembentukan tim pengembang.' },
];

export const KSP_DOC_KINDS = [
  ['sk-pengembang', 'SK Tim Pengembang'],
  ['sk-pbm', 'SK Pembagian Tugas Guru'],
  ['sk-kokurikuler', 'SK Tim Kokurikuler'],
  ['struktur', 'Struktur Kurikulum'],
  ['kalender', 'Kalender Pendidikan'],
  ['atp', 'Alur Tujuan Pembelajaran'],
  ['modul', 'Modul Ajar'],
  ['peraturan-akademik', 'Peraturan Akademik'],
  ['p5', 'Projek P5'],
  ['ksp', 'Dokumen KSP'],
  ['verval', 'Instrumen Verval'],
  ['rekap', 'Rekap Verval'],
  ['penetapan', 'Surat Penetapan'],
  ['pernyataan', 'Surat Pernyataan'],
  ['berita-acara', 'Berita Acara'],
  ['rekomendasi', 'Rekomendasi Pengawas'],
  ['lainnya', 'Lainnya'],
];

export const KSP_APPROVAL_STAGES = [
  { type: 'penyusun', order: 1, label: 'Penyusun / Ketua Tim', role: 'Ketua Tim Pengembang' },
  { type: 'kepala', order: 2, label: 'Kepala Sekolah', role: 'Kepala Sekolah' },
  { type: 'komite', order: 3, label: 'Ketua Komite', role: 'Ketua Komite Sekolah' },
  { type: 'pengawas', order: 4, label: 'Pengawas Sekolah', role: 'Pengawas Sekolah' },
  { type: 'dinas', order: 5, label: 'Dinas Pendidikan', role: 'Dinas Pendidikan' },
];

export const KSP_DOC_TEMPLATES = {
  penetapan: {
    name: 'Surat Penetapan KSP',
    body: `<p style="text-align:center;margin-bottom:24px"><strong>KURIKULUM SATUAN PENDIDIKAN (KSP)</strong><br>{{sekolah}}</p>
<p>Setelah memperhatikan hasil penyusunan kurikulum oleh Tim Pengembang Kurikulum dan berdasarkan hasil rapat pleno dewan pendidik bersama Komite Sekolah, maka Kurikulum {{sekolah}} ditetapkan penggunaannya pada Tahun Pelajaran {{tahun_ajaran}}.</p>
<p>Ditetapkan di {{city}} pada tanggal {{tanggal}}.</p>`,
  },
  pernyataan: {
    name: 'Surat Pernyataan Pengembangan KSP',
    body: `<p style="text-align:center;margin-bottom:24px"><strong>SURAT PERNYATAAN PENGEMBANGAN KURIKULUM SATUAN PENDIDIKAN (KSP)</strong></p>
<p>Saya yang bertanda tangan di bawah ini:</p>
<table style="margin-left:20px;margin-bottom:16px">
  <tr><td style="width:140px">Nama</td><td>: {{kepala}}</td></tr>
  <tr><td>NIP</td><td>: {{nip_kepala}}</td></tr>
  <tr><td>Jabatan</td><td>: Kepala Sekolah</td></tr>
  <tr><td>Unit kerja</td><td>: {{sekolah}}</td></tr>
</table>
<p>Menyatakan bahwa seluruh proses pengembangan KSP Tahun Pelajaran {{tahun_ajaran}} telah dilakukan sesuai ketentuan, meliputi:</p>
<ol style="margin-left:22px">
  <li>Menyusun tim pengembang kurikulum sekolah;</li>
  <li>Melakukan analisis regulasi, daya dukung, dan kebutuhan peserta didik;</li>
  <li>Melakukan review dan/atau menyusun draf dokumen KSP dalam workshop;</li>
  <li>Melibatkan narasumber yang relevan;</li>
  <li>Melakukan verifikasi dokumen oleh pengawas sekolah;</li>
  <li>Melakukan finalisasi dokumen kurikulum.</li>
</ol>
<p>Demikian surat pernyataan ini dibuat dengan sebenarsesuai dengan tanggung jawab saya.</p>`,
  },
  berita_acara: {
    name: 'Berita Acara Verval KSP',
    body: `<p style="text-align:center;margin-bottom:24px"><strong>BERITA ACARA VERIFIKASI KURIKULUM SATUAN PENDIDIKAN</strong><br>{{sekolah}}</p>
<p>Yang bertanda tangan di bawah ini:</p>
<table style="margin-left:20px;margin-bottom:16px">
  <tr><td style="width:140px">Nama</td><td>: {{kepala}}</td></tr>
  <tr><td>Jabatan</td><td>: Kepala Sekolah (Pihak Pertama)</td></tr>
  <tr><td>Nama</td><td>: {{pengawas}}</td></tr>
  <tr><td>Jabatan</td><td>: Pengawas Sekolah (Pihak Kedua)</td></tr>
</table>
<p>Pihak Kedua melakukan verifikasi kepada Pihak Pertama atas Dokumen I, Dokumen II, dan Dokumen III Kurikulum Satuan Pendidikan {{sekolah}} Tahun Pelajaran {{tahun_ajaran}}.</p>
<p>Pihak Kedua menerima berkas/dokumen tersebut untuk dipergunakan sebagai bahan verifikasi kurikulum.</p>
<p>Demikian berita acara ini dibuat untuk digunakan sebagaimana mestinya.</p>`,
  },
  rekomendasi: {
    name: 'Surat Rekomendasi Pengawas',
    body: `<p style="text-align:center;margin-bottom:24px"><strong>SURAT REKOMENDASI</strong></p>
<p>Yang bertanda tangan di bawah ini, Pengawas {{dinas}}, menyatakan bahwa {{sekolah}} telah melakukan seluruh proses penyusunan dan pengembangan KSP Tahun Pelajaran {{tahun_ajaran}}.</p>
<p>Selanjutnya dokumen KSP tersebut direkomendasikan untuk disahkan oleh {{dinas}}.</p>
<p>Demikian surat rekomendasi ini dibuat untuk digunakan sebagaimana mestinya.</p>`,
  },
};

export const KSP_TOKENS = [
  '{{sekolah}}', '{{city}}', '{{tahun_ajaran}}', '{{tanggal}}',
  '{{kepala}}', '{{nip_kepala}}', '{{ketua_komite}}', '{{pengawas}}', '{{nip_pengawas}}',
];
