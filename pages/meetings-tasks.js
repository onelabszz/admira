import { db } from '../db.js';
import { esc, fmtDate, today } from '../lib.js';
import { icon } from '../lib-icons.js';
import { confirmDialog } from '../lib-confirm.js';
import { toast } from '../lib-toast.js';

export async function renderMeetingsTasks(main, section) {
  const isMeetings = section === 'meetings';

  main.innerHTML = `
    <div class="page-head">
      <h1>${isMeetings ? 'Rapat' : 'Tugas'}</h1>
      <button class="btn primary" id="btn-add">
        ${icon('Plus', { size: 16 })} ${isMeetings ? 'Tambah Rapat' : 'Tambah Tugas'}
      </button>
    </div>
    <div class="card"><div id="list"></div></div>
    <dialog id="dlg"></dialog>
  `;

  const list = main.querySelector('#list');
  const dlg = main.querySelector('#dlg');

  function emptyState(title, hint) {
    return `
      <div class="empty-state">
        <div class="empty-icon">${icon(isMeetings ? 'Users' : 'SquareCheck', { size: 28 })}</div>
        <div class="empty-title">${title}</div>
        <div class="empty-hint">${hint}</div>
      </div>
    `;
  }

  async function refresh() {
    if (isMeetings) {
      const rows = await db.meetings.orderBy('date').reverse().toArray();
      list.innerHTML = rows.length ? `
        <div class="table-responsive">
          <table class="table">
            <thead><tr><th>Tanggal</th><th>Judul</th><th>Lokasi</th><th></th></tr></thead>
            <tbody>
              ${rows.map(m => `
                <tr>
                  <td>${fmtDate(m.date)}</td>
                  <td>
                    <strong>${esc(m.title)}</strong>
                    ${m.notes ? `<div class="muted" style="font-size:12px">${esc(m.notes)}</div>` : ''}
                  </td>
                  <td>${esc(m.location || '-')}</td>
                  <td class="actions">
                    <button class="btn sm" data-act="edit" data-id="${m.id}">${icon('PenLine', { size: 13 })} Ubah</button>
                    <button class="btn sm danger" data-act="del" data-id="${m.id}">${icon('Trash2', { size: 13 })} Hapus</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : emptyState('Belum ada rapat', 'Klik "Tambah Rapat" untuk mencatat rapat pertama.');
      return;
    }

    const [tasks, meetings] = await Promise.all([
      db.tasks.toCollection().sortBy('createdAt'),
      db.meetings.toArray(),
    ]);
    tasks.reverse();
    const meetingTitle = new Map(meetings.map(m => [m.id, m.title]));

    list.innerHTML = tasks.length ? `
      <div class="table-responsive">
        <table class="table">
          <thead><tr><th>Judul</th><th>PIC</th><th>Jatuh Tempo</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${tasks.map(t => `
              <tr>
                <td>
                  <strong>${esc(t.title)}</strong>
                  ${t.meetingId && meetingTitle.has(t.meetingId)
                    ? `<div class="muted" style="font-size:12px">${esc(meetingTitle.get(t.meetingId))}</div>`
                    : ''}
                </td>
                <td>${esc(t.pic || '-')}</td>
                <td>${fmtDate(t.dueDate)}</td>
                <td><span class="chip ${t.status === 'done' ? '' : 'amber'}">${t.status === 'done' ? 'Selesai' : 'Aktif'}</span></td>
                <td class="actions">
                  <button class="btn sm" data-act="toggle" data-id="${t.id}">
                    ${t.status === 'done' ? icon('RotateCcw', { size: 13 }) : icon('Check', { size: 13 })}
                    ${t.status === 'done' ? 'Buka' : 'Selesai'}
                  </button>
                  <button class="btn sm" data-act="edit" data-id="${t.id}">${icon('PenLine', { size: 13 })} Ubah</button>
                  <button class="btn sm danger" data-act="del" data-id="${t.id}">${icon('Trash2', { size: 13 })} Hapus</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : emptyState('Belum ada tugas', 'Klik "Tambah Tugas" untuk membuat tugas pertama.');
  }

  main.querySelector('#btn-add').addEventListener('click', () => {
    if (isMeetings) openMeetingForm();
    else openTaskForm();
  });

  list.addEventListener('click', async e => {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const id = Number(btn.dataset.id);
    const act = btn.dataset.act;

    if (act === 'edit') {
      if (isMeetings) openMeetingForm(await db.meetings.get(id));
      else openTaskForm(await db.tasks.get(id));
      return;
    }

    if (act === 'toggle') {
      const task = await db.tasks.get(id);
      if (!task) return;
      await db.tasks.update(id, {
        status: task.status === 'done' ? 'open' : 'done',
        updatedAt: Date.now(),
      });
      refresh();
      return;
    }

    if (act === 'del') {
      const ok = await confirmDialog({
        title: `Hapus ${isMeetings ? 'rapat' : 'tugas'} ini?`,
        message: 'Data akan dihapus permanen.',
        confirmText: 'Hapus',
        danger: true,
      });
      if (!ok) return;
      if (isMeetings) await db.meetings.delete(id);
      else await db.tasks.delete(id);
      toast.success(`Data ${isMeetings ? 'rapat' : 'tugas'} dihapus.`);
      refresh();
    }
  });

  function openMeetingForm(existing) {
    const m = existing || {};
    dlg.innerHTML = `
      <button type="button" class="modal-close" data-close aria-label="Tutup">${icon('X', { size: 18 })}</button>
      <form method="dialog" class="form" style="max-height:88vh;overflow-y:auto">
        <h2>${existing ? 'Ubah' : 'Tambah'} Rapat</h2>
        <label>Judul Rapat <input name="title" value="${esc(m.title || '')}" required></label>
        <label>Tanggal <input type="date" name="date" value="${esc(m.date || today())}" required></label>
        <label>Lokasi <input name="location" value="${esc(m.location || '')}" placeholder="Ruang rapat, aula…"></label>
        <label>Catatan / Agenda <textarea name="notes" rows="3">${esc(m.notes || '')}</textarea></label>
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
        title: fd.get('title'),
        date: fd.get('date'),
        location: fd.get('location') || '',
        notes: fd.get('notes') || '',
        updatedAt: Date.now(),
      };
      if (existing) {
        await db.meetings.update(existing.id, data);
        toast.success('Data rapat diperbarui.');
      } else {
        await db.meetings.add({ ...data, createdAt: Date.now() });
        toast.success('Rapat ditambahkan.');
      }
      dlg.close();
      refresh();
    });
  }

  async function openTaskForm(existing) {
    const t = existing || {};
    const meetings = await db.meetings.orderBy('date').reverse().toArray();
    dlg.innerHTML = `
      <button type="button" class="modal-close" data-close aria-label="Tutup">${icon('X', { size: 18 })}</button>
      <form method="dialog" class="form" style="max-height:88vh;overflow-y:auto">
        <h2>${existing ? 'Ubah' : 'Tambah'} Tugas</h2>
        <label>Judul Tugas <input name="title" value="${esc(t.title || '')}" required></label>
        <label>PIC <input name="pic" value="${esc(t.pic || '')}" placeholder="Nama penanggung jawab"></label>
        <label>Jatuh Tempo <input type="date" name="dueDate" value="${esc(t.dueDate || today())}"></label>
        <label>Status
          <select name="status">
            <option value="open" ${t.status === 'done' ? '' : 'selected'}>Aktif</option>
            <option value="done" ${t.status === 'done' ? 'selected' : ''}>Selesai</option>
          </select>
        </label>
        <label>Terkait Rapat
          <select name="meetingId">
            <option value="">— Tidak terkait —</option>
            ${meetings.map(m => `
              <option value="${m.id}" ${Number(t.meetingId) === m.id ? 'selected' : ''}>
                ${esc(m.title)} — ${fmtDate(m.date)}
              </option>
            `).join('')}
          </select>
        </label>
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
        title: fd.get('title'),
        pic: fd.get('pic') || '',
        dueDate: fd.get('dueDate') || '',
        status: fd.get('status') === 'done' ? 'done' : 'open',
        meetingId: Number(fd.get('meetingId')) || null,
        updatedAt: Date.now(),
      };
      if (existing) {
        await db.tasks.update(existing.id, data);
        toast.success('Tugas diperbarui.');
      } else {
        await db.tasks.add({ ...data, createdAt: Date.now() });
        toast.success('Tugas ditambahkan.');
      }
      dlg.close();
      refresh();
    });
  }

  await refresh();
  return () => dlg.close();
}
