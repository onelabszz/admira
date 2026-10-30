import { db } from '../db.js';
import { download } from '../lib.js';
import { icon } from '../lib-icons.js';

export async function renderReports(main) {
  const monthStart = new Date(); monthStart.setDate(1);
  const startISO = monthStart.toISOString().slice(0, 10);

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
    const inCount = (await db.letters.where('type').equals('in').toArray()).filter(l => l.date >= from).length;
    const outCount = (await db.letters.where('type').equals('out').toArray()).filter(l => l.date >= from).length;
    const tasksOpen = await db.tasks.where('status').notEqual('done').count();
    const tasksDone = await db.tasks.where('status').equals('done').count();
    const meetings = (await db.meetings.toArray()).filter(m => m.date >= from).length;

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
        ${meetings} rapat terlaksana, serta ${tasksOpen} tugas masih aktif.
      </p>
    `;
  }

  main.querySelector('#gen').addEventListener('click', build);
  main.querySelector('#csv').addEventListener('click', () => {
    if (!lastData) return build();
    const { from, inCount, outCount, tasksOpen, tasksDone, meetings } = lastData;
    const rows = [
      ['Periode', from],
      ['Surat Masuk', inCount],
      ['Surat Keluar', outCount],
      ['Rapat', meetings],
      ['Tugas Aktif', tasksOpen],
      ['Tugas Selesai', tasksDone],
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `laporan-admira-${from}.csv`);
  });

  return () => {};
}
