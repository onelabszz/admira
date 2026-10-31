/**
 * TKA Studio — lib/csv-export.js
 * © 2026 Ekwan Nugroho — Wonogiri
 */

function escapeCSV(val) {
  const str = String(val || '').trim();
  // Bungkus dengan kutip ganda jika mengandung pemisah, kutip, atau baris baru
  if (str.includes(';') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

export function downloadCSV(paket) {
  const header = [
    'no', 'tipe', 'soal', 'img',
    'opsi_a', 'opsi_b', 'opsi_c', 'opsi_d',
    'kunci', 'pembahasan'
  ];
  const rows = [header];
  
  paket.soal.forEach((s, i) => {
    const row = [
      i + 1,
      s.tipe.toUpperCase(),
      s.q,
      s.img || '',
    ];
    
    // Isi Opsi
    if (s.tipe === 'pg' || s.tipe === 'mcma') {
      for (let j = 0; j < 4; j++) {
        row.push(s.options[j] || '');
      }
      if (s.tipe === 'pg') {
        row.push('ABCD' [s.key]);
      } else {
        row.push(s.key.map(k => 'ABCD' [k]).join(','));
      }
    } else if (s.tipe === 'bs') {
      for (let j = 0; j < 4; j++) {
        row.push(s.pernyataan[j] ? s.pernyataan[j].teks : '');
      }
      const bsKeys = [];
      s.pernyataan.forEach(p => bsKeys.push(p.key ? 'B' : 'S'));
      row.push(bsKeys.join(','));
    }
    
    row.push(s.pembahasan || '');
    rows.push(row);
  });
  
  // Gabungkan dengan pemisah titik koma (standar Excel Indonesia)
  const csvContent = "sep=;\n" + rows.map(r => r.map(escapeCSV).join(';')).join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${paket.id}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}