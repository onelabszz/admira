# 📄 Template JSON Universal (TKA Studio & TKA Local Host)

Berikut adalah **Template JSON v1.1** yang sudah 100% patuh pada skema TKA Studio dan TKA Local Host. Template ini mencakup **semua tipe soal** (PG, MCMA, B/S), **teks wacana**, dan **dukungan gambar**.

Anda bisa menyimpan teks di bawah ini sebagai file `contoh-paket.json`, atau langsung meng-copy-nya ke ChatGPT/Gemini untuk meminta AI mengubah dokumen Anda ke format ini.

---

### 📋 Salin Template Ini (Copy-Paste)

```json
{
  "version": "1.1",
  "id": "matematika-kelas-6-pecahan",
  "judul": "Latihan Soal Pecahan Kelas 6",
  "mapel": "Matematika",
  "durasiMenit": 30,
  "acakMode": "per-tipe",
  "latihanMandiri": true,
  "wacana": "Ibu memiliki 3 buah kue ulang tahun. Setiap kue dipotong menjadi 4 bagian yang sama besar. Ibu memberikan 2 potong kue kepada Adik dan 3 potong kue kepada Kakak.",
  "wacana_judul": "Cerita Kue Ulang Tahun",
  "soal": [
    {
      "id": "s1",
      "tipe": "pg",
      "q": "Berapa total potongan kue yang diberikan Ibu kepada Adik dan Kakak?",
      "img": "kue-pecahan.png",
      "img_ref": "kue ulang tahun dipotong",
      "img_caption": "Ilustrasi kue ulang tahun",
      "options": [
        "5 potong",
        "6 potong",
        "7 potong",
        "8 potong"
      ],
      "key": 0,
      "pembahasan": "Adik mendapat 2 potong, Kakak mendapat 3 potong. Total = 2 + 3 = 5 potong."
    },
    {
      "id": "s2",
      "tipe": "mcma",
      "q": "Manakah pernyataan berikut yang BENAR mengenai kue tersebut?",
      "options": [
        "Total seluruh potongan kue ada 12.",
        "Sisa kue yang tidak diberikan ada 7 potong.",
        "Kakak mendapat lebih banyak kue dari pada Adik.",
        "Setiap anak mendapat 1 kue utuh."
      ],
      "key": [0, 1, 2],
      "pembahasan": "Total kue = 3 x 4 = 12 potong (Benar). Sisa = 12 - 5 = 7 potong (Benar). Kakak 3, Adik 2 (Benar)."
    },
    {
      "id": "s3",
      "tipe": "bs",
      "q": "Tentukan Benar atau Salah untuk setiap pernyataan berikut!",
      "pernyataan": [
        {
          "teks": "Ibu memotong kue menjadi 4 bagian sama besar.",
          "key": true
        },
        {
          "teks": "Sisa kue Ibu sekarang ada 8 potong.",
          "key": false
        },
        {
          "teks": "Adik mendapatkan bagian kue lebih banyak dari Kakak.",
          "key": false
        }
      ],
      "pembahasan": "Pernyataan 1 Benar. Pernyataan 2 Salah (harusnya 7). Pernyataan 3 Salah (Adik 2, Kakak 3)."
    }
  ]
}
```

---

### 📖 Panduan Mengisi Field (Sangat Penting)

#### 1. Level Paket (Atas)
*   `id`: Wajib huruf kecil, angka, dan strip (`-`). **Tanpa spasi.** Ini akan menjadi nama file saat di-download. (Contoh: `matematika-kelas-6`).
*   `mapel`: Nama mata pelajaran (contoh: `Matematika`, `Bahasa Indonesia`).
*   `acakMode`: Pilihan: `"per-tipe"` (acak berdasarkan tipe), `"full"` (acak semua), atau `"none"` (tidak diacak).
*   `wacana` & `wacana_judul`: **Hapus jika tidak ada teks bacaan panjang.** Jika ada, ini akan muncul sebagai tombol "Buka Wacana" di TKA Player.

#### 2. Tipe Soal `pg` (Pilihan Ganda)
*   `options`: Isi dengan 2 sampai 4 pilihan. (Jangan pakai huruf A, B, C, D di depannya, karena TKA Studio akan menambahkan hurufnya otomatis).
*   `key`: **Angka indeks (dimulai dari 0)**.
    *   `0` = Pilihan Pertama (A)
    *   `1` = Pilihan Kedua (B)
    *   `2` = Pilihan Ketiga (C)
    *   `3` = Pilihan Keempat (D)

#### 3. Tipe Soal `mcma` (Pilihan Ganda Kompleks)
*   `key`: Harus berupa **Array** (kurung siku), minimal 2 jawaban benar, dan harus berurutan dari kecil ke besar.
    *   Contoh: Jika jawaban benar adalah A, C, dan D, maka tulis `[0, 2, 3]`.

#### 4. Tipe Soal `bs` (Benar/Salah)
*   `pernyataan`: Harus berupa array yang berisi objek `{ "teks": "...", "key": true/false }`.
*   `key`: Harus **Boolean** (`true` untuk Benar, `false` untuk Salah). Bukan teks "B" atau "S".

#### 5. Gambar (`img`, `img_data`, `img_ref`)
*   Jika soal **tidak ada gambar**, hapus saja baris `img`, `img_ref`, dan `img_caption`.
*   `img`: Nama file (misal `segitiga.png`). Ini untuk TKA Local Host.
*   `img_data`: Biarkan kosong (atau hilangkan). Field ini akan diisi otomatis oleh TKA Studio saat Anda meng-upload gambar di menu Edit Soal atau Image Tool.
*   `img_ref`: Kata kunci pencarian gambar (opsional).

---

### 🤖 Prompt AI untuk Mengubah Dokumen Word/PDF ke JSON Ini

Jika Anda punya 50 soal di Microsoft Word dan ingin mengubahnya otomatis, gunakan prompt ini di ChatGPT/Gemini/Claude:

> Saya punya dokumen soal ujian. Tolong ubah soal-soal ini menjadi format JSON persis seperti template di bawah ini. 
> 
> Aturan:
> 1. Untuk PG, `key` adalah angka 0-3 (0=A, 1=B, 2=C, 3=D).
> 2. Untuk MCMA, `key` adalah array angka yang diurutkan (misal `[0, 2]`).
> 3. Untuk B/S, gunakan array `pernyataan` dengan `key` boolean (true/false).
> 4. Jangan berikan teks penjelasan apapun, HANYA berikan kode blok JSON yang valid.
> 
> Template JSON:
> [TEMPLATE JSON DI ATAS]
> 
> Berikut adalah dokumen soal saya:
> [Lampiran]

---

### 🚀 Cara Menggunakan Template Ini
1. Simpan sebagai file `.json` (misal `paket-soal.json`).
2. Buka **TKA Studio** -> menu **Mode Siswa** (`/#/play`).
3. Upload file `.json` tersebut.
4. Soal akan otomatis di-parse, divalidasi, dan siap dikerjakan.

Dengan template ini, Anda tidak akan pernah terkena *error* format, baik saat diuji di TKA Studio maupun saat diimpor ke TKA Local Host oleh guru di sekolah.
