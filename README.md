# Admira

Ruang kerja kepala sekolah: administrasi persuratan, disposisi, rapat, tugas,
kepegawaian, dan data siswa — berjalan sepenuhnya di perangkat pengguna.

Tidak ada server dan tidak ada akun. Seluruh data disimpan di IndexedDB browser,
sehingga aplikasi tetap bisa dipakai offline setelah dibuka sekali.

## Menjalankan

Tidak ada proses build maupun dependensi npm. Cukup sajikan folder ini lewat HTTP
(service worker membutuhkan `localhost` atau HTTPS).

```bash
python3 -m http.server 8000
# buka http://localhost:8000
```

Pada kunjungan pertama, isi formulir workspace (nama sekolah, NPSN, kepala sekolah).
Setelah itu aplikasi mendaftarkan service worker dan bisa dipasang sebagai PWA.

## Fitur

- **Surat masuk/keluar** — pencarian, sifat surat, lampiran, disposisi (khusus surat masuk),
  dan cetak A4 dengan kop sekolah, dua logo, pilihan TTD/cap.
- **Template surat** — 15 format surat dinas (undangan, surat tugas, keterangan siswa/lulus/pindah,
  panggilan orang tua, permohonan izin, pemberitahuan, edaran, pengantar, rekomendasi, narasumber,
  dan SPTB). Setiap template dilengkapi rujukan dasar hukum; variabel `{{...}}` diisi otomatis dari
  profil sekolah, data form, dan data siswa.
- **Pengumuman WA** — 16 template pengumuman grup (rapat, kegiatan, akademik, libur, kedisiplinan,
  kesehatan, administrasi, darurat). Isi variabel, lihat pratinjau, lalu salin ke WhatsApp; template
  sendiri juga bisa ditambah, diubah, dan dihapus.
- **Rapat & tugas** — CRUD lengkap, status tugas, dan tautan tugas ke rapat.
- **Kepegawaian & siswa** — CRUD, wali kelas, serta impor/ekspor CSV siswa.
- **Laporan** — rekap surat, rapat, dan tugas per periode + unduh CSV.
- **Backup/restore** — file `.admira` (zip berisi `data.json` dan lampiran).

## Struktur

```
index.html          kerangka halaman
app.js              boot, onboarding, shell, router hash, dashboard
db.js               skema Dexie, migrasi, seeding template, helper data
templates.js        pustaka template surat dinas (dasar hukum) + pengumuman WA
lib.js              util umum (escape, tanggal lokal, CSV, unduh)
lib-print.js        generator HTML surat untuk dicetak
lib-icons.js        render ikon Lucide
lib-toast.js        notifikasi
lib-confirm.js      dialog konfirmasi
pages/              satu modul per halaman (dimuat dinamis)
styles.css          seluruh gaya aplikasi
sw.js               service worker (precache aset + modul CDN)
manifest.webmanifest
```

## Catatan pengembangan

- Modul pihak ketiga diimpor langsung dari CDN (Dexie, JSZip, Lucide) dan ikut
  di-precache. Ubah daftar `CDN` di `sw.js` bila versi dinaikkan.
- **Setiap kali aset diubah, naikkan `CACHE` di `sw.js`** agar pengguna menerima
  versi baru; aset lama dihapus saat aktivasi.
- Data lokal tidak terenkripsi. Backup berisi data pribadi siswa dan gambar
  tanda tangan/cap, jadi simpan file backup di tempat yang aman.
