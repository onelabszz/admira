// Pembaca Rapor Pendidikan Kemdikbud (unduhan PBD .xlsx) untuk E-KSP.
// Mengubah enam sheet unduhan menjadi satu objek terstruktur per tahun:
// indikator, ringkasan aspek, temuan kuning/merah, akar masalah, dan
// rekomendasi prioritas yang siap dipakai generator KSP.

import JSZip from 'https://esm.sh/jszip@3.10.1';
import { getSetting, setSetting } from './db.js';

const SHEET_LAPORAN = '2. LAPORAN RAPOR';
const SHEET_SEMUA = '2.1 REKOM. KESELURUHAN';
const SHEET_PRIORITAS = '2.2 REKOM. PRIORITAS';

const clean = v => String(v ?? '').replace(/\s+/g, ' ').trim();

function decodeXml(s) {
  return String(s ?? '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function attr(tag, name) {
  const m = String(tag).match(new RegExp(`\\b${name}="([^"]*)"`));
  return m ? m[1] : '';
}

function colIndex(ref) {
  const m = String(ref || '').match(/^([A-Z]+)/i);
  if (!m) return -1;
  let n = 0;
  for (const ch of m[1].toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

function parseSharedStrings(xml) {
  const out = [];
  for (const si of String(xml).matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)) {
    out.push([...si[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)]
      .map(t => decodeXml(t[1])).join(''));
  }
  return out;
}

/** Baris worksheet → array jarang: rows[nomorBaris][indexKolom]. */
function parseSheet(xml, shared) {
  const rows = [];
  for (const row of String(xml).matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
    const no = Number(attr(row[1], 'r')) || 0;
    if (!no) continue;
    const cells = [];
    for (const cell of row[2].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
      const idx = colIndex(attr(cell[1], 'r'));
      if (idx < 0) continue;
      const type = attr(cell[1], 't');
      const value = (cell[2].match(/<v>([\s\S]*?)<\/v>/) || [])[1];
      let text = '';
      if (type === 's') text = shared[Number(value)] || '';
      else if (type === 'inlineStr') {
        text = [...cell[2].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)]
          .map(t => decodeXml(t[1])).join('');
      } else text = decodeXml(value || '');
      cells[idx] = String(text);
    }
    rows[no] = cells;
  }
  return rows;
}

async function readXml(zip, path) {
  const file = zip.file(path);
  return file ? file.async('string') : '';
}

async function sheetPaths(zip) {
  const wb = await readXml(zip, 'xl/workbook.xml');
  const rels = await readXml(zip, 'xl/_rels/workbook.xml.rels');
  const targets = {};
  for (const rel of rels.matchAll(/<Relationship\b([^>]*)>/g)) {
    const id = attr(rel[1], 'Id');
    const target = attr(rel[1], 'Target')
      .replace(/^\/?xl\//, '').replace(/^\.\//, '');
    if (id && target) targets[id] = `xl/${target}`;
  }
  const paths = {};
  for (const sh of wb.matchAll(/<sheet\b([^>]*)>/g)) {
    const name = decodeXml(attr(sh[1], 'name'));
    const id = attr(sh[1], 'r:id');
    if (name && targets[id]) paths[name] = targets[id];
  }
  return paths;
}

function toNum(v) {
  const s = String(v ?? '').trim();
  if (!s || /tidak tersedia|data belum|belum tersedia/i.test(s)) return null;
  const normalized = s.replace(/\./g, '').replace(',', '.');
  const m = normalized.match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

function levelOf(capaian, skorTeks) {
  const m = clean(capaian).match(/^(Baik|Sedang|Kurang)/i);
  if (m) return m[1][0].toUpperCase() + m[1].slice(1).toLowerCase();
  const n = toNum(skorTeks);
  if (n === null) return 'Tidak Tersedia';
  return n >= 76 ? 'Baik' : n >= 61 ? 'Sedang' : 'Kurang';
}

function statusOf(level) {
  if (/kurang/i.test(level)) return 'merah';
  if (/sedang/i.test(level)) return 'kuning';
  if (/baik/i.test(level)) return 'hijau';
  return 'abu';
}

function dataRows(rows, headerText = 'No') {
  const start = rows.findIndex(r => clean(r?.[0]) === headerText);
  if (start < 0) return [];
  return rows.slice(start + 1).filter(r => r && r.some(v => clean(v)));
}

function parseIndicators(rows) {
  return dataRows(rows).map((r, i) => {
    const code = clean(r[0]);
    if (!/^[A-Z]\.\d+(\.[A-Za-z0-9]+)*$/.test(code)) return null;
    const rawName = String(r[1] || '').trim();
    const parts = rawName.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const capaian = clean(r[2]);
    const skorTeks = clean(r[3]);
    const level = levelOf(capaian, skorTeks);
    const skor = toNum(skorTeks);
    // D.19 (Tujuh Kebiasaan) memakai skala 0–10; naikkan ke 0–100 agar
    // perbandingan antarindikator pada tabel temuan tetap adil.
    const skor100 = skor !== null && !/%/.test(capaian) && skor <= 10
      ? Math.round(skor * 10 * 100) / 100 : skor;
    return {
      no: i + 1,
      code,
      topLevel: /^[A-Z]\.\d+$/.test(code),
      name: parts[0] || code,
      deskripsi: parts.slice(1).join(' ').trim(),
      capaian,
      skorTeks,
      skor,
      skor100,
      level,
      status: statusOf(level),
      definisi: clean(r[4]),
      perubahan: clean(r[5]),
      skorSebelumnya: toNum(r[6]),
      peringkatKab: clean(r[7]),
      peringkatNas: clean(r[8]),
      sumber: clean(r[9]),
    };
  }).filter(Boolean);
}

function parseRecommendations(rows) {
  return dataRows(rows).map((r, i) => {
    if (!/^\d+$/.test(clean(r[0]))) return null;
    const capaian = clean(r[2]);
    return {
      no: Number(clean(r[0])),
      urut: i + 1,
      indikator: clean(r[1]),
      capaian,
      skor: toNum(r[3]),
      akarLevel1: clean(r[4]),
      akarLevel2: clean(r[5]),
      benahi: clean(r[6]),
      inspirasi: clean(r[7]),
      referensi: clean(r[8]),
      arkas: clean(r[9]),
    };
  }).filter(Boolean);
}

function makeSummary(indicators, meta) {
  const pick = code => indicators.find(i => i.code === code) || null;
  const view = i => i ? {
    kode: i.code, name: i.name,
    capaianTeks: i.capaian, persen: i.skor !== null && /%/.test(i.capaian) ? i.skor : toNum(i.capaian),
    skor: i.skor, skorTeks: i.skorTeks, level: i.level, status: i.status,
    perubahan: i.perubahan, skorSebelumnya: i.skorSebelumnya,
    peringkatKab: i.peringkatKab, peringkatNas: i.peringkatNas,
  } : null;
  const at = code => view(pick(code));
  return {
    tahun: meta.tahun,
    namaSekolah: meta.namaSekolah,
    diperbarui: meta.diperbarui,
    literasi: at('A.1'),
    literasiSkor: at('A.1.skor'),
    numerasi: at('A.2'),
    numerasiSkor: at('A.2.skor'),
    karakter: at('A.3'),
    kualitasPembelajaran: at('D.1'),
    refleksiGuru: at('D.2'),
    kepemimpinan: at('D.3'),
    iklimKeamanan: at('D.4'),
    kesetaraanGender: at('D.6'),
    kebinekaan: at('D.8'),
    inklusivitas: at('D.10'),
    kesiapsiagaan: at('D.18'),
    kebiasaan: at('D.19'),
    partisipasi: at('E.1'),
    sumberDaya: at('E.2'),
    tikAnggaran: at('E.3'),
    programKebijakan: at('E.5'),
    fasilitas: at('E.7'),
    rombel: at('E.8'),
    pelatihanPTK: at('C.3'),
    kompetensiPTK: at('C.4'),
    kompetensiSosial: at('C.4.2'),
    ketersediaanBuku: at('E.6'),
  };
}

function makeRootCauses(priorities) {
  const counts = new Map();
  for (const p of priorities) {
    const name = clean(p.akarLevel2);
    if (name) counts.set(name, (counts.get(name) || 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

function readMeta(rows, fileName) {
  const first = clean(rows[1]?.[0]);
  const yearMatch = first.match(/TAHUN\s+(\d{4})/i) || fileName.match(/(20\d{2})/);
  const schoolMatch = first.match(/LAPORAN RAPOR PENDIDIKAN\s+(.+?)\s+TAHUN/i);
  const updated = clean(rows[5]?.[9]);
  return {
    tahun: yearMatch ? yearMatch[1] : '',
    namaSekolah: schoolMatch ? clean(schoolMatch[1]) : '',
    diperbarui: updated.replace(/^Laporan diperbarui\s*/i, ''),
  };
}

/** Baca file .xlsx hasil unduhan Rapor Pendidikan menjadi objek laporan. */
export async function parseRaporXlsx(file) {
  const zip = await JSZip.loadAsync(file);
  const paths = await sheetPaths(zip);
  const missing = [SHEET_LAPORAN, SHEET_PRIORITAS].filter(s => !paths[s]);
  if (missing.length) {
    throw new Error(`Bukan unduhan Rapor Pendidikan PBD. Sheet tidak ditemukan: ${missing.join(', ')}`);
  }
  const shared = parseSharedStrings(await readXml(zip, 'xl/sharedStrings.xml'));
  const read = async name => parseSheet(await readXml(zip, paths[name]), shared);

  const [laporan, prioritas, semua] = await Promise.all([
    read(SHEET_LAPORAN),
    read(SHEET_PRIORITAS),
    paths[SHEET_SEMUA] ? read(SHEET_SEMUA) : Promise.resolve([]),
  ]);
  const meta = readMeta(laporan, file?.name || '');
  const indicators = parseIndicators(laporan);
  if (!indicators.length) throw new Error('Sheet Laporan Rapor tidak memuat indikator yang dikenali.');
  const priorities = parseRecommendations(prioritas);
  const recommendations = parseRecommendations(semua);

  const issues = indicators
    .filter(i => i.status === 'merah' || i.status === 'kuning')
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'merah' ? -1 : 1;
      return (a.skor100 ?? 999) - (b.skor100 ?? 999);
    })
    .slice(0, 24);

  return {
    tahun: meta.tahun,
    namaSekolah: meta.namaSekolah,
    diperbarui: meta.diperbarui,
    fileName: file?.name || '',
    importedAt: Date.now(),
    indicators,
    summary: makeSummary(indicators, meta),
    issues,
    priorities,
    recommendations,
    rootCauses: makeRootCauses(priorities),
  };
}

/** Patch field ringkas di Profil Sekolah agar token lama tetap bekerja. */
export function syncRaporToProfile(report) {
  const s = report?.summary || {};
  const persen = v => v?.persen !== null && v?.persen !== undefined ? String(v.persen) : '';
  const nilai = v => v?.skor !== null && v?.skor !== undefined ? String(v.skor) : '';
  const catatan = (report?.issues || [])
    .filter(i => i.status !== 'hijau')
    .slice(0, 3)
    .map(i => `${i.name} (${i.skorTeks || i.capaian}${i.level && i.level !== 'Tidak Tersedia' ? `, ${i.level}` : ''})`);
  return {
    raporTahun: report?.tahun || '',
    raporLiterasi: persen(s.literasi),
    raporNumerasi: persen(s.numerasi),
    raporKarakter: nilai(s.karakter),
    raporLevelLiterasi: s.literasi?.level || '',
    raporLevelNumerasi: s.numerasi?.level || '',
    raporLevelKarakter: s.karakter?.level || '',
    raporCatatan: catatan.length
      ? `Perlu perhatian: ${catatan.join('; ')}.`
      : '',
  };
}

/** Narasi analisis untuk BAB I/BAB IV sebelum disunting pengguna. */
export function raporNarrative(report) {
  const s = report?.summary || {};
  const txt = (v, key = 'skorTeks') => v?.[key] || '-';
  const issues = (report?.issues || []).slice(0, 3)
    .map(i => `${i.name} ${i.skorTeks || i.capaian} (${i.level})`);
  return [
    `Berdasarkan Rapor Pendidikan Kemdikbud Tahun ${report?.tahun || '-'}`,
    `capaian kompetensi minimum literasi ${txt(s.literasi, 'capaianTeks')},`,
    `numerasi ${txt(s.numerasi, 'capaianTeks')},`,
    `dan karakter ${txt(s.karakter, 'skorTeks')}.`,
    issues.length ? `Indikator yang perlu menjadi perhatian antara lain ${issues.join('; ')}.` : '',
    `Analisis akar masalah dan ${report?.priorities?.length || 0} rekomendasi prioritas`,
    `ditindaklanjuti melalui program KSP, RKT, dan RKAS Tahun Ajaran berjalan.`,
  ].filter(Boolean).join(' ');
}

function yearKeys(input) {
  const s = String(input || '').trim();
  const keys = [s];
  const range = s.match(/(\d{4})\s*\/\s*(\d{4})/);
  if (range) keys.push(range[1], range[2]);
  return [...new Set(keys.filter(Boolean))];
}

function reportYearFromInput(input) {
  const s = String(input || '').trim();
  const range = s.match(/(\d{4})\s*\/\s*(\d{4})/);
  return range ? range[1] : (s.match(/20\d{2}/)?.[0] || '');
}

/** Ambil laporan untuk tahun ajaran aktif maupun tahun asesmen. */
export async function loadRaporReport(year) {
  const key = String(year || '').trim();
  if (!key) return null;
  const linked = await getSetting(`ksp_rapor_link_${key}`, null);
  // String kosong berarti pengguna sengaja melepaskan laporan dari tahun ini.
  if (linked === '') return null;
  const candidates = linked ? [linked] : yearKeys(key);

  for (const candidate of candidates) {
    const report = await getSetting(`ksp_rapor_${candidate}`, null);
    if (report) return report;
  }
  return null;
}

export async function saveRaporReport(report, year) {
  const assessmentYear = String(report?.tahun || reportYearFromInput(year) || '').trim();
  if (!assessmentYear) throw new Error('Tahun Rapor Pendidikan tidak diketahui.');
  const data = { ...report, tahun: assessmentYear };
  await setSetting(`ksp_rapor_${assessmentYear}`, data);

  const academic = String(year || '').trim();
  if (academic) await setSetting(`ksp_rapor_link_${academic}`, assessmentYear);
  await setSetting(`ksp_rapor_link_${assessmentYear}`, assessmentYear);

  const years = (await getSetting('ksp_rapor_years', [])) || [];
  if (!years.includes(assessmentYear)) {
    await setSetting('ksp_rapor_years', [...years, assessmentYear].sort().reverse());
  }
  return data;
}

/** Daftar tahun laporan yang pernah diimpor. */
export async function listRaporYears() {
  const years = await getSetting('ksp_rapor_years', []);
  return Array.isArray(years) ? years : [];
}

/** Pakai laporan tahun tertentu untuk tahun ajaran yang diminta. */
export async function linkRaporReport(year, assessmentYear) {
  const academic = String(year || '').trim();
  const target = String(assessmentYear || '').trim();
  if (!academic || !target) return null;
  await setSetting(`ksp_rapor_link_${academic}`, target);
  return loadRaporReport(academic);
}

/** Lepaskan tautan laporan untuk tahun ajaran/asesmen yang diminta. */
export async function clearRaporReport(year) {
  const key = String(year || '').trim();
  if (key) await setSetting(`ksp_rapor_link_${key}`, '');
}
