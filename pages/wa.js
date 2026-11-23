import { db, ensureWaTemplates } from '../db.js';
import { esc, fmtDate, currentAcademicYear } from '../lib.js';
import { icon } from '../lib-icons.js';
import { confirmDialog } from '../lib-confirm.js';
import { toast } from '../lib-toast.js';

const CATEGORIES = [
  'Rapat', 'Kegiatan', 'Akademik', 'Libur',
  'Kedisiplinan', 'Kesehatan', 'Administrasi', 'Darurat', 'Lainnya',
];

const VAR_LABELS = {
  hari: 'Hari',
  tanggal: 'Tanggal',
  waktu: 'Waktu',
  tempat: 'Tempat',
  agenda: 'Agenda',
  acara: 'Nama Kegiatan / Acara',
  kelas: 'Kelas',
  batas: 'Batas Waktu / Tanggal Penting',
  keterangan: 'Keterangan Tambahan',
  kontak: 'Kontak / Narahubung',
  jumlah: 'Jumlah / Nominal',
  materi: 'Materi',
  tautan: 'Tautan Informasi',
  daftar_kegiatan: 'Daftar Kegiatan',
  instansi: 'Instansi Mitra',
  tanggal_mulai: 'Tanggal Mulai',
  tanggal_selesai: 'Tanggal Selesai',
};

const LONG_FIELDS = new Set(['daftar_kegiatan', 'keterangan', 'materi', 'agenda']);

function waPreview(text, maxLines = 0) {
  let source = String(text || '');
  if (maxLines) {
    const lines = source.split('\n');
    source = lines.slice(0, maxLines).join('\n');
    if (lines.length > maxLines) source += '\n…';
  }
  return esc(source).replace(/\*([^*\n]+)\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
}

function fillTemplate(body, values) {
  return String(body || '').replace(/\{\{(\w+)\}\}/g, (raw, key) => {
    const value = values[key];
    return value !== undefined && value !== '' ? value : raw;
  });
}

function templateKeys(body) {
  return [...new Set([...String(body || '').matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]))];
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.cssText = 'position:fixed;top:-9999px;opacity:0';
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand('copy'); } catch { ok = false; }
    area.remove();
    return ok;
  }
}

export async function renderWaTemplates(main) {
  try {
    await ensureWaTemplates();
  } catch (err) {
    console.warn('Template WA bawaan gagal dimuat:', err);
  }

  const ws = (await db.settings.get('workspace'))?.value || {};
  const autoValues = {
    sekolah: ws.name || 'Sekolah',
    kepala: ws.headmaster || '',
    tahun_ajaran: ws.academicYear || currentAcademicYear(),
  };

  main.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Pengumuman WA</h1>
        <p class="muted" style="margin:2px 0 0">Template siap salin untuk grup WhatsApp guru, kelas, dan komite.</p>
      </div>
      <button class="btn primary" id="btn-add">${icon('Plus', { size: 16 })} Template Baru</button>
    </div>
    <div class="card">
      <input type="search" id="wa-q" placeholder="Cari template, kategori, atau isi pengumuman…"
             style="width:100%;padding:8px;border:1px solid #E5E7EB;border-radius:8px">
      <div id="wa-chips" class="page-actions" style="margin-top:12px"></div>
    </div>
    <div id="wa-list" class="grid" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px"></div>
    <dialog id="wa-dlg"></dialog>
  `;

  const list = main.querySelector('#wa-list');
  const chips = main.querySelector('#wa-chips');
  const search = main.querySelector('#wa-q');
  const dlg = main.querySelector('#wa-dlg');

  let all = [];
  let activeCategory = '';

  const filtered = () => {
    const term = search.value.trim().toLowerCase();
    return all.filter(t => {
      const matchCat = !activeCategory || t.category === activeCategory;
      const matchTerm = !term || [t.name, t.category, t.body]
        .some(v => (v || '').toLowerCase().includes(term));
      return matchCat && matchTerm;
    });
  };

  function renderChips() {
    const cats = [...new Set(all.map(t => t.category).filter(Boolean))];
    const items = [['', 'Semua'], ...cats.map(c => [c, c])];
    chips.innerHTML = items.map(([value, label]) => `
      <button class="btn sm ${activeCategory === value ? 'primary' : ''}" data-cat="${esc(value)}">
        ${esc(label)}
      </button>
    `).join('');
  }

  function renderList() {
    const rows = filtered();
    if (!rows.length) {
      list.innerHTML = `
        <div class="empty-state" style="grid-column:1/-1">
          <div class="empty-icon">${icon('MessageSquare', { size: 26 })}</div>
          <div class="empty-title">Template tidak ditemukan</div>
          <div class="empty-hint">Ubah kata kunci/filter, atau tambahkan template baru.</div>
        </div>
      `;
      return;
    }

    list.innerHTML = rows.map(t => `
      <div class="card" style="margin:0;padding:14px;display:flex;flex-direction:column;gap:8px">
        <div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
          <h3 style="margin:0;min-width:0;font-size:14px;line-height:1.35">${esc(t.name)}</h3>
          <span class="chip amber" style="flex-shrink:0;font-size:11px;padding:2px 8px">${esc(t.category || 'Lainnya')}</span>
        </div>
        <div style="background:#F7FBF3;border:1px solid #E4EEDC;border-radius:8px;padding:8px 10px;font-size:12px;line-height:1.5;color:#334155;min-height:88px">
          ${waPreview(t.body, 5)}
        </div>
        <div style="margin-top:auto;display:flex;gap:6px;flex-wrap:wrap;align-items:center">
          <button class="btn sm primary" data-act="use" data-id="${t.id}">
            ${icon('Copy', { size: 13 })} Gunakan
          </button>
          <button class="btn sm" data-act="edit" data-id="${t.id}">${icon('PenLine', { size: 13 })} Ubah</button>
          ${!t.builtIn ? `<button class="btn sm danger" data-act="del" data-id="${t.id}">${icon('Trash2', { size: 13 })} Hapus</button>` : ''}
          <span class="muted" style="margin-left:auto;font-size:11px">${fmtDate(t.createdAt)}</span>
        </div>
      </div>
    `).join('');
  }

  async function refresh() {
    all = await db.wa_templates.toArray();
    all.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    if (activeCategory && !all.some(t => t.category === activeCategory)) activeCategory = '';
    renderChips();
    renderList();
  }

  chips.addEventListener('click', e => {
    const btn = e.target.closest('button[data-cat]');
    if (!btn) return;
    activeCategory = btn.dataset.cat;
    renderChips();
    renderList();
  });

  search.addEventListener('input', renderList);
  main.querySelector('#btn-add').addEventListener('click', () => openForm());

  list.addEventListener('click', async e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const template = all.find(t => t.id === Number(btn.dataset.id));
    if (!template) return;

    if (btn.dataset.act === 'use') {
      openUse(template);
    } else if (btn.dataset.act === 'edit') {
      openForm(template);
    } else if (btn.dataset.act === 'del' && !template.builtIn) {
      const ok = await confirmDialog({
        title: 'Hapus template ini?',
        message: 'Template buatan Anda akan dihapus permanen dari perangkat ini.',
        confirmText: 'Hapus',
        danger: true,
      });
      if (!ok) return;
      await db.wa_templates.delete(template.id);
      toast.success('Template dihapus.');
      refresh();
    }
  });

  function openUse(template) {
    const keys = templateKeys(template.body);
    const manual = keys.filter(k => !(k in autoValues));
    const values = { ...autoValues };

    dlg.innerHTML = `
      <button type="button" class="modal-close" data-close aria-label="Tutup">${icon('X', { size: 18 })}</button>
      <div class="form" style="max-height:88vh;overflow-y:auto">
        <h2 style="margin-bottom:4px">${esc(template.name)}</h2>
        <p class="muted" style="margin:0 0 12px;font-size:13px">${esc(template.category || 'Lainnya')} · isi variabel lalu salin ke grup WhatsApp.</p>

        <div id="wa-preview" style="background:#E7FFDB;border:1px solid #CFE9C2;border-radius:12px;padding:12px;font-size:13px;line-height:1.6;max-height:260px;overflow:auto"></div>

        <h3 style="margin:16px 0 8px">Isi Variabel</h3>
        ${manual.length ? manual.map(k => {
          const label = VAR_LABELS[k] || k.replace(/_/g, ' ');
          const long = LONG_FIELDS.has(k);
          return `<label>${esc(label)}
            ${long
              ? `<textarea data-var="${k}" rows="3" placeholder="{{${k}}}"></textarea>`
              : `<input data-var="${k}" placeholder="{{${k}}}">`}
          </label>`;
        }).join('') : '<p class="muted" style="font-size:13px">Template ini tidak memerlukan variabel tambahan.</p>'}

        <div class="form-actions">
          <button type="button" class="btn" data-close>Tutup</button>
          <button type="button" class="btn primary" id="wa-copy">${icon('Copy', { size: 16 })} Salin ke WhatsApp</button>
        </div>
      </div>
    `;
    dlg.showModal();
    dlg.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => dlg.close()));

    const preview = dlg.querySelector('#wa-preview');
    const inputs = [...dlg.querySelectorAll('[data-var]')];

    const collect = () => {
      const result = { ...values };
      for (const input of inputs) {
        if (input.value.trim()) result[input.dataset.var] = input.value.trim();
      }
      return result;
    };

    const paint = () => {
      preview.innerHTML = waPreview(fillTemplate(template.body, collect()));
    };

    inputs.forEach(input => input.addEventListener('input', paint));
    paint();

    dlg.querySelector('#wa-copy').addEventListener('click', async () => {
      const text = fillTemplate(template.body, collect());
      const ok = await copyText(text);
      if (ok) {
        dlg.close();
        toast.success('Pengumuman disalin. Tinggal tempel di grup WhatsApp.');
      } else {
        toast.error('Gagal menyalin. Pilih teks pratinjau secara manual.');
      }
    });
  }

  function openForm(existing) {
    const t = existing || {};
    const category = t.category && CATEGORIES.includes(t.category) ? t.category : 'Kegiatan';

    dlg.innerHTML = `
      <button type="button" class="modal-close" data-close aria-label="Tutup">${icon('X', { size: 18 })}</button>
      <form method="dialog" class="form" style="max-height:88vh;overflow-y:auto">
        <h2>${existing ? 'Ubah' : 'Tambah'} Template Pengumuman</h2>
        <label>Nama Template
          <input name="name" required value="${esc(t.name || '')}" placeholder="mis. Undangan Rapat Wali Kelas">
        </label>
        <label>Kategori
          <select name="category">
            ${CATEGORIES.map(c => `<option ${c === category ? 'selected' : ''}>${c}</option>`).join('')}
          </select>
        </label>
        <label>Isi Pengumuman
          <textarea name="body" rows="13" required placeholder="Tulis pengumuman di sini. Gunakan *teks* untuk huruf tebal dan {{variabel}} untuk bagian yang diisi saat menyalin.">${esc(t.body || '')}</textarea>
        </label>
        <p class="muted" style="font-size:12px;margin:0">
          Variabel otomatis: {{sekolah}}, {{kepala}}, {{tahun_ajaran}}. Variabel lain akan muncul sebagai isian saat template digunakan.
        </p>
        <div class="form-actions">
          <button type="button" class="btn" data-close>Batal</button>
          <button type="submit" class="btn primary">Simpan</button>
        </div>
      </form>
    `;
    dlg.showModal();
    dlg.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => dlg.close()));

    dlg.querySelector('form').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = {
        name: String(fd.get('name') || '').trim(),
        category: String(fd.get('category') || 'Lainnya'),
        body: String(fd.get('body') || '').trim(),
        updatedAt: Date.now(),
      };
      if (!data.name || !data.body) return;
      if (existing) {
        await db.wa_templates.update(existing.id, data);
        toast.success('Template diperbarui.');
      } else {
        data.builtIn = false;
        data.createdAt = Date.now();
        await db.wa_templates.add(data);
        toast.success('Template ditambahkan.');
      }
      dlg.close();
      refresh();
    });
  }

  await refresh();
  return () => dlg.close();
}
