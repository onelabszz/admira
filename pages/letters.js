import { db, peekNextLetterNumber, bumpLetterNumber, saveAttachment, getAttachments, deleteAttachment } from '../db.js';
import { esc, fmtDate, today, download, parseDateValue, currentAcademicYear } from '../lib.js';
import { buildPrintHtml, printHtml, formatDateId } from '../lib-print.js';
import { icon } from '../lib-icons.js';
import { confirmDialog } from '../lib-confirm.js';
import { toast } from '../lib-toast.js';

const TEMPLATE_LABELS = {
  keperluan: 'Keperluan / Acara',
  tempat: 'Tempat',
  waktu: 'Waktu',
  nama: 'Nama',
  nip: 'NIP',
  jabatan: 'Jabatan',
  agenda: 'Agenda',
  acara: 'Nama Kegiatan',
  tugas: 'Uraian Tugas',
  materi: 'Materi',
  jumlah: 'Jumlah',
  keterangan: 'Keterangan',
  tanggal_mulai: 'Tanggal Mulai',
  tanggal_selesai: 'Tanggal Selesai',
  nama_orang_tua: 'Nama Orang Tua/Wali',
  alasan: 'Alasan',
  sekolah_tujuan: 'Sekolah Tujuan',
  dokumen: 'Dokumen yang Dikirim',
  tujuan_rekomendasi: 'Tujuan Rekomendasi',
  uraian: 'Uraian Belanja',
  jumlah_biaya: 'Jumlah Biaya',
  sumber_dana: 'Sumber Dana',
};

function fmtBytes(n) {
  if (n === null || n === undefined) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export async function renderLetters(main, type) {
  const isIn = type === 'in';
  const title = isIn ? 'Surat Masuk' : 'Surat Keluar';
  const ws = (await db.settings.get('workspace'))?.value || {};

  main.innerHTML = `
    <div class="page-head">
      <h1>${title}</h1>
      <button class="btn primary" id="btn-add">${icon('Plus', { size: 16 })} Tambah ${title}</button>
    </div>
    <div class="card">
      <input type="search" id="q" placeholder="Cari nomor, perihal, ${isIn ? 'pengirim' : 'tujuan'}…"
             style="width:100%;padding:8px;border:1px solid #E5E7EB;border-radius:8px;margin-bottom:12px">
      <div id="list"></div>
    </div>
    <dialog id="dlg"></dialog>
  `;
  const list = main.querySelector('#list');
  const dlg = main.querySelector('#dlg');
  const q = main.querySelector('#q');

  async function refresh() {
    const all = await db.letters.where('type').equals(type).sortBy('createdAt');
    all.reverse();
    const term = q.value.trim().toLowerCase();
    const rows = all.filter(l =>
      !term || [l.number, l.subject, l.sender, l.recipient]
        .some(v => (v || '').toLowerCase().includes(term))
    );

    if (!rows.length) {
      list.innerHTML = `<p class="muted">Belum ada ${title.toLowerCase()}.</p>`;
      return;
    }

    const ids = rows.map(r => r.id);
    const attCounts = {};
    const attachments = await db.attachments.where('letterId').anyOf(ids).toArray();
    for (const a of attachments) attCounts[a.letterId] = (attCounts[a.letterId] || 0) + 1;

    let dispCounts = {};
    if (isIn) {
      const disps = await db.dispositions.where('letterId').anyOf(ids).toArray();
      for (const d of disps) {
        if (d.status !== 'done') dispCounts[d.letterId] = (dispCounts[d.letterId] || 0) + 1;
      }
    }

    list.innerHTML = `
      <div class="table-responsive">
      <table class="table">
        <thead>
          <tr>
            <th>Tanggal</th><th>Nomor</th>
            <th>${isIn ? 'Pengirim' : 'Tujuan'}</th>
            <th>Perihal</th><th>Sifat</th>
            ${isIn ? '<th>Disposisi</th>' : ''}
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(l => `
            <tr>
              <td>${fmtDate(l.date)}</td>
              <td><strong>${esc(l.number)}</strong></td>
              <td>${esc(l.sender || l.recipient || '-')}</td>
              <td>${esc(l.subject)}</td>
              <td>${esc(l.property || '-')}</td>
              ${isIn ? `<td>${dispCounts[l.id]
                ? `<span class="chip amber">${dispCounts[l.id]} aktif</span>`
                : '<span class="muted">-</span>'}</td>` : ''}
              <td class="actions">
                ${isIn
                  ? `<button class="btn sm" data-act="disp" data-id="${l.id}">${icon('MessageSquare', { size: 13 })} Disposisi</button>`
                  : `<button class="btn sm primary" data-act="print" data-id="${l.id}">${icon('Printer', { size: 13 })} Cetak</button>`}
                <button class="btn sm" data-act="att" data-id="${l.id}" title="Lampiran">${icon('Paperclip', { size: 13 })} Lampiran${attCounts[l.id] ? ` (${attCounts[l.id]})` : ''}</button>
                <button class="btn sm" data-act="edit" data-id="${l.id}">${icon('PenLine', { size: 13 })} Ubah</button>
                <button class="btn sm danger" data-act="del" data-id="${l.id}">${icon('Trash2', { size: 13 })} Hapus</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      </div>
    `;
  }

  q.addEventListener('input', refresh);
  main.querySelector('#btn-add').addEventListener('click', () => openForm());

  list.addEventListener('click', async e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const act = btn.dataset.act;

    if (act === 'del') {
      const ok = await confirmDialog({
        title: 'Hapus surat ini?',
        message: 'Lampiran dan disposisi terkait juga akan dihapus. Tindakan ini tidak dapat dibatalkan.',
        confirmText: 'Hapus',
        danger: true,
      });
      if (!ok) return;
      await db.transaction('rw', db.letters, db.attachments, db.dispositions, async () => {
        await db.letters.delete(id);
        await db.attachments.where('letterId').equals(id).delete();
        await db.dispositions.where('letterId').equals(id).delete();
      });
      refresh();
    } else if (act === 'att') {
      const l = await db.letters.get(id);
      openAttachments(l);
    } else if (act === 'edit') {
      const l = await db.letters.get(id);
      openForm(l);
    } else if (act === 'print') {
      const l = await db.letters.get(id);
      
      // Tampilkan dialog pilihan TTD
      dlg.innerHTML = `
        <button type="button" class="modal-close" data-close aria-label="Tutup">${icon('X', { size: 18 })}</button>
        <div class="form" style="text-align:center">
          <h2>Pilih Model Tanda Tangan</h2>
          <p class="muted" style="margin-bottom:20px">Pilih bagaimana surat ini akan dicetak.</p>
          
          <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:24px">
            <button class="btn" data-mode="none">Tanpa TTD & Cap</button>
            <button class="btn primary" data-mode="ttd">TTD Saja</button>
            <button class="btn primary" data-mode="ttd-stamp">TTD + Cap Sekolah</button>
          </div>
          
          <div class="form-actions" style="justify-content:center;border:none;padding:0;margin:20px 0 0;background:transparent">
            <button type="button" class="btn" data-close>Batal</button>
          </div>
        </div>
      `;
      dlg.showModal();
      dlg.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', () => dlg.close()));
      
      dlg.querySelectorAll('button[data-mode]').forEach(btn => {
        btn.addEventListener('click', () => {
          const mode = btn.dataset.mode;
          dlg.close();
          setTimeout(() => {
            printHtml(buildPrintHtml({
              workspace: ws,
              letter: l,
              body: l.body || '',
              signatureMode: mode
            }));
          }, 200);
        });
      });

    } else if (act === 'disp') {
      const l = await db.letters.get(id);
      openDispositions(l);
    }
  });

  async function openForm(existing) {
    const l = existing || {};
    const templates = isIn ? [] : await db.letter_templates.toArray();
    let studentsPromise = null;
    const loadStudents = () => (studentsPromise ||= db.students.orderBy('name').toArray());
    let suggestedNumber = l.number || '';
    if (!existing && !isIn) {
      suggestedNumber = await peekNextLetterNumber(type, new Date().getFullYear());
    }

    dlg.innerHTML = `
      <button type="button" class="modal-close" data-close aria-label="Tutup">${icon('X', { size: 18 })}</button>
      <form method="dialog" class="form" style="max-height:85vh;overflow-y:auto">
        <h2>${existing ? 'Ubah' : 'Tambah'} ${title}</h2>
        ${!existing && !isIn ? `
          <label>Gunakan Template
            <select name="_template">
              <option value="">— Tanpa template —</option>
              ${templates.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}
            </select>
          </label>
          <div id="tpl-vars"></div>
        ` : ''}
        <label>Tanggal <input type="date" name="date" value="${l.date || today()}" required></label>
        <label>Nomor Surat <input type="text" name="number" value="${esc(suggestedNumber)}" required></label>
        <label>${isIn ? 'Pengirim' : 'Tujuan'}
          <input type="text" name="${isIn ? 'sender' : 'recipient'}"
                 value="${esc((isIn ? l.sender : l.recipient) || '')}" required>
        </label>
        <label>Perihal <input type="text" name="subject" value="${esc(l.subject || '')}" required></label>
        <label>Sifat <select name="property">
          <option value="">-</option>
          ${['Biasa', 'Penting', 'Segera', 'Rahasia'].map(p =>
            `<option ${l.property === p ? 'selected' : ''}>${p}</option>`).join('')}
        </select></label>
        ${!isIn ? `
          <label>Isi Surat
            <textarea name="body" rows="14"
              style="font-family:'Times New Roman',serif;font-size:14px"
              placeholder="Isi surat. Pilih template di atas untuk mengisi otomatis.">${esc(l.body || '')}</textarea>
          </label>
        ` : ''}
        <label>Lampiran <input type="file" name="file"></label>
        <label>Catatan Internal <textarea name="notes" rows="2">${esc(l.notes || '')}</textarea></label>
        <div class="form-actions">
          <button type="button" class="btn" data-close>Batal</button>
          <button type="submit" class="btn primary">Simpan</button>
        </div>
      </form>
    `;
    dlg.showModal();
    dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());

    const tplSel = dlg.querySelector('select[name="_template"]');
    if (tplSel) {
      const panel = dlg.querySelector('#tpl-vars');
      const form = dlg.querySelector('form');
      const fieldValue = name => form.querySelector(`[name="${name}"]`)?.value || '';
      let activeTemplate = null;

      const buildCtx = async () => {
        const dateVal = fieldValue('date') || today();
        const date = parseDateValue(dateVal) || new Date();
        const ctx = {
          sekolah: ws.name || '',
          kepala: ws.headmaster || '',
          nip_kepala: ws.headmasterNip || '',
          pangkat_kepala: ws.headmasterRank || '',
          tahun_ajaran: ws.academicYear || currentAcademicYear(dateVal),
          tanggal: formatDateId(dateVal),
          tanggal_surat: `${ws.city || 'Kota'}, ${formatDateId(dateVal)}`,
          nomor: fieldValue('number'),
          perihal: fieldValue('subject'),
          tujuan: fieldValue('recipient'),
          hari: date.toLocaleDateString('id-ID', { weekday: 'long' }),
          dasar_hukum: (activeTemplate?.basis || []).map(b => `<li>${esc(b)}</li>`).join(''),
        };

        const studentId = Number(panel?.querySelector('#tpl-student')?.value || 0);
        if (studentId) {
          const students = await loadStudents();
          const student = students.find(s => s.id === studentId);
          if (student) {
            Object.assign(ctx, {
              nama_siswa: student.name || '',
              ttl_siswa: [student.birthPlace, student.birthDate ? formatDateId(student.birthDate) : '']
                .filter(Boolean).join(', '),
              jk_siswa: student.gender === 'L' ? 'Laki-laki' : student.gender === 'P' ? 'Perempuan' : '',
              nis_siswa: student.nis || '',
              nisn_siswa: student.nisn || '',
              kelas_siswa: student.kelas || '',
            });
          }
        }

        panel?.querySelectorAll('[data-var]').forEach(input => {
          ctx[input.dataset.var] = input.value;
        });
        return ctx;
      };

      const applyTemplate = async () => {
        if (!activeTemplate) return;
        const ctx = await buildCtx();
        form.querySelector('textarea[name="body"]').value =
          activeTemplate.body.replace(/\{\{(\w+)\}\}/g, (raw, key) => (key in ctx ? ctx[key] : raw));
      };

      // Selama isi surat belum diedit manual, ikuti perubahan nomor/perihal/tujuan.
      let bodyTouched = false;
      form.querySelector('textarea[name="body"]')?.addEventListener('input', () => { bodyTouched = true; });
      ['date', 'number', 'subject', 'recipient'].forEach(name => {
        form.querySelector(`[name="${name}"]`)?.addEventListener('input', () => {
          if (!bodyTouched) applyTemplate();
        });
      });

      tplSel.addEventListener('change', async () => {
        if (!tplSel.value) {
          activeTemplate = null;
          panel.innerHTML = '';
          return;
        }
        const template = await db.letter_templates.get(Number(tplSel.value));
        if (!template) return;
        activeTemplate = template;

        const keys = [...new Set([...template.body.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]))];
        const auto = new Set([
          'sekolah', 'kepala', 'nip_kepala', 'pangkat_kepala', 'tahun_ajaran',
          'tanggal', 'tanggal_surat', 'nomor', 'perihal', 'tujuan', 'hari',
          'dasar_hukum',
        ]);
        const studentKeys = keys.filter(k => k.endsWith('_siswa'));
        const manualKeys = keys.filter(k => !auto.has(k) && !k.endsWith('_siswa'));

        let studentOptions = '';
        if (studentKeys.length) {
          const students = await loadStudents();
          studentOptions = students.length
            ? students.map(s => `<option value="${s.id}">${esc(s.name)} — ${esc(s.kelas || '-')}</option>`).join('')
            : '<option value="">Belum ada data siswa</option>';
        }

        panel.innerHTML = `
          <div style="border-top:1px solid var(--border);margin-top:14px;padding-top:12px">
            <h3 style="margin-bottom:8px">Variabel Template</h3>
            ${activeTemplate.basis?.length ? `
              <div style="background:#F8FAFC;border:1px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:12px">
                <strong style="font-size:12.5px">Dasar hukum</strong>
                <ul style="margin:6px 0 0 16px;padding:0;font-size:12.5px" class="muted">
                  ${activeTemplate.basis.map(b => `<li style="margin-bottom:3px">${esc(b)}</li>`).join('')}
                </ul>
                <div class="muted" style="font-size:11px;margin-top:6px">Rujukan umum. Sesuaikan dengan peraturan daerah/instansi sebelum digunakan resmi.</div>
              </div>
            ` : ''}
            ${studentKeys.length ? `
              <label>Data Siswa <small class="muted">(mengisi ${studentKeys.join(', ')})</small>
                <select id="tpl-student">
                  <option value="">— Pilih siswa —</option>
                  ${studentOptions}
                </select>
              </label>` : ''}
            ${manualKeys.map(k => `
              <label>${TEMPLATE_LABELS[k] || k.replace(/_/g, ' ')}
                <input data-var="${k}" placeholder="{{${k}}}">
              </label>`).join('')}
            <div class="form-actions" style="border:none;padding:0;margin-top:4px">
              <button type="button" class="btn sm" id="tpl-apply">${icon('RotateCcw', { size: 13 })} Perbarui Isi Surat</button>
            </div>
          </div>
        `;
        panel.querySelector('#tpl-apply').addEventListener('click', applyTemplate);
        const studentSel = panel.querySelector('#tpl-student');
        if (studentSel) studentSel.addEventListener('change', applyTemplate);
        await applyTemplate();
      });
    }

    dlg.querySelector('form').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const data = {
        type,
        date: fd.get('date'),
        number: fd.get('number'),
        subject: fd.get('subject'),
        property: fd.get('property') || '',
        notes: fd.get('notes') || '',
        sender: isIn ? fd.get('sender') : '',
        recipient: isIn ? '' : fd.get('recipient'),
        body: isIn ? (existing?.body || '') : (fd.get('body') || ''),
        updatedAt: Date.now(),
      };
      let id = existing?.id;
      if (existing) {
        await db.letters.update(id, data);
      } else {
        data.createdAt = Date.now();
        id = await db.letters.add(data);
        if (!isIn) await bumpLetterNumber(type, new Date(data.date).getFullYear());
      }
      const file = fd.get('file');
      if (file && file.size > 0) await saveAttachment(id, file);
      dlg.close();
      refresh();
    });
  }

  async function openDispositions(letter) {
    const all = await db.dispositions.where('letterId').equals(letter.id).sortBy('createdAt');
    all.reverse();
    dlg.innerHTML = `
      <button type="button" class="modal-close" data-close aria-label="Tutup">${icon('X', { size: 18 })}</button>
      <div class="form" style="max-height:85vh;overflow-y:auto">
        <h2>Disposisi</h2>
        <p class="muted" style="margin:0 0 12px">${esc(letter.subject)} — ${esc(letter.number)}</p>

        <div id="disp-list">
          ${all.length ? all.map(d => `
            <div class="card" style="margin-bottom:8px;padding:10px">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
                <strong>${esc(d.kepada)}</strong>
                <span class="chip ${d.status === 'done' ? '' : 'amber'}">
                  ${d.status === 'done' ? 'Selesai' : d.status === 'progress' ? 'Diproses' : 'Baru'}
                </span>
              </div>
              <div style="font-size:13px;margin:4px 0"><em>${esc(d.instruksi)}</em></div>
              ${d.catatan ? `<div style="font-size:13px">${esc(d.catatan)}</div>` : ''}
              ${d.batasWaktu ? `<div style="font-size:12px;color:#6B7280">Batas: ${fmtDate(d.batasWaktu)}</div>` : ''}
              <div style="text-align:right;margin-top:6px">
                ${d.status !== 'done'
                  ? `<button class="btn sm" data-done="${d.id}">Tandai Selesai</button>` : ''}
                <button class="btn sm danger" data-deld="${d.id}">Hapus</button>
              </div>
            </div>
          `).join('') : '<p class="muted">Belum ada disposisi.</p>'}
        </div>

        <h3 style="margin-top:16px">Tambah Disposisi</h3>
        <form id="disp-form">
          <label>Diteruskan Kepada
            <input name="kepada" required placeholder="Wakil Kepala, Koordinator, Bendahara…"></label>
          <label>Instruksi
            <select name="instruksi" required>
              <option>Tindak lanjuti</option>
              <option>Hadiri</option>
              <option>Siapkan laporan</option>
              <option>Koordinasikan</option>
              <option>Arsipkan</option>
              <option>Selesaikan segera</option>
            </select></label>
          <label>Catatan <textarea name="catatan" rows="2"></textarea></label>
          <label>Batas Waktu <input type="date" name="batasWaktu"></label>
          <div class="form-actions">
            <button type="button" class="btn" data-close>Batal</button>
            <button type="submit" class="btn primary">Simpan</button>
          </div>
        </form>
      </div>
    `;
    dlg.showModal();
    dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());

    dlg.querySelector('#disp-form').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      await db.dispositions.add({
        letterId: letter.id,
        kepada: fd.get('kepada'),
        instruksi: fd.get('instruksi'),
        catatan: fd.get('catatan') || '',
        batasWaktu: fd.get('batasWaktu') || '',
        status: 'open',
        createdAt: Date.now(),
      });
      openDispositions(letter);
      refresh();
    });

    dlg.querySelectorAll('[data-done]').forEach(b => b.addEventListener('click', async () => {
      await db.dispositions.update(Number(b.dataset.done), { status: 'done', completedAt: Date.now() });
      openDispositions(letter);
      refresh();
    }));

    dlg.querySelectorAll('[data-deld]').forEach(b => b.addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: 'Hapus disposisi ini?',
        message: 'Disposisi akan dihapus permanen.',
        confirmText: 'Hapus',
        danger: true,
      });
      if (!ok) return;
      await db.dispositions.delete(Number(b.dataset.deld));
      openDispositions(letter);
      refresh();
    }));
  }

  async function openAttachments(letter) {
    const files = await getAttachments(letter.id);
    dlg.innerHTML = `
      <button type="button" class="modal-close" data-close aria-label="Tutup">${icon('X', { size: 18 })}</button>
      <div class="form" style="max-height:85vh;overflow-y:auto">
        <h2>Lampiran</h2>
        <p class="muted" style="margin:0 0 12px">${esc(letter.subject || '')} — ${esc(letter.number || '')}</p>
        <div id="att-list">
          ${files.length ? files.map(a => `
            <div class="card" style="margin-bottom:8px;padding:10px">
              <div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline">
                <strong style="min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(a.name)}</strong>
                <span class="muted" style="font-size:12px;flex-shrink:0">${fmtBytes(a.size)}</span>
              </div>
              <div class="muted" style="font-size:12px;margin-top:2px">Diunggah ${fmtDate(a.createdAt)}</div>
              <div style="text-align:right;margin-top:6px">
                <button class="btn sm" data-dl="${a.id}">${icon('Download', { size: 13 })} Unduh</button>
                <button class="btn sm danger" data-delatt="${a.id}">${icon('Trash2', { size: 13 })} Hapus</button>
              </div>
            </div>
          `).join('') : '<p class="muted">Belum ada lampiran.</p>'}
        </div>
        <label>Unggah Lampiran <input type="file" id="att-file"></label>
        <div class="form-actions">
          <button type="button" class="btn primary" id="att-upload">${icon('Upload', { size: 16 })} Unggah</button>
          <button type="button" class="btn" data-close>Tutup</button>
        </div>
      </div>
    `;
    dlg.showModal();
    dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());

    dlg.querySelector('#att-upload').addEventListener('click', async () => {
      const file = dlg.querySelector('#att-file').files?.[0];
      if (!file) {
        toast.warn('Pilih file terlebih dahulu.');
        return;
      }
      await saveAttachment(letter.id, file);
      toast.success('Lampiran diunggah.');
      await openAttachments(letter);
      refresh();
    });

    dlg.querySelectorAll('[data-dl]').forEach(btn => btn.addEventListener('click', () => {
      const file = files.find(f => f.id === Number(btn.dataset.dl));
      if (file) download(file.blob, file.name);
    }));

    dlg.querySelectorAll('[data-delatt]').forEach(btn => btn.addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: 'Hapus lampiran ini?',
        message: 'File akan dihapus permanen dari perangkat ini.',
        confirmText: 'Hapus',
        danger: true,
      });
      if (!ok) return;
      await deleteAttachment(Number(btn.dataset.delatt));
      toast.success('Lampiran dihapus.');
      await openAttachments(letter);
      refresh();
    }));
  }

  await refresh();
  return () => dlg.close();
}
