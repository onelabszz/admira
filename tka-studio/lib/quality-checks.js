/**
 * TKA Studio — lib/quality-checks.js
 * © 2026 Ekwan Nugroho — Wonogiri
 * All rights reserved.
 */

export function checkQuality(paket) {
  const warnings = [];
  if (!paket || !Array.isArray(paket.soal)) return warnings;

  const pgSoal = paket.soal.filter(function (s) { return s.tipe === 'pg'; });
  if (pgSoal.length >= 5) {
    const count = { 0: 0, 1: 0, 2: 0, 3: 0 };
    pgSoal.forEach(function (s) {
      if (typeof s.key === 'number' && count[s.key] !== undefined) count[s.key]++;
    });
    Object.keys(count).forEach(function (k) {
      const n = count[k];
      const pct = n / pgSoal.length;
      if (pct >= 0.55 && n >= 3) {
        const letter = 'ABCD'[Number(k)];
        warnings.push({
          level: 'paket',
          code: 'key-distribution',
          message: 'Distribusi kunci PG tidak seimbang: ' + n + ' dari ' + pgSoal.length + ' soal (' + Math.round(pct * 100) + '%) jawabannya ' + letter + '. Siswa bisa menebak tanpa paham.',
        });
      }
    });
  }

  const soalBergambar = paket.soal.filter(function(s) { return s.img && String(s.img).trim() !== ''; });
if (soalBergambar.length > 0 && (soalBergambar.length / paket.soal.length) > 0.35) {
  warnings.push({
    level: 'paket',
    code: 'too-many-images',
    message: 'Lebih dari 35% soal membutuhkan gambar (' + soalBergambar.length + ' soal). Pastikan Anda siap menyiapkan file gambarnya.',
  });
}

paket.soal.forEach(function(s, i) {
      const label = 'Soal #' + (i + 1);

    if (s.tipe === 'bs' && Array.isArray(s.pernyataan) && s.pernyataan.length >= 2) {
      const allTrue = s.pernyataan.every(function (p) { return p.key === true; });
      const allFalse = s.pernyataan.every(function (p) { return p.key === false; });
      if (allTrue) {
        warnings.push({
          level: 'soal', index: i, code: 'bs-all-same',
          message: label + ': semua pernyataan B/S berjawaban "Benar". Siswa bisa jawab B semua.',
        });
      } else if (allFalse) {
        warnings.push({
          level: 'soal', index: i, code: 'bs-all-same',
          message: label + ': semua pernyataan B/S berjawaban "Salah". Siswa bisa jawab S semua.',
        });
      }
    }

    if ((s.tipe === 'pg' || s.tipe === 'mcma') && Array.isArray(s.options)) {
      const seen = new Map();
      s.options.forEach(function (o, oi) {
        const key = String(o).toLowerCase().trim();
        if (!key) return;
        if (seen.has(key)) {
          warnings.push({
            level: 'soal', index: i, code: 'duplicate-option',
            message: label + ': opsi ' + 'ABCD'[oi] + ' sama persis dengan opsi ' + 'ABCD'[seen.get(key)] + '.',
          });
        } else {
          seen.set(key, oi);
        }
      });

      // Cek placeholder: hanya jika semua opsi berupa 1 huruf non-angka,
      // dan soal TIDAK bergambar (karena opsi A/B/C/D valid untuk soal bergambar).
      if (!s.img) {
        const allSingleLetters = s.options.length > 0 && s.options.every(function (o) {
          return /^[A-Za-z]$/.test(String(o).trim());
        });
        if (allSingleLetters) {
          warnings.push({
            level: 'soal', index: i, code: 'placeholder-options',
            message: label + ': semua opsi hanya 1 huruf. Kemungkinan AI keliru mengisi label A/B/C/D sebagai teks opsi (bukan jawaban sesungguhnya).',
          });
        }
      }

      if (s.tipe === 'pg' && s.options.length >= 3) {
        const lengths = s.options.map(function (o) { return String(o).length; });
        const sorted = lengths.slice().sort(function (a, b) { return a - b; });
        const median = sorted[Math.floor(sorted.length / 2)];
        if (median > 0) {
          lengths.forEach(function (len, oi) {
            if (len > median * 2.5 && len > 25) {
              warnings.push({
                level: 'soal', index: i, code: 'uneven-option-length',
                message: label + ': opsi ' + 'ABCD'[oi] + ' jauh lebih panjang dari opsi lain — jawaban benar bisa terlalu kelihatan.',
              });
            }
          });
        }
      }
    }

    if (s.pembahasan) {
      const t = String(s.pembahasan).trim();
      if (t.length > 0 && t.length < 15) {
        warnings.push({
          level: 'soal', index: i, code: 'short-explanation',
          message: label + ': pembahasan terlalu singkat ("' + t + '"). Beri penjelasan minimal 1 kalimat.',
        });
      }
    }

    if (s.tipe === 'pg' && /\bkecuali\b/i.test(s.q)) {
      const hasNegation = /\b(bukan|tidak|salah)\b/i.test(s.q);
      if (!hasNegation) {
        warnings.push({
          level: 'soal', index: i, code: 'kecuali-clarity',
          message: label + ': soal memakai kata "kecuali" tapi tidak ada kata "bukan/tidak/salah". Pastikan siswa tidak bingung.',
        });
      }
    }
  });

  return warnings;
}
