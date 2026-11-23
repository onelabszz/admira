import { db } from '../db.js';
import { download, toISODate } from '../lib.js';
import { icon } from '../lib-icons.js';

export async function renderReports(main) {
  const now = new Date();
  const startISO = toISODate(new Date(now.getFullYear(), now.getMonth(), 1));

  main.innerHTML = `
    <div class="page-head"><h1>Laporan</h1></div>
    <div class="card">
      <label>Sejak <input type="date" id="from" value="${startISO}"></label>
      <button class="btn primary" id="gen">${icon('ChartColumn', { size: 16 })} Buat Rekap</button>
      <button class="btn" id="csv">${icon('Download', { size: 16 })} Unduh CSV</button>
    </div>
    <div class="card" id="result"><p class="muted">Pilih periode lalu klik Buat Rekap.</p></div>
  `;
  const result = main.querySelector('#result');
  let lastData = null;

  async function build() {
    const from = main.querySelector('#from').value;
    const [letters, tasks, allMeetings] = await Promise.all([
      db.letters.toArray(),
      db.tasks.toArray(),
      db.meetings.toArray(),
    ]);
    const inCount = letters.filter(l => l.type === 'in' && (l.date || '') >= from).length;
    const outCount = letters.filter(l => l.type === 'out' && (l.date || '') >= from).length;
    const periodTasks = tasks.filter(t => t.createdAt && toISODate(t.createdAt) >= from);
    const tasksOpen = periodTasks.filter(t => t.status !== 'done').length;
    const tasksDone = periodTasks.filter(t => t.status === 'done').length;
    const meetings = allMeetings.filter(m => (m.date || '') >= from).length;

    lastData = { from, inCount, outCount, tasksOpen, tasksDone, meetings };

    result.innerHTML = `
      <h2>Rekap Sejak ${from}</h2>
      <div class="grid" style="margin-top:12px">
        <div class="stat"><div class="num">${inCount}</div><div class="lbl">Surat Masuk</div></div>
        <div class="stat"><div class="num">${outCount}</div><div class="lbl">Surat Keluar</div></div>
        <div class="stat"><div class="num">${meetings}</div><div class="lbl">Rapat</div></div>
        <div class="stat"><div class="num">${tasksDone}/${tasksDone+tasksOpen}</div><div class="lbl">Tugas Selesai</div></div>
      </div>
      <p style="margin-top:16px">
        Pada periode ini tercatat ${inCount} surat masuk dan ${outCount} surat keluar,
        ${meetings} rapat, serta ${tasksOpen} tugas aktif yang dibuat pada periode ini.
      </p>
    `;
  }

  main.querySelector('#gen').addEventListener('click', build);
  main.querySelector('#csv').addEventListener('click', async () => {
    if (!lastData) await build();
    const { from, inCount, outCount, tasksOpen, tasksDone, meetings } = lastData;
    const rows = [
      ['Periode', from],
      ['Surat Masuk', inCount],
      ['Surat Keluar', outCount],
      ['Rapat', meetings],
      ['Tugas Aktif', tasksOpen],
      ['Tugas Selesai', tasksDone],
    ];
    const csv = '\uFEFF' + rows.map(r => r.join(',')).join('\r\n');
    download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `laporan-admira-${from}.csv`);
  });

  return () => {};
}
