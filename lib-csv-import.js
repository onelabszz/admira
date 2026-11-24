// Dialog impor CSV reusable untuk data guru dan siswa.
// Cara pakai:
//   openCsvImport({ dlg, title, headers, sample, required, parseRow,
//                   table, previewColumns, fileName, label })
// `parseRow(get)` menerima pembaca kolom case-insensitive dan mengembalikan objek baris.

import { parseCSV, toCSV, download, esc } from './lib.js';
import { icon } from './lib-icons.js';
import { toast } from './lib-toast.js';
import { confirmDialog } from './lib-confirm.js';

export function openCsvImport({
  dlg,
  title,
  headers,
  sample = [],
  required = [],
  parseRow,
  table,
  previewColumns = [],
  fileName = 'template.csv',
  label = 'data',
  onDone,
}) {
  dlg.innerHTML = `
    <button type="button" class="modal-close" data-close aria-label="Tutup">${icon('X', { size: 18 })}</button>
    <div class="form" style="max-height:88vh;overflow-y:auto">
      <h2>${esc(title)}</h2>
      <p class="muted" style="margin:0 0 14px;line-height:1.6">
        Unduh template CSV, isi sesuai kolom, lalu unggah kembali. Jangan mengubah nama header.
        Kolom wajib: <strong>${required.map(esc).join(', ')}</strong>.
      </p>
      <div class="card" style="background:#F8FAFC;margin-bottom:14px;padding:14px">
        <strong style="font-size:13px">Kolom tersedia:</strong>
        <p class="muted" style="margin:6px 0 0;font-size:12.5px;line-height:1.6">${headers.map(esc).join(' • ')}</p>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn" id="csv-template" type="button">${icon('Download', { size: 16 })} Unduh Template CSV</button>
        <label class="btn primary" style="cursor:pointer">
          ${icon('Upload', { size: 16 })} Pilih File CSV
          <input type="file" id="csv-file" accept=".csv,text/csv" hidden>
        </label>
      </div>
      <div id="csv-preview" style="margin-top:18px"></div>
      <div class="form-actions"><button type="button" class="btn" data-close>Batal</button></div>
    </div>
  `;
  dlg.showModal();
  dlg.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => dlg.close()));

  dlg.querySelector('#csv-template').addEventListener('click', () => {
    const csv = '\uFEFF' + toCSV(headers, sample);
    download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), fileName);
    toast.success('Template CSV diunduh.');
  });

  dlg.querySelector('#csv-file').addEventListener('change', async e => {
    const file = e.target.files?.[0];
    if (!file) return;
    let text = await file.text();
    text = text.replace(/^\uFEFF/, '');
    const rows = parseCSV(text);
    if (!rows.length) { toast.error('File kosong.'); return; }

    const header = rows[0].map(h => h.trim());
    const dataRows = rows.slice(1).filter(r => r.some(c => String(c).trim()));
    const idx = {};
    header.forEach((h, i) => { idx[h.toLowerCase()] = i; });

    const need = required.map(h => h.toLowerCase());
    const missing = need.filter(k => !(k in idx));
    if (missing.length) {
      toast.error(`Kolom wajib hilang: ${missing.join(', ')}`);
      return;
    }

    const get = row => key => {
      const k = String(key).toLowerCase();
      const i = idx[k];
      return i === undefined ? '' : String(row[i] ?? '').trim();
    };

    const parsed = [];
    const errors = [];
    for (let i = 0; i < dataRows.length; i++) {
      try {
        const item = parseRow(get(dataRows[i]));
        if (!item) {
          const first = need[0] || Object.keys(idx)[0];
          errors.push(`Baris ${i + 2}: ${first} kosong`);
          continue;
        }
        parsed.push(item);
      } catch (err) {
        errors.push(`Baris ${i + 2}: ${err.message}`);
      }
    }

    const preview = dlg.querySelector('#csv-preview');
    if (!parsed.length) {
      preview.innerHTML = `<div class="card" style="border-left:4px solid var(--danger)">
        <strong class="error">Tidak ada baris valid.</strong>
        ${errors.length ? `<p class="muted" style="font-size:12.5px;margin-top:6px">${errors.slice(0, 5).map(esc).join('<br>')}</p>` : ''}
      </div>`;
      return;
    }

    const cols = previewColumns.length
      ? previewColumns
      : headers.slice(0, 4).map(h => [h, h.toLowerCase().replace(/\s+/g, '')]);

    preview.innerHTML = `
      <div class="card" style="padding:14px;margin-bottom:10px">
        <strong>${esc(file.name)}</strong><br>
        <span class="muted" style="font-size:13px">
          ${parsed.length} baris valid
          ${errors.length ? ` • <span class="error">${errors.length} baris tidak valid</span>` : ''}
        </span>
      </div>
      <div class="table-responsive" style="max-height:250px;overflow-y:auto;border:1px solid var(--border);border-radius:10px">
        <table class="table" style="font-size:12.5px">
          <thead><tr>${cols.map(c => `<th>${esc(c[0])}</th>`).join('')}</tr></thead>
          <tbody>${parsed.slice(0, 10).map(p => `
            <tr>${cols.map(c => `<td>${esc(p[c[1]] || '-')}</td>`).join('')}</tr>
          `).join('')}</tbody>
        </table>
      </div>
      ${parsed.length > 10 ? `<p class="muted" style="font-size:12px;margin-top:6px">…dan ${parsed.length - 10} baris lainnya</p>` : ''}
      <div style="display:flex;justify-content:flex-end;margin-top:14px">
        <button class="btn primary" id="csv-confirm" type="button">${icon('Check', { size: 16 })} Impor ${parsed.length} ${esc(label)}</button>
      </div>
    `;

    preview.querySelector('#csv-confirm').addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: `Impor ${parsed.length} ${label}?`,
        message: 'Data akan ditambahkan ke database. Data lama tidak terhapus.',
        confirmText: 'Impor',
      });
      if (!ok) return;
      await table.bulkAdd(parsed);
      toast.success(`${parsed.length} ${label} berhasil diimpor.`);
      dlg.close();
      if (onDone) await onDone();
    });
  });
}
