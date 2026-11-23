// Pustaka template bawaan Admira.
// Rujukan hukum disusun per September 2026; sesuaikan dengan peraturan
// daerah/instansi masing-masing sebelum digunakan resmi.

const UU_SISDIKNAS = 'Undang-Undang No. 20 Tahun 2003 tentang Sistem Pendidikan Nasional';
const PP_SNP = 'Peraturan Pemerintah No. 57 Tahun 2021 jo. PP No. 4 Tahun 2022 tentang Standar Nasional Pendidikan';
const STANDAR_PENGELOLAAN = 'Permendikdasmen No. 26 Tahun 2025 tentang Standar Pengelolaan pada PAUD, Jenjang Pendidikan Dasar, dan Jenjang Pendidikan Menengah';
const KURIKULUM = 'Permendikbudristek No. 12 Tahun 2024 jo. Permendikdasmen No. 13 Tahun 2025 tentang Kurikulum pada PAUD, Jenjang Pendidikan Dasar, dan Jenjang Pendidikan Menengah';
const BUDAYA_AMAN = 'Permendikdasmen No. 6 Tahun 2026 tentang Budaya Sekolah yang Aman dan Nyaman';
const BEBAN_KERJA = 'Permendikdasmen No. 11 Tahun 2025 tentang Pemenuhan Beban Kerja Guru';
const BOSP = 'Permendikdasmen No. 8 Tahun 2026 tentang Petunjuk Teknis Pengelolaan Dana Bantuan Operasional Satuan Pendidikan';
const UU_GURU = 'Undang-Undang No. 14 Tahun 2008 tentang Guru dan Dosen';
const UU_ANAK = 'Undang-Undang No. 35 Tahun 2014 tentang Perubahan atas Undang-Undang No. 23 Tahun 2002 tentang Perlindungan Anak';
const UU_ASN = 'Undang-Undang No. 20 Tahun 2023 tentang Aparatur Sipil Negara';
const PP_DISIPLIN = 'Peraturan Pemerintah No. 94 Tahun 2021 tentang Disiplin Pegawai Negeri Sipil';

const TEMPLATE_UNDANGAN_KOMITE = `<table style="width: 100%; margin-bottom: 24px;">
  <tr>
    <td style="width: 60%; vertical-align: top;">
      Nomor&nbsp;&nbsp;&nbsp;&nbsp;: {{nomor}}<br>
      Hal&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: <strong>{{perihal}}</strong><br>
      Lampiran : -
    </td>
    <td style="width: 40%; vertical-align: top;">
      {{tanggal_surat}}<br><br>
      Kepada :<br>
      Yth. {{tujuan}}<br>
      di -<br>
      &nbsp;&nbsp;&nbsp;&nbsp;tempat
    </td>
  </tr>
</table>

<p>Dengan hormat,</p>
<p style="text-indent: 40px;">Sehubungan dengan akan dilaksanakannya kegiatan {{keperluan}}, maka dengan ini mengharap untuk hadir besok pada :</p>

<table style="margin-left: 40px; margin-bottom: 16px;">
  <tr><td style="width:120px;">Hari</td><td>: {{hari}}</td></tr>
  <tr><td>Tanggal</td><td>: {{tanggal}}</td></tr>
  <tr><td>Waktu</td><td>: Pukul {{waktu}} – selesai</td></tr>
  <tr><td>Tempat</td><td>: {{tempat}}</td></tr>
  <tr><td>Keperluan</td><td>: {{keperluan}}</td></tr>
</table>

<p>Demikian surat undangan ini kami sampaikan, atas perhatian dan kerjasamanya diucapkan terimakasih.</p>`;

const TEMPLATE_KETERANGAN_SISWA = `<p style="text-align:center; margin-bottom: 24px;">Nomor : {{nomor}}</p>

<p>Yang bertanda tangan dibawah ini:</p>
<table style="margin-left: 20px; margin-bottom: 16px;">
  <tr><td style="width:150px;">Nama</td><td>: <strong>{{kepala}}</strong></td></tr>
  <tr><td>NIP</td><td>: {{nip_kepala}}</td></tr>
  <tr><td>Pangkat/Gol</td><td>: {{pangkat_kepala}}</td></tr>
  <tr><td>Jabatan</td><td>: Kepala Sekolah</td></tr>
  <tr><td>Instansi</td><td>: {{sekolah}}</td></tr>
</table>

<p>Menerangkan bahwa:</p>
<table style="margin-left: 20px; margin-bottom: 16px;">
  <tr><td style="width:150px;">Nama</td><td>: <strong>{{nama_siswa}}</strong></td></tr>
  <tr><td>Tempat, tanggal lahir</td><td>: {{ttl_siswa}}</td></tr>
  <tr><td>Jenis kelamin</td><td>: {{jk_siswa}}</td></tr>
  <tr><td>NIS</td><td>: {{nis_siswa}}</td></tr>
  <tr><td>NISN</td><td>: {{nisn_siswa}}</td></tr>
</table>

<p style="text-indent: 40px;">Siswa tersebut diatas benar-benar tercatat sebagai siswa kelas {{kelas_siswa}} di {{sekolah}} Tahun Pelajaran {{tahun_ajaran}}.</p>
<p style="text-indent: 40px;">Demikian surat keterangan ini dibuat dengan sebenarnya untuk dapat dipergunakan sebagaimana mestinya.</p>`;

const TEMPLATE_UNDANGAN_RAPAT_DINAS = `<p style="text-align: right; margin-bottom: 18px;">{{tanggal_surat}}</p>
<p>Yth. {{tujuan}}<br>{{sekolah}}<br>di tempat</p>

<p>Dengan hormat,</p>
<p style="text-indent: 40px;">Sehubungan dengan pelaksanaan program kerja {{sekolah}} Tahun Pelajaran {{tahun_ajaran}}, kami mengharapkan kehadiran Bapak/Ibu dalam rapat dinas dengan rincian sebagai berikut:</p>

<table style="margin-left: 40px; margin-bottom: 16px;">
  <tr><td style="width: 130px;">Hari/Tanggal</td><td>: {{hari}}, {{tanggal}}</td></tr>
  <tr><td>Waktu</td><td>: Pukul {{waktu}} WIB – selesai</td></tr>
  <tr><td>Tempat</td><td>: {{tempat}}</td></tr>
  <tr><td>Agenda</td><td>: {{agenda}}</td></tr>
</table>

<p style="text-indent: 40px;">Mengingat pentingnya agenda tersebut, mohon Bapak/Ibu hadir tepat waktu dan membawa data pendukung yang diperlukan.</p>
<p>Demikian undangan ini kami sampaikan, atas perhatian dan kerja sama Bapak/Ibu diucapkan terima kasih.</p>`;

const TEMPLATE_UNDANGAN_KEGIATAN = `<p style="text-align: right; margin-bottom: 18px;">{{tanggal_surat}}</p>
<p>Yth. {{tujuan}}<br>di tempat</p>

<p>Dengan hormat,</p>
<p style="text-indent: 40px;">Dalam rangka pelaksanaan kegiatan {{acara}} Tahun Pelajaran {{tahun_ajaran}}, kami mengundang Bapak/Ibu/Saudara untuk hadir pada:</p>

<table style="margin-left: 40px; margin-bottom: 16px;">
  <tr><td style="width: 130px;">Hari/Tanggal</td><td>: {{hari}}, {{tanggal}}</td></tr>
  <tr><td>Waktu</td><td>: Pukul {{waktu}} WIB – selesai</td></tr>
  <tr><td>Tempat</td><td>: {{tempat}}</td></tr>
  <tr><td>Acara</td><td>: {{acara}}</td></tr>
</table>

<p style="text-indent: 40px;">Kehadiran Bapak/Ibu/Saudara sangat kami harapkan. Atas perhatian dan kerja samanya, kami sampaikan terima kasih.</p>`;

const TEMPLATE_SURAT_TUGAS = `<p style="text-indent: 40px;">Yang bertanda tangan di bawah ini:</p>
<table style="margin-left: 20px; margin-bottom: 16px;">
  <tr><td style="width: 130px;">Nama</td><td>: <strong>{{kepala}}</strong></td></tr>
  <tr><td>NIP</td><td>: {{nip_kepala}}</td></tr>
  <tr><td>Jabatan</td><td>: Kepala Sekolah</td></tr>
  <tr><td>Instansi</td><td>: {{sekolah}}</td></tr>
</table>

<p>Dasar:</p>
<ol style="margin: 0 0 14px 22px; padding: 0;">{{dasar_hukum}}</ol>

<p>Dengan ini menugaskan kepada:</p>
<table style="margin-left: 20px; margin-bottom: 16px;">
  <tr><td style="width: 130px;">Nama</td><td>: <strong>{{nama}}</strong></td></tr>
  <tr><td>NIP</td><td>: {{nip}}</td></tr>
  <tr><td>Jabatan</td><td>: {{jabatan}}</td></tr>
</table>

<p>Untuk melaksanakan tugas <strong>{{tugas}}</strong> pada:</p>
<table style="margin-left: 20px; margin-bottom: 16px;">
  <tr><td style="width: 130px;">Tanggal</td><td>: {{tanggal_mulai}} s.d. {{tanggal_selesai}}</td></tr>
  <tr><td>Tempat</td><td>: {{tempat}}</td></tr>
</table>

<p style="text-indent: 40px;">Yang bersangkutan wajib melaksanakan tugas dengan penuh tanggung jawab dan menyampaikan laporan hasil pelaksanaan tugas kepada Kepala Sekolah.</p>
<p>Demikian surat tugas ini dibuat untuk dilaksanakan sebagaimana mestinya.</p>`;

const TEMPLATE_KETERANGAN_LULUS = `<p style="text-align:center; margin-bottom: 24px;">Nomor : {{nomor}}</p>

<p>Yang bertanda tangan di bawah ini:</p>
<table style="margin-left: 20px; margin-bottom: 16px;">
  <tr><td style="width: 150px;">Nama</td><td>: <strong>{{kepala}}</strong></td></tr>
  <tr><td>NIP</td><td>: {{nip_kepala}}</td></tr>
  <tr><td>Jabatan</td><td>: Kepala Sekolah</td></tr>
  <tr><td>Instansi</td><td>: {{sekolah}}</td></tr>
</table>

<p>Menerangkan bahwa:</p>
<table style="margin-left: 20px; margin-bottom: 16px;">
  <tr><td style="width: 150px;">Nama</td><td>: <strong>{{nama_siswa}}</strong></td></tr>
  <tr><td>Tempat, tanggal lahir</td><td>: {{ttl_siswa}}</td></tr>
  <tr><td>NIS</td><td>: {{nis_siswa}}</td></tr>
  <tr><td>NISN</td><td>: {{nisn_siswa}}</td></tr>
  <tr><td>Kelas</td><td>: {{kelas_siswa}}</td></tr>
</table>

<p style="text-indent: 40px;">Berdasarkan hasil penilaian akhir dan rapat pleno dewan guru, siswa tersebut dinyatakan <strong>LULUS</strong> dari {{sekolah}} Tahun Pelajaran {{tahun_ajaran}}.</p>
<p style="text-indent: 40px;">Demikian surat keterangan lulus ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.</p>`;

const TEMPLATE_KETERANGAN_PINDAH = `<p style="text-align:center; margin-bottom: 24px;">Nomor : {{nomor}}</p>

<p>Yang bertanda tangan di bawah ini:</p>
<table style="margin-left: 20px; margin-bottom: 16px;">
  <tr><td style="width: 150px;">Nama</td><td>: <strong>{{kepala}}</strong></td></tr>
  <tr><td>NIP</td><td>: {{nip_kepala}}</td></tr>
  <tr><td>Jabatan</td><td>: Kepala Sekolah</td></tr>
  <tr><td>Instansi</td><td>: {{sekolah}}</td></tr>
</table>

<p>Menerangkan bahwa:</p>
<table style="margin-left: 20px; margin-bottom: 16px;">
  <tr><td style="width: 150px;">Nama</td><td>: <strong>{{nama_siswa}}</strong></td></tr>
  <tr><td>Tempat, tanggal lahir</td><td>: {{ttl_siswa}}</td></tr>
  <tr><td>NIS</td><td>: {{nis_siswa}}</td></tr>
  <tr><td>NISN</td><td>: {{nisn_siswa}}</td></tr>
  <tr><td>Kelas</td><td>: {{kelas_siswa}}</td></tr>
</table>

<p style="text-indent: 40px;">Sesuai permohonan orang tua/wali, siswa tersebut telah mengajukan pindah ke <strong>{{sekolah_tujuan}}</strong> terhitung mulai Tahun Pelajaran {{tahun_ajaran}}.</p>
<p style="text-indent: 40px;">Demikian surat keterangan pindah ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.</p>`;

const TEMPLATE_PANGGILAN_ORANG_TUA = `<p style="text-align: right; margin-bottom: 18px;">{{tanggal_surat}}</p>
<p>Yth. {{nama_orang_tua}}<br>Orang Tua/Wali dari {{nama_siswa}}<br>di tempat</p>

<p>Dengan hormat,</p>
<p style="text-indent: 40px;">Sehubungan dengan {{alasan}}, kami mengharapkan kehadiran Bapak/Ibu pada:</p>

<table style="margin-left: 40px; margin-bottom: 16px;">
  <tr><td style="width: 130px;">Hari/Tanggal</td><td>: {{hari}}, {{tanggal}}</td></tr>
  <tr><td>Waktu</td><td>: Pukul {{waktu}} WIB</td></tr>
  <tr><td>Tempat</td><td>: {{tempat}}</td></tr>
  <tr><td>Keperluan</td><td>: {{keperluan}}</td></tr>
</table>

<p style="text-indent: 40px;">Mengingat pentingnya pertemuan ini, mohon Bapak/Ibu hadir tepat waktu. Jika berhalangan, mohon menghubungi wali kelas atau bagian kesiswaan terlebih dahulu.</p>
<p>Demikian surat panggilan ini kami sampaikan. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.</p>`;

const TEMPLATE_PERMOHONAN_IZIN = `<p style="text-align: right; margin-bottom: 18px;">{{tanggal_surat}}</p>
<p>Yth. {{tujuan}}<br>di tempat</p>

<p>Dengan hormat,</p>
<p style="text-indent: 40px;">Dalam rangka pelaksanaan kegiatan {{acara}} oleh {{sekolah}} Tahun Pelajaran {{tahun_ajaran}}, kami mengajukan permohonan izin pelaksanaan kegiatan tersebut pada:</p>

<table style="margin-left: 40px; margin-bottom: 16px;">
  <tr><td style="width: 130px;">Hari/Tanggal</td><td>: {{hari}}, {{tanggal}}</td></tr>
  <tr><td>Waktu</td><td>: Pukul {{waktu}} WIB – selesai</td></tr>
  <tr><td>Tempat</td><td>: {{tempat}}</td></tr>
  <tr><td>Jumlah Peserta</td><td>: {{jumlah}}</td></tr>
</table>

<p style="text-indent: 40px;">Sebagai bahan pertimbangan, kami lampirkan proposal kegiatan dan daftar peserta. Kami berkomitmen melaksanakan kegiatan sesuai ketentuan yang berlaku serta menjaga keamanan dan ketertiban.</p>
<p>Demikian permohonan ini kami sampaikan. Atas perhatian dan izin yang diberikan, kami ucapkan terima kasih.</p>`;

const TEMPLATE_PEMBERITAHUAN = `<p style="text-align: right; margin-bottom: 18px;">{{tanggal_surat}}</p>
<p>Yth. {{tujuan}}<br>di tempat</p>

<p>Dengan hormat,</p>
<p style="text-indent: 40px;">Bersama ini kami beritahukan bahwa {{sekolah}} akan melaksanakan {{acara}} pada:</p>

<table style="margin-left: 40px; margin-bottom: 16px;">
  <tr><td style="width: 130px;">Hari/Tanggal</td><td>: {{hari}}, {{tanggal}}</td></tr>
  <tr><td>Waktu</td><td>: Pukul {{waktu}} WIB – selesai</td></tr>
  <tr><td>Tempat</td><td>: {{tempat}}</td></tr>
</table>

<p style="text-indent: 40px;">Sehubungan dengan kegiatan tersebut, {{keterangan}}.</p>
<p>Demikian pemberitahuan ini kami sampaikan. Atas perhatian dan kerja samanya, kami ucapkan terima kasih.</p>`;

const TEMPLATE_EDARAN_BUDAYA_AMAN = `<p style="text-align:center; margin-bottom: 20px;"><strong>SURAT EDARAN</strong><br>Nomor: {{nomor}}</p>

<p>Yth. Bapak/Ibu Orang Tua/Wali Murid<br>{{sekolah}}</p>

<p>Dengan hormat,</p>
<p style="text-indent: 40px;">Dalam rangka mewujudkan budaya sekolah yang aman, nyaman, dan menyenangkan bagi seluruh murid, kami menyampaikan hal-hal berikut:</p>

<ol style="margin-left: 22px; padding: 0;">
  <li>Sekolah menerapkan disiplin positif dan menolak segala bentuk kekerasan fisik, verbal, sosial, maupun daring.</li>
  <li>Murid, orang tua, dan tenaga kependidikan dapat menyampaikan laporan dugaan kekerasan kepada wali kelas atau kepala sekolah secara langsung maupun melalui saluran resmi sekolah.</li>
  <li>Orang tua diharapkan mendampingi dan mengawasi penggunaan gawai serta media sosial anak di rumah.</li>
  <li>Komunikasi antara sekolah dan orang tua dilakukan secara terbuka, santun, dan mengutamakan kepentingan terbaik anak.</li>
</ol>

<p style="text-indent: 40px;">Demikian surat edaran ini kami sampaikan untuk menjadi perhatian bersama. Atas kerja sama Bapak/Ibu, kami ucapkan terima kasih.</p>`;

const TEMPLATE_PENGANTAR = `<p style="text-align: right; margin-bottom: 18px;">{{tanggal_surat}}</p>
<p>Yth. {{tujuan}}<br>di tempat</p>

<p>Dengan hormat,</p>
<p style="text-indent: 40px;">Bersama ini kami sampaikan {{dokumen}} sebanyak {{jumlah}} untuk keperluan {{keperluan}}.</p>

<p style="text-indent: 40px;">Kami mohon dokumen tersebut dapat diterima dan diproses sesuai ketentuan yang berlaku. Apabila terdapat kekurangan atau hal yang perlu dikonfirmasi, silakan menghubungi kami melalui kontak sekolah.</p>

<p>Demikian surat pengantar ini kami sampaikan. Atas perhatian dan kerja samanya, kami ucapkan terima kasih.</p>`;

const TEMPLATE_REKOMENDASI = `<p style="text-indent: 40px;">Yang bertanda tangan di bawah ini:</p>
<table style="margin-left: 20px; margin-bottom: 16px;">
  <tr><td style="width: 150px;">Nama</td><td>: <strong>{{kepala}}</strong></td></tr>
  <tr><td>NIP</td><td>: {{nip_kepala}}</td></tr>
  <tr><td>Jabatan</td><td>: Kepala Sekolah</td></tr>
  <tr><td>Instansi</td><td>: {{sekolah}}</td></tr>
</table>

<p>Dengan ini memberikan rekomendasi kepada:</p>
<table style="margin-left: 20px; margin-bottom: 16px;">
  <tr><td style="width: 150px;">Nama</td><td>: <strong>{{nama_siswa}}</strong></td></tr>
  <tr><td>NIS</td><td>: {{nis_siswa}}</td></tr>
  <tr><td>Kelas</td><td>: {{kelas_siswa}}</td></tr>
  <tr><td>Tempat, tanggal lahir</td><td>: {{ttl_siswa}}</td></tr>
</table>

<p style="text-indent: 40px;">Untuk mengikuti {{acara}} yang diselenggarakan oleh {{tujuan_rekomendasi}}. Berdasarkan penilaian akademik, sikap, dan prestasi yang bersangkutan, kami menilai siswa tersebut memenuhi syarat untuk mengikuti kegiatan dimaksud.</p>
<p style="text-indent: 40px;">Demikian surat rekomendasi ini dibuat dengan sebenarnya untuk dipergunakan sebagaimana mestinya.</p>`;

const TEMPLATE_NARASUMBER = `<p style="text-align: right; margin-bottom: 18px;">{{tanggal_surat}}</p>
<p>Yth. {{nama}}<br>{{jabatan}}<br>di tempat</p>

<p>Dengan hormat,</p>
<p style="text-indent: 40px;">Dalam rangka {{acara}} yang diselenggarakan oleh {{sekolah}} Tahun Pelajaran {{tahun_ajaran}}, kami mengharapkan kesediaan Bapak/Ibu untuk menjadi narasumber pada:</p>

<table style="margin-left: 40px; margin-bottom: 16px;">
  <tr><td style="width: 130px;">Hari/Tanggal</td><td>: {{hari}}, {{tanggal}}</td></tr>
  <tr><td>Waktu</td><td>: Pukul {{waktu}} WIB – selesai</td></tr>
  <tr><td>Tempat</td><td>: {{tempat}}</td></tr>
  <tr><td>Materi</td><td>: {{materi}}</td></tr>
</table>

<p style="text-indent: 40px;">Konfirmasi kesediaan dapat disampaikan kepada panitia melalui kontak sekolah. Atas perhatian dan kesediaan Bapak/Ibu, kami ucapkan terima kasih.</p>`;

const TEMPLATE_SPTB = `<p style="text-align:center; margin-bottom: 20px;"><strong>SURAT PERNYATAAN TANGGUNG JAWAB BELANJA</strong><br>Nomor: {{nomor}}</p>

<p style="text-indent: 40px;">Yang bertanda tangan di bawah ini:</p>
<table style="margin-left: 20px; margin-bottom: 16px;">
  <tr><td style="width: 130px;">Nama</td><td>: <strong>{{kepala}}</strong></td></tr>
  <tr><td>NIP</td><td>: {{nip_kepala}}</td></tr>
  <tr><td>Jabatan</td><td>: Kepala Sekolah</td></tr>
  <tr><td>Instansi</td><td>: {{sekolah}}</td></tr>
</table>

<p style="text-indent: 40px;">Menyatakan bahwa belanja berikut telah dilaksanakan dan dipertanggungjawabkan sesuai ketentuan pengelolaan dana BOSP:</p>

<table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
  <tr>
    <td style="border: 1px solid #000; padding: 6px;"><strong>Uraian Belanja</strong></td>
    <td style="border: 1px solid #000; padding: 6px; width: 30%;"><strong>Jumlah</strong></td>
  </tr>
  <tr>
    <td style="border: 1px solid #000; padding: 6px;">{{uraian}}</td>
    <td style="border: 1px solid #000; padding: 6px;">{{jumlah_biaya}}</td>
  </tr>
  <tr>
    <td style="border: 1px solid #000; padding: 6px;" colspan="2">Sumber dana: {{sumber_dana}}</td>
  </tr>
</table>

<p style="text-indent: 40px;">Bukti pengeluaran atas belanja tersebut dilampirkan dan disimpan sesuai ketentuan peraturan perundang-undangan. Demikian surat pernyataan ini dibuat dengan sebenarnya.</p>`;

export const DEFAULT_TEMPLATES = [
  {
    name: 'Surat Undangan (Komite)',
    category: 'eksternal',
    basis: [UU_SISDIKNAS, PP_SNP, STANDAR_PENGELOLAAN],
    body: TEMPLATE_UNDANGAN_KOMITE,
  },
  {
    name: 'Surat Keterangan Siswa',
    category: 'siswa',
    basis: [UU_SISDIKNAS, PP_SNP, STANDAR_PENGELOLAAN],
    body: TEMPLATE_KETERANGAN_SISWA,
  },
  {
    name: 'Surat Undangan Rapat Dinas',
    category: 'internal',
    basis: [STANDAR_PENGELOLAAN, BEBAN_KERJA, UU_SISDIKNAS],
    body: TEMPLATE_UNDANGAN_RAPAT_DINAS,
  },
  {
    name: 'Surat Undangan Kegiatan Sekolah',
    category: 'eksternal',
    basis: [UU_SISDIKNAS, PP_SNP, KURIKULUM],
    body: TEMPLATE_UNDANGAN_KEGIATAN,
  },
  {
    name: 'Surat Tugas',
    category: 'internal',
    basis: [UU_GURU, BEBAN_KERJA, STANDAR_PENGELOLAAN],
    body: TEMPLATE_SURAT_TUGAS,
  },
  {
    name: 'Surat Keterangan Lulus',
    category: 'siswa',
    basis: [UU_SISDIKNAS, KURIKULUM, STANDAR_PENGELOLAAN],
    body: TEMPLATE_KETERANGAN_LULUS,
  },
  {
    name: 'Surat Keterangan Pindah Sekolah',
    category: 'siswa',
    basis: [UU_SISDIKNAS, PP_SNP, STANDAR_PENGELOLAAN],
    body: TEMPLATE_KETERANGAN_PINDAH,
  },
  {
    name: 'Surat Panggilan Orang Tua/Wali',
    category: 'siswa',
    basis: [UU_ANAK, BUDAYA_AMAN, PP_SNP],
    body: TEMPLATE_PANGGILAN_ORANG_TUA,
  },
  {
    name: 'Surat Permohonan Izin Kegiatan',
    category: 'eksternal',
    basis: [UU_SISDIKNAS, STANDAR_PENGELOLAAN, KURIKULUM],
    body: TEMPLATE_PERMOHONAN_IZIN,
  },
  {
    name: 'Surat Pemberitahuan Kegiatan/Libur',
    category: 'eksternal',
    basis: [UU_SISDIKNAS, STANDAR_PENGELOLAAN, KURIKULUM],
    body: TEMPLATE_PEMBERITAHUAN,
  },
  {
    name: 'Surat Edaran Budaya Sekolah Aman',
    category: 'eksternal',
    basis: [BUDAYA_AMAN, UU_ANAK, STANDAR_PENGELOLAAN],
    body: TEMPLATE_EDARAN_BUDAYA_AMAN,
  },
  {
    name: 'Surat Pengantar Dokumen',
    category: 'eksternal',
    basis: [UU_SISDIKNAS, STANDAR_PENGELOLAAN],
    body: TEMPLATE_PENGANTAR,
  },
  {
    name: 'Surat Rekomendasi Siswa',
    category: 'siswa',
    basis: [UU_SISDIKNAS, KURIKULUM, STANDAR_PENGELOLAAN],
    body: TEMPLATE_REKOMENDASI,
  },
  {
    name: 'Surat Permohonan Narasumber',
    category: 'eksternal',
    basis: [STANDAR_PENGELOLAAN, BEBAN_KERJA],
    body: TEMPLATE_NARASUMBER,
  },
  {
    name: 'Surat Pernyataan Tanggung Jawab Belanja',
    category: 'keuangan',
    basis: [BOSP, UU_SISDIKNAS, PP_SNP],
    body: TEMPLATE_SPTB,
  },
];

export const WA_CATEGORIES = [
  'Rapat',
  'Kegiatan',
  'Akademik',
  'Libur',
  'Kedisiplinan',
  'Kesehatan',
  'Administrasi',
  'Darurat',
  'Lainnya',
];

export const DEFAULT_WA_TEMPLATES = [
  {
    name: 'Undangan Rapat Guru',
    category: 'Rapat',
    builtIn: true,
    body: `*UNDANGAN RAPAT GURU*
{{sekolah}} — Tahun Pelajaran {{tahun_ajaran}}

Assalamualaikum warahmatullahi wabarakatuh.
Selamat pagi Bapak/Ibu guru dan tenaga kependidikan.

Dengan hormat, kami mengundang Bapak/Ibu untuk hadir dalam rapat:

🗓 Hari/Tanggal : {{hari}}, {{tanggal}}
⏰ Waktu : {{waktu}}
📍 Tempat : {{tempat}}
📌 Agenda : {{agenda}}

Mohon hadir tepat waktu dan membawa data pendukung yang diperlukan.

Terima kasih. 🙏
*Kepala {{sekolah}}*`,
  },
  {
    name: 'Undangan Rapat Komite / Orang Tua',
    category: 'Rapat',
    builtIn: true,
    body: `*UNDANGAN PERTEMUAN ORANG TUA/WALI*
{{sekolah}}

Yth. Bapak/Ibu Orang Tua/Wali Murid kelas {{kelas}},

Dengan hormat, kami mengundang Bapak/Ibu untuk menghadiri pertemuan:

🗓 Hari/Tanggal : {{hari}}, {{tanggal}}
⏰ Waktu : {{waktu}}
📍 Tempat : {{tempat}}
📌 Agenda : {{agenda}}

Kehadiran Bapak/Ibu sangat kami harapkan demi kemajuan belajar ananda.

Mohon konfirmasi kehadiran kepada wali kelas paling lambat {{batas}}.

Terima kasih atas perhatian dan kerja samanya. 🙏`,
  },
  {
    name: 'Pemberitahuan Kegiatan Sekolah',
    category: 'Kegiatan',
    builtIn: true,
    body: `*PEMBERITAHUAN KEGIATAN*
{{sekolah}}

Yth. Bapak/Ibu Orang Tua/Wali Murid,

Bersama ini kami informasikan bahwa sekolah akan melaksanakan:

🎯 Kegiatan : {{acara}}
🗓 Hari/Tanggal : {{hari}}, {{tanggal}}
⏰ Waktu : {{waktu}}
📍 Tempat : {{tempat}}

{{keterangan}}

Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih. 🙏`,
  },
  {
    name: 'Pendaftaran Ekstrakurikuler',
    category: 'Kegiatan',
    builtIn: true,
    body: `*PENDAFTARAN EKSTRAKURIKULER*
{{sekolah}} — {{tahun_ajaran}}

Halo murid-murid hebat! 👋

Pendaftaran ekstrakurikuler dibuka mulai {{tanggal}} sampai {{batas}}.

Pilihan kegiatan antara lain:
{{daftar_kegiatan}}

📝 Cara mendaftar: hubungi {{kontak}} atau isi formulir di sekolah.

Yuk kembangkan bakat dan minatmu bersama kami! 💪`,
  },
  {
    name: 'Kerja Bakti Sekolah',
    category: 'Kegiatan',
    builtIn: true,
    body: `*AJAKAN KERJA BAKTI*
{{sekolah}}

Assalamualaikum warahmatullahi wabarakatuh.

Dalam rangka menjaga kebersihan dan kenyamanan lingkungan sekolah, kami mengajak Bapak/Ibu/Saudara untuk mengikuti kerja bakti:

🗓 Hari/Tanggal : {{hari}}, {{tanggal}}
⏰ Waktu : {{waktu}}
📍 Titik kumpul : {{tempat}}

Mohon membawa peralatan kebersihan seadanya. Mari bergotong royong menciptakan sekolah yang bersih dan nyaman. 🤝

Terima kasih. 🙏`,
  },
  {
    name: 'Jadwal Asesmen / Sumatif',
    category: 'Akademik',
    builtIn: true,
    body: `*PEMBERITAHUAN ASESMEN*
{{sekolah}} — {{tahun_ajaran}}

Yth. Bapak/Ibu Orang Tua/Wali dan murid kelas {{kelas}},

Asesmen akan dilaksanakan pada:

🗓 Tanggal : {{tanggal}} s.d. {{batas}}
📍 Tempat : {{tempat}}
📚 Materi : {{materi}}

Mohon mempersiapkan diri dengan belajar rutin, istirahat cukup, dan membawa perlengkapan belajar.

Jadwal lengkap dapat dilihat di {{tautan}} atau ditanyakan kepada wali kelas.

Terima kasih. 🙏`,
  },
  {
    name: 'Pembagian Rapor',
    category: 'Akademik',
    builtIn: true,
    body: `*PEMBAGIAN RAPOR*
{{sekolah}} — {{tahun_ajaran}}

Yth. Bapak/Ibu Orang Tua/Wali Murid,

Pembagian rapor hasil belajar akan dilaksanakan pada:

🗓 Hari/Tanggal : {{hari}}, {{tanggal}}
⏰ Waktu : {{waktu}}
📍 Tempat : {{tempat}}
👤 Diterima oleh : Orang Tua/Wali

Mohon hadir tepat waktu dan membawa kartu identitas. Rapor tidak dapat diwakilkan tanpa pemberitahuan sebelumnya.

Terima kasih atas kerja samanya. 🙏`,
  },
  {
    name: 'Pengumuman Kelulusan',
    category: 'Akademik',
    builtIn: true,
    body: `*PENGUMUMAN KELULUSAN*
{{sekolah}} — {{tahun_ajaran}}

Yth. Murid dan Orang Tua/Wali kelas {{kelas}},

Berdasarkan hasil penilaian akhir, kelulusan murid akan diumumkan pada:

🗓 Hari/Tanggal : {{hari}}, {{tanggal}}
⏰ Waktu : {{waktu}}
📍 Tempat : {{tempat}}
🔗 Informasi : {{tautan}}

Mohon hadir tepat waktu. Keputusan kelulusan bersifat final dan tidak dapat diubah.

Terima kasih. 🙏`,
  },
  {
    name: 'Pemberitahuan Libur Nasional',
    category: 'Libur',
    builtIn: true,
    body: `*PEMBERITAHUAN LIBUR*
{{sekolah}}

Yth. Bapak/Ibu Orang Tua/Wali Murid,

Sehubungan dengan {{acara}}, kegiatan belajar mengajar diliburkan pada:

🗓 Tanggal : {{tanggal}}
🏫 KBM kembali : {{batas}}

{{keterangan}}

Kami mohon orang tua tetap mendampingi anak selama libur dan mengingatkan untuk kembali masuk sekolah tepat waktu.

Terima kasih. 🙏`,
  },
  {
    name: 'Pemberitahuan Libur Semester',
    category: 'Libur',
    builtIn: true,
    body: `*LIBUR SEMESTER*
{{sekolah}} — {{tahun_ajaran}}

Yth. Bapak/Ibu Orang Tua/Wali Murid,

Kegiatan belajar mengajar semester ini berakhir pada {{tanggal}}. Libur semester berlangsung mulai {{tanggal_mulai}} sampai {{tanggal_selesai}}.

🏫 Masuk kembali : {{batas}}

Selama libur, mohon tetap mendampingi anak, menjaga kesehatan, dan mengawasi aktivitasnya.

Terima kasih atas kerja sama Bapak/Ibu sepanjang semester ini. 🙏`,
  },
  {
    name: 'Pengingat Kedisiplinan',
    category: 'Kedisiplinan',
    builtIn: true,
    body: `*PENGINGAT KEDISIPLINAN*
{{sekolah}}

Yth. Bapak/Ibu Orang Tua/Wali Murid,

Demi terciptanya budaya sekolah yang aman dan nyaman, kami mengingatkan kembali beberapa hal:

✅ Hadir tepat waktu, paling lambat pukul {{waktu}}.
✅ Mengenakan seragam lengkap dan rapi.
✅ Membawa perlengkapan belajar sesuai jadwal.
✅ Menggunakan gawai secara bijak dan tidak saat pembelajaran.
✅ Menghormati guru, staf, dan sesama murid.

Mohon dukungan Bapak/Ibu agar ananda tumbuh disiplin dan bertanggung jawab.

Terima kasih. 🙏`,
  },
  {
    name: 'Pengumuman Anti-Perundungan',
    category: 'Kedisiplinan',
    builtIn: true,
    body: `*SEKOLAH BEBAS PERUNDUNGAN*
{{sekolah}}

Halo murid-murid! 👋

Perundungan dalam bentuk apa pun — fisik, ucapan, sosial, maupun daring — tidak boleh terjadi di sekolah kita.

Jika kamu melihat atau mengalami perundungan:
1. Jangan diam. Ceritakan kepada guru, wali kelas, atau orang tua.
2. Simpan bukti jika terjadi di media sosial.
3. Laporkan melalui {{kontak}}.

Kita jaga bersama sekolah yang aman, nyaman, dan saling menghargai. 💙

*Kepala {{sekolah}}*`,
  },
  {
    name: 'Screening Kesehatan',
    category: 'Kesehatan',
    builtIn: true,
    body: `*PEMERIKSAAN KESEHATAN*
{{sekolah}}

Yth. Bapak/Ibu Orang Tua/Wali Murid,

Sekolah akan melaksanakan pemeriksaan kesehatan bekerja sama dengan {{instansi}}.

🗓 Hari/Tanggal : {{hari}}, {{tanggal}}
⏰ Waktu : {{waktu}}
📍 Tempat : {{tempat}}
🩺 Jenis pemeriksaan : {{keterangan}}

Mohon memastikan ananda dalam keadaan sehat dan sarapan sebelum pemeriksaan. Hasil pemeriksaan akan disampaikan secara terbatas kepada orang tua.

Terima kasih. 🙏`,
  },
  {
    name: 'Pengingat Administrasi',
    category: 'Administrasi',
    builtIn: true,
    body: `*PENGINGAT ADMINISTRASI*
{{sekolah}}

Yth. Bapak/Ibu Orang Tua/Wali Murid,

Kami mengingatkan beberapa administrasi yang perlu diselesaikan:

📌 {{keterangan}}
🗓 Batas waktu : {{batas}}
📍 Layanan : {{tempat}}
⏰ Jam layanan : {{waktu}}

Pembayaran atau penyerahan dokumen hanya dilakukan melalui saluran resmi sekolah. Mohon tidak bertransaksi melalui pihak yang tidak ditunjuk.

Terima kasih atas kerja samanya. 🙏`,
  },
  {
    name: 'Pemberitahuan Uang Kegiatan',
    category: 'Administrasi',
    builtIn: true,
    body: `*PEMBERITAHUAN BIAYA KEGIATAN*
{{sekolah}}

Yth. Bapak/Ibu Orang Tua/Wali Murid kelas {{kelas}},

Sehubungan dengan pelaksanaan {{acara}}, kami sampaikan rincian biaya kegiatan:

💰 Nominal : {{jumlah}}
📌 Peruntukan : {{keterangan}}
🗓 Batas pembayaran : {{batas}}
💳 Pembayaran : {{kontak}}

Rincian penggunaan dana akan dilaporkan setelah kegiatan selesai. Kami tidak memungut biaya lain di luar pemberitahuan resmi ini.

Terima kasih. 🙏`,
  },
  {
    name: 'Sekolah Diliburkan karena Darurat',
    category: 'Darurat',
    builtIn: true,
    body: `*PEMBERITAHUAN DARURAT*
{{sekolah}}

Yth. Bapak/Ibu Orang Tua/Wali Murid,

Sehubungan dengan {{acara}}, kegiatan belajar mengajar pada {{tanggal}} diliburkan sementara demi keselamatan seluruh murid dan warga sekolah.

🏫 KBM kembali : {{batas}}
📞 Informasi : {{kontak}}

Mohon tetap berada di rumah, mengikuti informasi resmi sekolah, dan tidak menyebarkan berita yang belum terverifikasi.

Terima kasih atas pengertian dan kerja samanya. 🙏
*Kepala {{sekolah}}*`,
  },
];
