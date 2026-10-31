/**
 * TKA Studio — lib/prompt-template.js
 * © 2026 Ekwan Nugroho — Wonogiri
 * All rights reserved.
 *
 * Membangun prompt siap-copy untuk ChatGPT / Gemini / Claude.
 * Output prompt menghasilkan JSON v1.0 (kontrak TKA Local Host).
 */

export function buildPrompt(cfg) {
  const {
    mapel = 'Matematika',
      kelas = '6 SD',
      topik = '',
      tingkat = 'sedang',
      pg = 0,
      mcma = 0,
      bs = 0,
      instruksiTambahan = '',
      durasi = 30,
      latihanMandiri = true,
      sertakanGambar = false,
    } = cfg;
    
    const aturanGambar = sertakanGambar ? `
=== ATURAN SOAL BERGAMBAR ===
Sertakan sekitar 20% soal yang membutuhkan gambar. Untuk soal pilihan visual (seperti geometri, diagram, peta), gunakan SATU gambar gabungan berisi 4 opsi berlabel A-D. Isi field "options" dengan ["A", "B", "C", "D"].
- Tulis "Perhatikan gambar berikut..." di awal soal.
- Isi field "img" dengan nama file deskriptif (lowercase, pakai minus, akhiran .png). Contoh: "peta-indonesia.png"
- JANGAN mengarang isi gambar secara detail di pembahasan. Pembahasan harus mengandalkan logika.
` : `
=== ATURAN SOAL BERGAMBAR ===
JANGAN hasilkan soal yang membutuhkan gambar. Fokus soal teks yang bisa dijawab siswa tanpa bantuan visual.
`;
  
  const total = pg + mcma + bs;
  if (total === 0) {
    throw new Error('Jumlah soal harus lebih dari 0');
  }
  
  const slug = topik ?
    topik.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) :
    'paket-soal';
  
  const tahun = new Date().getFullYear();
  const komposisi = [];
  if (pg > 0) komposisi.push(`- ${pg} soal PG (Pilihan Ganda, 1 jawaban benar)`);
  if (mcma > 0) komposisi.push(`- ${mcma} soal MCMA (Pilihan Ganda Kompleks, 2–3 jawaban benar)`);
  if (bs > 0) komposisi.push(`- ${bs} soal B/S (Benar/Salah, 2–4 pernyataan per soal)`);
  
  const instruksi = instruksiTambahan.trim() ?
    `\nINSTRUKSI TAMBAHAN DARI GURU:\n${instruksiTambahan.trim()}\n` :
    '';
  
  return `Anda adalah asisten pembuat soal untuk guru Indonesia. Tugas Anda: hasilkan soal ujian berkualitas dalam format JSON yang ketat. Jangan tambahkan penjelasan di luar JSON.

=== SPESIFIKASI SOAL ===

Mata Pelajaran : ${mapel}
Kelas          : ${kelas}
Topik          : ${topik || '(tidak disebutkan, gunakan topik umum sesuai mapel dan kelas)'}
Tingkat        : ${tingkat}

Komposisi soal:
  $ { komposisi.join('\n') }
Total: $ { total } soal
$ { instruksi }
$ { aturanGambar }
=== FORMAT OUTPUT WAJIB ===

Hasilkan HANYA SATU objek JSON valid. Tanpa markdown code fence, tanpa teks pembuka, tanpa teks penutup. Karakter pertama output HARUS "{" dan karakter terakhir HARUS "}".

Struktur paket:
{
  "version": "1.0",
  "id": "${slug}-${tahun}",
  "judul": "${mapel} - ${topik || 'Paket Soal'} Kelas ${kelas}",
  "mapel": "${mapel}",
  "durasiMenit": ${durasi},
  "acakMode": "per-tipe",
  "latihanMandiri": ${latihanMandiri},
  "soal": [ ... array soal ... ]
}

=== ATURAN PER TIPE SOAL ===

Tipe "pg" (Pilihan Ganda, 1 jawaban benar):
{
  "id": "s1",
  "tipe": "pg",
  "q": "<teks pertanyaan>",
  "options": ["<A>", "<B>", "<C>", "<D>"],
  "key": <integer 0–3, indeks jawaban benar>,
  "pembahasan": "<penjelasan 1–2 kalimat>"
}

Tipe "mcma" (Pilihan Ganda Kompleks, 2–3 jawaban benar):
{
  "id": "s2",
  "tipe": "mcma",
  "q": "<teks pertanyaan>",
  "options": ["<A>", "<B>", "<C>", "<D>"],
  "key": [<integer>, <integer>],
  "pembahasan": "<penjelasan 1–2 kalimat>"
}

Tipe "bs" (Benar/Salah):
{
  "id": "s3",
  "tipe": "bs",
  "q": "<teks pertanyaan pengantar>",
  "pernyataan": [
    { "teks": "<pernyataan 1>", "key": true },
    { "teks": "<pernyataan 2>", "key": false }
  ],
  "pembahasan": "<penjelasan 1–2 kalimat>"
}

=== ATURAN TEKNIS (WAJIB) ===

1. Output dimulai "{" dan diakhiri "}", tanpa teks lain
2. JANGAN pakai markdown code fence (tiga backtick)
3. JANGAN trailing comma, JANGAN komentar di JSON
4. id paket: huruf kecil, angka, minus saja
5. id soal: s1, s2, s3, ... (unik dan berurutan)
6. Setiap soal WAJIB punya "pembahasan" 1–2 kalimat
7. "key" PG: integer 0–3 (0=opsi A, 1=B, 2=C, 3=D) — BUKAN huruf
8. "key" MCMA: array integer urut menaik, minimal 2 item (contoh: [0, 2, 3])
9. "key" BS: boolean true/false — BUKAN string "B"/"S"
10. "options" PG/MCMA: tepat 4 item (A, B, C, D)
11. "pernyataan" BS: 2–4 item
12. Distribusikan kunci jawaban PG secara merata (jangan mayoritas A atau D)
13. Variasikan panjang opsi (jangan ada opsi yang mencolok panjang/pendek)
14. Hindari "semua benar" atau "semua salah" sebagai jawaban tunggal
15. Untuk MCMA, sertakan minimal 1 distraktor yang masuk akal

=== CONTOH MINIMAL OUTPUT YANG BENAR ===

{"version":"1.0","id":"contoh-paket-${tahun}","judul":"Contoh Paket","mapel":"Matematika","durasiMenit":30,"acakMode":"per-tipe","latihanMandiri":true,"soal":[{"id":"s1","tipe":"pg","q":"Hasil dari 1/4 + 2/4 adalah...","options":["1/4","2/4","3/4","4/4"],"key":2,"pembahasan":"1/4 + 2/4 = 3/4 karena penyebutnya sama."}]}

=== MULAI ===

Sekarang hasilkan ${total} soal sesuai spesifikasi di atas. Output HANYA JSON, tanpa penjelasan, dimulai "{" dan diakhiri "}".`;
}