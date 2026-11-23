export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
}
/**
 * Ubah nilai tanggal menjadi Date tanpa pergeseran zona waktu.
 * String 'YYYY-MM-DD' dibaca sebagai tanggal lokal, bukan UTC.
 */
export function parseDateValue(d) {
  if (d === null || d === undefined || d === '') return null;
  if (d instanceof Date) return isNaN(d) ? null : d;
  if (typeof d === 'number') return new Date(d);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d));
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const parsed = new Date(d);
  return isNaN(parsed) ? null : parsed;
}

/** Tahun ajaran berjalan (mulai Juli), mis. '2026/2027'. */
export function currentAcademicYear(date = new Date()) {
  const d = parseDateValue(date) || new Date();
  const y = d.getFullYear();
  return d.getMonth() >= 6 ? `${y}/${y + 1}` : `${y - 1}/${y}`;
}

/** Format Date lokal menjadi 'YYYY-MM-DD' (bukan UTC). */
export function toISODate(d = new Date()) {
  const date = parseDateValue(d) || new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fmtDate(d) {
  if (!d) return '-';
  const date = parseDateValue(d);
  if (!date) return String(d);
  try {
    return date.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' });
  } catch { return String(d); }
}
export function today() {
  return toISODate(new Date());
}
export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ''; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export function toCSV(headers, rows) {
  const escape = v => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  return [headers, ...rows].map(r => r.map(escape).join(',')).join('\r\n');
}

export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
