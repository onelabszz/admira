/**
 * TKA Studio — lib/tka-schema.js
 * © 2026 Ekwan Nugroho — Wonogiri
 * All rights reserved.
 *
 * Skema, normalisasi, dan ekspor Paket Soal format v1.0
 * (kontrak dengan TKA Local Host).
 *
 * Tanpa dependency eksternal — validasi manual.
 */

// =========================================================
// Constants
// =========================================================

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const TIPE_VALID = ['pg', 'mcma', 'bs'];
export const ACAK_MODES = ['per-tipe', 'full', 'none'];
export const DEFAULT_VERSION = '1.0';
export const DEFAULT_ACAK_MODE = 'per-tipe';
export const DEFAULT_DURASI = 30;

// =========================================================
// Helpers
// =========================================================

export function slugify(str) {
  const s = String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return s || 'paket-soal';
}

function _letterToIndex(letter) {
  return 'ABCD'.indexOf(String(letter || '').toUpperCase().trim());
}

function _normalizeTipe(raw) {
  const t = String(raw || '').toLowerCase().trim();
  if (['pg', 'pilihan ganda', 'single', 'single choice'].includes(t)) return 'pg';
  if (['mcma', 'multi', 'pilihan ganda kompleks', 'multi choice', 'multiple'].includes(t)) return 'mcma';
  if (['bs', 'benar/salah', 'benar-salah', 'benar salah', 'true/false', 'b/s'].includes(t)) return 'bs';
  return null;
}

// =========================================================
// Normalize
// =========================================================

function normalizeSoal(raw, index, warnings, errors) {
  const label = `Soal #${index + 1}`;

  if (!raw || typeof raw !== 'object') {
    errors.push({ level: 'soal', index, message: `${label}: bukan objek` });
    return null;
  }

  const tipe = _normalizeTipe(raw.tipe);
  if (!tipe) {
    errors.push({ level: 'soal', index, message: `${label}: tipe "${raw.tipe}" tidak dikenal` });
    return null;
  }

  const q = String(raw.q ?? raw.soal ?? raw.pertanyaan ?? '').trim();
  if (!q) {
    errors.push({ level: 'soal', index, message: `${label}: teks soal kosong` });
    return null;
  }

  const out = { id: `s${index + 1}`, tipe, q };
  if (raw.img && String(raw.img).trim()) out.img = String(raw.img).trim();
  if (raw.pembahasan && String(raw.pembahasan).trim()) {
    out.pembahasan = String(raw.pembahasan).trim();
  } else {
    warnings.push({ level: 'soal', index, message: `${label}: pembahasan kosong` });
  }

  if (tipe === 'pg' || tipe === 'mcma') {
    const rawOpts = Array.isArray(raw.options) ? raw.options : [];
    if (rawOpts.length < 2 || rawOpts.length > 4) {
      errors.push({
        level: 'soal', index,
        message: `${label}: jumlah opsi harus 2–4, dapat ${rawOpts.length}`,
      });
      return null;
    }
    out.options = rawOpts.map((o) => {
      if (o && typeof o === 'object') return String(o.text ?? o.teks ?? o.label ?? '').trim();
      return String(o ?? '').trim();
    });

    if (out.options.some((o) => !o)) {
      errors.push({ level: 'soal', index, message: `${label}: ada opsi kosong` });
      return null;
    }

    if (tipe === 'pg') {
      let k = raw.key ?? raw.kunci;
      if (typeof k === 'string') {
        const letter = k.trim().toUpperCase();
        if (letter.length === 1 && _letterToIndex(letter) >= 0) {
          const idx = _letterToIndex(letter);
          warnings.push({ level: 'soal', index, message: `${label}: key "${k}" dikonversi ke indeks ${idx}` });
          k = idx;
        } else {
          k = Number(k);
        }
      }
      if (typeof k !== 'number' || !Number.isInteger(k) || k < 0 || k >= out.options.length) {
        errors.push({ level: 'soal', index, message: `${label}: key PG tidak valid ("${raw.key ?? raw.kunci}")` });
        return null;
      }
      out.key = k;
    } else {
      let keys = raw.key ?? raw.kunci;
      if (!Array.isArray(keys)) {
        errors.push({ level: 'soal', index, message: `${label}: key MCMA harus array` });
        return null;
      }
      keys = keys.map((x) => {
        if (typeof x === 'string') {
          const letter = x.trim().toUpperCase();
          if (letter.length === 1 && _letterToIndex(letter) >= 0) return _letterToIndex(letter);
          return Number(x);
        }
        return Number(x);
      });
      const beforeFilter = keys.length;
      keys = keys.filter((n) => Number.isInteger(n) && n >= 0 && n < out.options.length);
      if (keys.length !== beforeFilter) {
        warnings.push({ level: 'soal', index, message: `${label}: ada key MCMA di luar jangkauan, dihapus` });
      }
      keys = [...new Set(keys)].sort((a, b) => a - b);
      if (keys.length < 2) {
        errors.push({ level: 'soal', index, message: `${label}: key MCMA minimal 2 jawaban benar` });
        return null;
      }
      out.key = keys;
    }
  } else {
    // bs
    let list = raw.pernyataan;
    if (!Array.isArray(list)) {
      errors.push({ level: 'soal', index, message: `${label}: pernyataan BS harus array` });
      return null;
    }
    if (list.length < 2 || list.length > 5) {
      errors.push({ level: 'soal', index, message: `${label}: pernyataan BS harus 2–5 item, dapat ${list.length}` });
      return null;
    }
    out.pernyataan = list.map((p, pi) => {
      const teks = String(p?.teks ?? p?.text ?? '').trim();
      let k = p?.key;
      if (typeof k === 'string') {
        const up = k.trim().toUpperCase();
        if (['B', 'BENAR', 'TRUE'].includes(up)) k = true;
        else if (['S', 'SALAH', 'FALSE'].includes(up)) k = false;
      }
      if (typeof k !== 'boolean') {
        warnings.push({
          level: 'soal', index,
          message: `${label} pernyataan ${pi + 1}: key bukan boolean, dianggap "Salah"`,
        });
        k = false;
      }
      return { teks, key: k };
    }).filter((p, pi) => {
      if (!p.teks) {
        warnings.push({
          level: 'soal', index,
          message: `${label}: pernyataan ${pi + 1} kosong, dihapus`,
        });
        return false;
      }
      return true;
    });

    if (out.pernyataan.length < 2) {
      errors.push({ level: 'soal', index, message: `${label}: setelah pembersihan, pernyataan BS < 2` });
      return null;
    }
  }

  return out;
}

/**
 * Normalisasi input mentah ke format v1.0.
 * @returns {{ paket: object|null, warnings: Array, errors: Array }}
 */
export function normalizePaket(raw, opts = {}) {
  const warnings = [];
  const errors = [];

  if (!raw || typeof raw !== 'object') {
    errors.push({ level: 'paket', message: 'Input bukan objek JSON' });
    return { paket: null, warnings, errors };
  }

  const rawSoal = Array.isArray(raw.soal) ? raw.soal : [];
  if (rawSoal.length === 0) {
    errors.push({ level: 'paket', message: 'Tidak ada soal dalam input' });
    return { paket: null, warnings, errors };
  }

  const soal = [];
  rawSoal.forEach((s, i) => {
    const normalized = normalizeSoal(s, i, warnings, errors);
    if (normalized) soal.push(normalized);
  });

  if (soal.length === 0) {
    errors.push({ level: 'paket', message: 'Tidak ada soal yang bisa dipulihkan' });
    return { paket: null, warnings, errors };
  }

  const judul = String(raw.judul ?? raw.title ?? opts.fallbackJudul ?? 'Paket Soal').trim();
  const mapel = String(raw.mapel ?? raw.subject ?? opts.fallbackMapel ?? '-').trim();

  let durasi = Number(raw.durasiMenit ?? raw.duration ?? 0);
  if (!Number.isFinite(durasi) || durasi <= 0) {
    durasi = opts.fallbackDurasi ?? DEFAULT_DURASI;
    warnings.push({ level: 'paket', message: `durasiMenit tidak valid, diganti ${durasi}` });
  }
  durasi = Math.round(durasi);

  let paketId = opts.forcedPaketId || raw.id;
  if (!paketId || typeof paketId !== 'string' || !SLUG_RE.test(paketId)) {
    paketId = slugify(judul);
    warnings.push({ level: 'paket', message: `id paket tidak valid, diganti "${paketId}"` });
  }

  let acakMode = raw.acakMode;
  if (!ACAK_MODES.includes(acakMode)) acakMode = DEFAULT_ACAK_MODE;

  const latihanMandiri = Boolean(raw.latihanMandiri);

  soal.forEach((s, i) => { s.id = `s${i + 1}`; });

  const paket = {
    version: DEFAULT_VERSION,
    id: paketId,
    judul,
    mapel,
    durasiMenit: durasi,
    acakMode,
    latihanMandiri,
    soal,
  };

  return { paket, warnings, errors };
}

// =========================================================
// Validate (manual, tanpa Zod)
// =========================================================

export function validatePaket(paket) {
  const errors = [];

  if (!paket || typeof paket !== 'object') {
    return {
      valid: false,
      errors: [{ level: 'paket', message: 'Bukan objek' }],
      paket: null,
    };
  }

  if (typeof paket.version !== 'string') {
    errors.push({ level: 'paket', path: ['version'], message: 'version harus string' });
  }
  if (typeof paket.id !== 'string' || !SLUG_RE.test(paket.id)) {
    errors.push({ level: 'paket', path: ['id'], message: 'id paket harus slug (huruf kecil, angka, minus)' });
  }
  if (typeof paket.judul !== 'string' || !paket.judul) {
    errors.push({ level: 'paket', path: ['judul'], message: 'judul wajib diisi' });
  }
  if (typeof paket.mapel !== 'string' || !paket.mapel) {
    errors.push({ level: 'paket', path: ['mapel'], message: 'mapel wajib diisi' });
  }
  if (!Number.isInteger(paket.durasiMenit) || paket.durasiMenit <= 0) {
    errors.push({ level: 'paket', path: ['durasiMenit'], message: 'durasiMenit harus bilangan bulat positif' });
  }
  if (!ACAK_MODES.includes(paket.acakMode)) {
    errors.push({ level: 'paket', path: ['acakMode'], message: 'acakMode tidak valid' });
  }
  if (typeof paket.latihanMandiri !== 'boolean') {
    errors.push({ level: 'paket', path: ['latihanMandiri'], message: 'latihanMandiri harus boolean' });
  }

  if (!Array.isArray(paket.soal) || paket.soal.length < 1) {
    errors.push({ level: 'paket', path: ['soal'], message: 'minimal 1 soal' });
  } else {
    const seenIds = new Set();
    paket.soal.forEach((s, i) => {
      const label = `Soal #${i + 1}`;

      if (!s || typeof s !== 'object') {
        errors.push({ level: 'soal', index: i, message: `${label}: bukan objek` });
        return;
      }
      if (typeof s.id !== 'string' || !s.id) {
        errors.push({ level: 'soal', index: i, path: ['id'], message: `${label}: id wajib` });
      } else if (seenIds.has(s.id)) {
        errors.push({ level: 'soal', index: i, path: ['id'], message: `${label}: id duplikat (${s.id})` });
      } else {
        seenIds.add(s.id);
      }
      if (!TIPE_VALID.includes(s.tipe)) {
        errors.push({ level: 'soal', index: i, path: ['tipe'], message: `${label}: tipe tidak valid` });
        return;
      }
      if (typeof s.q !== 'string' || !s.q) {
        errors.push({ level: 'soal', index: i, path: ['q'], message: `${label}: teks soal kosong` });
      }

      if (s.tipe === 'pg' || s.tipe === 'mcma') {
        if (!Array.isArray(s.options) || s.options.length < 2 || s.options.length > 4) {
          errors.push({
            level: 'soal', index: i, path: ['options'],
            message: `${label}: options harus 2–4 item`,
          });
          return;
        }
        if (s.tipe === 'pg') {
          if (!Number.isInteger(s.key) || s.key < 0 || s.key >= s.options.length) {
            errors.push({
              level: 'soal', index: i, path: ['key'],
              message: `${label}: key PG harus integer 0–${s.options.length - 1}`,
            });
          }
        } else {
          if (!Array.isArray(s.key) || s.key.length < 2) {
            errors.push({
              level: 'soal', index: i, path: ['key'],
              message: `${label}: key MCMA harus array minimal 2 item`,
            });
          } else {
            const sorted = [...s.key].sort((a, b) => a - b);
            const isSorted = JSON.stringify(s.key) === JSON.stringify(sorted);
            const isUnique = new Set(s.key).size === s.key.length;
            if (!isSorted) {
              errors.push({
                level: 'soal', index: i, path: ['key'],
                message: `${label}: key MCMA harus urut menaik`,
              });
            }
            if (!isUnique) {
              errors.push({
                level: 'soal', index: i, path: ['key'],
                message: `${label}: key MCMA mengandung duplikat`,
              });
            }
            for (const k of s.key) {
              if (!Number.isInteger(k) || k < 0 || k >= s.options.length) {
                errors.push({
                  level: 'soal', index: i, path: ['key'],
                  message: `${label}: key ${k} di luar jangkauan opsi`,
                });
                break;
              }
            }
          }
        }
      } else if (s.tipe === 'bs') {
        if (!Array.isArray(s.pernyataan) || s.pernyataan.length < 2 || s.pernyataan.length > 5) {
          errors.push({
            level: 'soal', index: i, path: ['pernyataan'],
            message: `${label}: pernyataan BS harus 2–5 item`,
          });
        } else {
          s.pernyataan.forEach((p, pi) => {
            if (!p || typeof p.teks !== 'string' || !p.teks) {
              errors.push({
                level: 'soal', index: i, path: ['pernyataan', pi, 'teks'],
                message: `${label} pernyataan #${pi + 1}: teks kosong`,
              });
            }
            if (typeof p?.key !== 'boolean') {
              errors.push({
                level: 'soal', index: i, path: ['pernyataan', pi, 'key'],
                message: `${label} pernyataan #${pi + 1}: key harus boolean`,
              });
            }
          });
        }
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    paket: errors.length === 0 ? paket : null,
  };
}

// =========================================================
// Export (canonical → Local Host format)
// =========================================================

export function toLocalHostFormat(paket) {
  const { valid, paket: validated, errors } = validatePaket(paket);
  if (!valid) {
    const msg = errors.map((e) => e.message).join('; ');
    throw new Error(`Paket tidak valid saat ekspor: ${msg}`);
  }

  return {
    version: DEFAULT_VERSION,
    id: validated.id,
    judul: validated.judul,
    mapel: validated.mapel,
    durasiMenit: validated.durasiMenit,
    acakMode: validated.acakMode,
    latihanMandiri: validated.latihanMandiri,
    soal: validated.soal.map((s) => {
      const base = { id: s.id, tipe: s.tipe, q: s.q };
      if (s.img) base.img = s.img;
      if (s.tipe === 'bs') {
        base.pernyataan = s.pernyataan;
      } else {
        base.options = s.options;
        if (s.optionImgs) base.optionImgs = s.optionImgs;
        base.key = s.key;
      }
      if (s.pembahasan) base.pembahasan = s.pembahasan;
      return base;
    }),
  };
}

export function downloadPaket(paket) {
  const json = toLocalHostFormat(paket);
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${json.id}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}