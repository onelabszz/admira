import { db, getSetting, setSetting } from '../db.js';
import { esc, today, toISODate, currentAcademicYear, download } from '../lib.js';
import { icon } from '../lib-icons.js';
import { toast } from '../lib-toast.js';
import { confirmDialog } from '../lib-confirm.js';
import { printHtml } from '../lib-print.js';
import { loadSchoolProfile, saveSchoolProfile } from '../school-profile.js';
import { loadRaporReport } from '../lib-rapor.js';
import {
  KSP_TEMPLATES, KSP_TEMPLATE_GROUPS, KSP_TEMPLATE_TOKENS,
  buildTemplateContext, getTemplateBody, renderKspTemplate,
} from '../ksp-templates.js';
import { KSP_DOC_KINDS, KSP_APPROVAL_STAGES } from '../ksp-data.js';

const CLASSES = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const STATUS = ['draft', 'ditelaah', 'revisi', 'final'];
// Empat fase kerja menggantikan delapan langkah lama. Catatan lama tetap
// terbaca sebagai fallback agar draf tahun berjalan tidak hilang.
const STEPS = [
  {
    n: 'f1', title: 'Konteks & Rapor',
    desc: 'Ringkas latar belakang, karakteristik sekolah, SWOT, dan temuan Rapor Pendidikan.',
    legacy: [1, 2], tab: 'profil',
  },
  {
    n: 'f2', title: 'Isi Kurikulum',
    desc: 'Tetapkan program tahunan, struktur/CP, ATP, modul ajar, P5, dan ekstrakurikuler.',
    legacy: [4, 5, 6], tab: 'dokumen',
  },
  {
    n: 'f3', title: 'Pendampingan & Evaluasi',
    desc: 'Rancang supervisi akademik, evaluasi program, dan pengembangan profesi guru.',
    legacy: [7], tab: 'dokumen',
  },
  {
    n: 'f4', title: 'Penutup & Penetapan',
    desc: 'Tuliskan penutup, lalu verifikasi dan cetak dokumen akhir.',
    legacy: [8], tab: 'verval',
  },
];
const TABS = [
  ['ringkasan', 'Ringkasan', 'ChartColumn'],
  ['dokumen', 'Dokumen & Surat', 'FileText'],
  ['verval', 'Verval & Persetujuan', 'ClipboardCheck'],
  ['arsip', 'Arsip & Referensi', 'Copy'],
];
const LEGACY_TABS = {
  dashboard: 'ringkasan', wizard: 'ringkasan', identitas: 'ringkasan',
  persetujuan: 'verval', konsistensi: 'verval',
};

let state = null;
let editingId = null;
let printKind = 'penetapan';
let pendingReferenceFile = null;

function defaultProfile(year) {
  return {
    nss: '', akreditasi: '', alamatLengkap: '', ketuaKomite: '',
    pengawas: '', nipPengawas: '', pengawasSignature: '',
    visi: '', misi: '', tujuan: '', dimensi: '',
   tahun: year, website: '',
  };
}

async function loadState() {
  const year = await getSetting('ksp_active_year', currentAcademicYear());
  const [profile, raporReport] = await Promise.all([
    loadSchoolProfile(), loadRaporReport(year),
  ]);
  const [templates, indicators, docs, assessments, team, approvals, staff, resolved, snapshots, references, wizardAll, students] = await Promise.all([
    getSetting('ksp_templates', {}),
    db.ksp_indicators.orderBy('code').toArray(),
    db.ksp_documents.orderBy('updatedAt').reverse().toArray(),
    db.ksp_assessments.toArray(),
    db.ksp_team.toArray(),
    db.ksp_approvals.filter(a => !a.year || a.year === year).toArray(),
    db.staff.toArray(),
    getSetting('ksp_issue_resolved', {}),
    db.ksp_snapshots.orderBy('createdAt').reverse().toArray(),
    db.ksp_references.orderBy('createdAt').reverse().toArray(),
    getSetting('ksp_wizard', {}),
    db.students.toArray(),
  ]);
  state = {
    year, ws: profile, profile: { ...defaultProfile(year), ...profile }, raporReport,
    templates: templates || {},
    indicators, docs, assessments, team, approvals, staff, resolved: resolved || {},
    snapshots, references, students,
    wizard: (wizardAll || {})[year] || {},
    tab: LEGACY_TABS[state?.tab] || state?.tab || 'ringkasan',
    issues: state?.issues || null,
    refQuery: state?.refQuery || '',
    comparison: state?.comparison || null,
  };
}

function checkedSet() {
  return new Set(state.assessments
    .filter(a => a.docId === 0 && a.year === state.year)
    .map(a => a.indicatorId));
}

function score() {
  const total = state.indicators.length || 33;
  const n = checkedSet().size;
  return { n, total, value: Math.round((n / total) * 100) };
}

function grade(value) {
  if (value >= 91) return 'Amat Baik';
  if (value >= 76) return 'Baik';
  if (value >= 61) return 'Cukup';
  return 'Perlu Perbaikan';
}

function kindLabel(kind) {
  return KSP_DOC_KINDS.find(k => k[0] === kind)?.[1] || 'Lainnya';
}

function norm(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

function wizardNote(key) {
  const own = state.wizard[key]?.note;
  if (own) return own;
  const step = STEPS.find(s => s.n === key);
  return (step?.legacy || []).map(n => state.wizard[n]?.note).filter(Boolean).join('\n\n');
}

function wizardStatus(key) {
  const own = state.wizard[key]?.status;
  if (own && own !== 'belum') return own;
  const step = STEPS.find(s => s.n === key);
  return (step?.legacy || []).map(n => state.wizard[n]?.status).find(s => s && s !== 'belum') || 'belum';
}

function normalizedWizard() {
  return Object.fromEntries(STEPS.map(s => [s.n, {
    note: wizardNote(s.n), status: wizardStatus(s.n),
  }]));
}

function runConsistency() {
  const issues = [];
  const add = (id, severity, title, detail) => issues.push({ id, severity, title, detail });
  const year = state.year;
  const finalSteps = STEPS.filter(s => wizardStatus(s.n) === 'final').length;
  const yearPattern = /\b(20\d{2})\/(20\d{2})\b/g;

  // 1. Tahun ajaran tidak seragam.
  const sources = [
    ['Profil sekolah', [state.profile.visi, state.profile.misi, state.profile.tujuan].join(' ')],
    ...state.docs.map(d => [`Dokumen: ${d.title}`, [d.title, d.catatan].join(' ')]),
    ...state.team.map(t => [`Anggota tim: ${t.name}`, t.role || '']),
  ];
  sources.forEach(([source, text], i) => {
    const found = new Set();
    for (const m of String(text || '').matchAll(yearPattern)) {
      const y = `${m[1]}/${m[2]}`;
      if (y !== year) found.add(y);
    }
    if (found.size) add(`year-${i}`, 'tinggi', 'Tahun ajaran tidak seragam',
      `${source} memakai ${[...found].join(', ')}, seharusnya ${year}.`);
  });

  const wsYear = state.ws.academicYear;
  if (wsYear && wsYear !== year) {
    add('ws-year', 'tinggi', 'Tahun ajaran workspace beda',
      `Pengaturan memakai ${wsYear}, E-KSP memakai ${year}. Samakan keduanya.`);
  }

  // 2. Pemetaan guru PAI / PJOK.
  const staffMap = new Map(state.staff.map(s => [norm(s.name), norm(s.jabatan)]));
  state.team.forEach((t, i) => {
    const role = norm(t.role);
    const jabatan = staffMap.get(norm(t.name));
    if (!jabatan) return;
    if (/pai|agama islam/.test(role) && /pjok|penjaskes|olahraga/.test(jabatan)) {
      add(`pai-${i}`, 'tinggi', 'Guru PAI dan PJOK tertukar',
        `${t.name} diberi peran PAI di tim, tetapi di Kepegawaian berjabatan PJOK.`);
    }
    if (/pjok|penjaskes|olahraga/.test(role) && /pai|agama islam/.test(jabatan)) {
      add(`pjok-${i}`, 'tinggi', 'Guru PJOK dan PAI tertukar',
        `${t.name} diberi peran PJOK di tim, tetapi di Kepegawaian berjabatan PAI.`);
    }
  });

  // 3. Nomor dokumen duplikat.
  const numbers = new Map();
  state.docs.forEach(d => {
    if (!d.number) return;
    const key = norm(d.number);
    numbers.set(key, [...(numbers.get(key) || []), d.title]);
  });
  for (const [num, titles] of numbers) {
    if (titles.length > 1) {
      add(`dup-${num}`, 'sedang', 'Nomor dokumen duplikat',
        `Nomor ${num.toUpperCase()} dipakai oleh: ${titles.join(', ')}.`);
    }
  }

  // 4. Kelas yang belum memiliki ATP.
  const covered = new Set();
  state.docs.filter(d => d.kind === 'atp').forEach(d => {
    String(d.kelas || '').split(',').forEach(k => covered.add(k.trim().toUpperCase()));
  });
  const missing = CLASSES.filter(c => !covered.has(c));
  if (state.docs.some(d => d.kind === 'atp') && missing.length) {
    add('atp-kelas', 'sedang', 'ATP belum mencakup semua kelas',
      `Kelas ${missing.join(', ')} belum memiliki ATP terdaftar.`);
  }

  // 5. Dokumen final tanpa nomor.
  state.docs.filter(d => d.status === 'final' && !d.number).forEach(d => {
    add(`final-${d.id}`, 'rendah', 'Dokumen final tanpa nomor',
      `${d.title} berstatus final tetapi belum memiliki nomor.`);
  });

  // 6. Verifikasi sebelum dokumen ditetapkan.
  state.approvals.forEach(a => {
    const signed = new Date(a.signedAt).getTime();
    const docD = typeof a.docDate === 'number' ? a.docDate : new Date(a.docDate).getTime();
    if (Number.isFinite(signed) && Number.isFinite(docD) && signed < docD) {
      add(`approval-${a.id}`, 'tinggi', 'Tanggal verifikasi lebih awal',
        `Verifikasi ${a.type || 'pengawas'} bertanggal ${toISODate(signed)} tetapi penetapan dokumen ${toISODate(docD)}.`);
    }
  });
  const pengawas = state.approvals.find(a => a.type === 'pengawas' && a.status === 'disetujui');
  if (pengawas && checkedSet().size < state.indicators.length) {
    add('verval-belum-lengkap', 'sedang', 'Verifikasi tercatat tetapi checklist belum penuh',
      `Baru ${checkedSet().size} dari ${state.indicators.length} indikator tercentang.`);
  }

  // 7. Wizard penyusunan.
  if (finalSteps < STEPS.length) {
    add('wizard-belum-final', 'rendah', 'Fase penyusunan belum lengkap',
      `Baru ${finalSteps} dari ${STEPS.length} fase dinyatakan final. Lengkapi sebelum penetapan.`);
  }

  // 8. Rapor Pendidikan sebagai dasar analisis dan program prioritas.
  if (!state.raporReport) {
    add('rapor-kosong', 'rendah', 'Rapor Pendidikan belum diimpor',
      'Impor berkas PBD .xlsx pada Profil Sekolah agar BAB I, BAB IV, dan Lampiran RKJP/ARKAS memuat data terbaru.');
  }

  // 9. SK Tim Pengembang sebagai lampiran wajib.
  const ind33 = state.indicators.find(i => i.code === 33);
  if (!state.team.length && ind33 && checkedSet().has(ind33.id)) {
    add('tim-kosong', 'tinggi', 'Indikator 33 tercentang tanpa anggota tim',
      'Tambahkan minimal satu anggota pada menu Dokumen & Surat → Tim Pengembang.');
  }

  return issues;
}

function tokenize(body, ctx) {
  let out = String(body || '');
  for (const [token, value] of Object.entries(ctx)) {
    out = out.split(`{{${token}}}`).join(esc(value ?? '-'));
  }
  return out;
}

function templateContext() {
  const wizard = normalizedWizard();
  const ctx = buildTemplateContext({
    profile: state.profile,
    year: state.year,
    team: state.team,
    staff: state.staff,
    students: state.students,
    approvals: state.approvals,
    docs: state.docs,
    indicators: state.indicators,
    checkedCount: checkedSet().size,
    wizard,
    date: today(),
    raporReport: state.raporReport,
  });
  // Data mentah dipakai template dinamis dan blok tanda tangan.
  Object.assign(ctx, {
    profile: state.profile, team: state.team, staff: state.staff,
    students: state.students, docs: state.docs, wizard,
    indicators: state.indicators, checkedCount: checkedSet().size,
    checkedCodes: checkedSet(),
  });
  return ctx;
}

function printContext() {
  return templateContext();
}

/* ------------------------------------------------------------------ */
/* Render                                                             */
/* ------------------------------------------------------------------ */

export async function renderKsp(main) {
  pendingReferenceFile = null;
  await loadState();

  main.innerHTML = `
    <div class="page-head">
      <h1>E-KSP</h1>
      <span class="muted">Kurikulum Satuan Pendidikan • ${esc(state.year)}</span>
    </div>
    <div class="ksp-tabs" id="ksp-tabs-main">
      ${TABS.map(([key, label, ico]) => `
        <button class="ksp-tab ${state.tab === key ? 'active' : ''}" data-tab="${key}" type="button">
          ${icon(ico, { size: 16 })} ${label}
        </button>`).join('')}
    </div>
    <div id="ksp-panel"></div>
  `;

  const onClick = async e => {
    const tab = e.target.closest('[data-tab]');
    if (tab) { state.tab = tab.dataset.tab; renderPanel(); return; }

    const act = e.target.closest('[data-act]');
    if (!act) return;
    const action = act.dataset.act;

    if (action === 'check-consistency') {
      state.issues = runConsistency();
      state.tab = 'verval';
      renderPanel();
      toast.info(`Pemeriksaan selesai: ${state.issues.filter(i => !state.resolved[i.id]).length} temuan perlu ditindaklanjuti.`);
    } else if (action === 'resolve-issue') {
      state.resolved[act.dataset.id] = Date.now();
      await setSetting('ksp_issue_resolved', state.resolved);
      renderPanel();
    } else if (action === 'unresolve-issue') {
      delete state.resolved[act.dataset.id];
      await setSetting('ksp_issue_resolved', state.resolved);
      renderPanel();
    } else if (action === 'autocheck') {
      const n = await autoCheck();
      state.issues = null;
      await loadState();
      renderPanel();
      toast.success(`${n} indikator dicentang otomatis.`);
    } else if (action === 'edit-doc') {
      editingId = Number(act.dataset.id);
      renderPanel();
      main.querySelector('#ksp-doc-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (action === 'delete-doc') {
      const ok = await confirmDialog({
        title: 'Hapus dokumen?', message: 'Dokumen ini akan dihapus dari daftar E-KSP.',
        confirmText: 'Hapus', danger: true,
      });
      if (!ok) return;
      await db.ksp_documents.delete(Number(act.dataset.id));
      await loadState(); renderPanel();
      toast.success('Dokumen dihapus.');
    } else if (action === 'edit-team') {
      editingId = Number(act.dataset.id);
      renderPanel();
      main.querySelector('#ksp-team-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (action === 'delete-team') {
      await db.ksp_team.delete(Number(act.dataset.id));
      await loadState(); renderPanel();
    } else if (action === 'set-print') {
      printKind = act.dataset.kind;
      renderPanel();
    } else if (action === 'reset-template') {
      const el = main.querySelector('#print-body');
      if (el) el.value = getTemplateBody(printKind, templateContext(), { fresh: true });
      toast.info('Template dikembalikan ke data terbaru.');
    } else if (action === 'open-template') {
      const id = act.dataset.id;
      if (!KSP_TEMPLATES[id]) return;
      printKind = id;
      state.tab = 'dokumen';
      renderPanel();
      main.querySelector('#print-body')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else if (action === 'print-doc') {
      commitPrint();
    } else if (action === 'print-full' || action === 'download-full') {
      const html = fullDocumentHtml();
      if (action === 'print-full') {
        printHtml(html);
      } else {
        download(new Blob([html], { type: 'text/html;charset=utf-8' }), `draf-ksp-${state.year.replace('/', '-')}.html`);
        toast.success('Draf KSP diunduh sebagai HTML.');
      }
    } else if (action === 'approve-stage' || action === 'reject-stage' || action === 'reset-stage') {
      await updateStageStatus(act.dataset.type, action === 'approve-stage' ? 'disetujui' : action === 'reject-stage' ? 'ditolak' : 'menunggu');
    } else if (action === 'restore-snapshot') {
      const ok = await confirmDialog({
        title: 'Pulihkan arsip?',
        message: 'Data tahun ajaran pada arsip ini akan mengganti data tahun yang sama saat ini.',
        confirmText: 'Pulihkan', danger: true,
      });
      if (!ok) return;
      await restoreSnapshot(Number(act.dataset.id));
      toast.success('Arsip dipulihkan.');
    } else if (action === 'delete-snapshot') {
      const ok = await confirmDialog({
        title: 'Hapus arsip?', message: 'Snapshot ini akan dihapus permanen.',
        confirmText: 'Hapus', danger: true,
      });
      if (!ok) return;
      await db.ksp_snapshots.delete(Number(act.dataset.id));
      await loadState(); renderPanel();
    } else if (action === 'use-ref') {
      await useReference(Number(act.dataset.id));
      toast.success('Referensi disalin sebagai draf dokumen tahun berjalan.');
    } else if (action === 'delete-ref') {
      const ok = await confirmDialog({
        title: 'Hapus referensi?', message: 'Referensi buatan pengguna ini akan dihapus.',
        confirmText: 'Hapus', danger: true,
      });
      if (!ok) return;
      await db.ksp_reference_files.where('refId').equals(Number(act.dataset.id)).delete();
      await db.ksp_references.delete(Number(act.dataset.id));
      await loadState(); renderPanel();
    } else if (action === 'download-ref') {
      const ref = state.references.find(r => r.id === Number(act.dataset.id));
      const file = await db.ksp_reference_files.where('refId').equals(ref.id).first();
      if (file) download(file.blob, file.name || 'referensi');
      else toast.warn('Berkas tidak ditemukan. Referensi ini hanya metadata.');
    }
  };

  const onChange = async e => {
    const check = e.target.closest('[data-check]');
    if (check) {
      await setIndicator(Number(check.dataset.check), check.checked);
      return;
    }
    if (e.target.id === 'ref-file') {
      const file = e.target.files?.[0];
      pendingReferenceFile = file ? {
        name: file.name, type: file.type, size: file.size, blob: file,
      } : null;
      const hint = document.getElementById('ref-file-hint');
      if (hint) hint.textContent = file ? `Berkas dipilih: ${file.name}` : 'Belum ada berkas.';
    }
  };

  const onSubmit = async e => {
    if (e.target.id === 'ksp-doc-form') {
      e.preventDefault();
      await saveDoc(new FormData(e.target));
    } else if (e.target.id === 'ksp-team-form') {
      e.preventDefault();
      await saveTeam(new FormData(e.target));
    } else if (e.target.id.startsWith('ksp-stage-form-')) {
      e.preventDefault();
      await saveStage(e.target.id.replace('ksp-stage-form-', ''), new FormData(e.target));
    } else if (e.target.id === 'ksp-print-form') {
      e.preventDefault();
      commitPrint();
    } else if (e.target.id === 'ksp-new-year-form') {
      e.preventDefault();
      await createNewYear(String(new FormData(e.target).get('year') || '').trim());
    } else if (e.target.id === 'ksp-compare-form') {
      e.preventDefault();
      const fd = new FormData(e.target);
      const parse = v => v === '__active__' ? null : Number(v);
      state.comparison = compareSnapshots(parse(fd.get('a')), parse(fd.get('b')));
      renderPanel();
    } else if (e.target.id === 'ksp-snapshot-form') {
      e.preventDefault();
      await saveSnapshot(String(new FormData(e.target).get('label') || '').trim());
    } else if (e.target.id === 'ksp-reference-form') {
      e.preventDefault();
      await saveReference(new FormData(e.target));
    } else if (e.target.id.startsWith('ksp-step-form-')) {
      e.preventDefault();
      await saveStep(e.target.id.replace('ksp-step-form-', ''), new FormData(e.target));
    }
  };

  const onInput = e => {
    if (e.target.id === 'ref-search') {
      state.refQuery = e.target.value;
      const list = document.getElementById('ref-list');
      if (list) list.innerHTML = referenceRows();
    }
  };

  main.addEventListener('click', onClick);
  main.addEventListener('change', onChange);
  main.addEventListener('submit', onSubmit);
  main.addEventListener('input', onInput);

  renderPanel();

  return () => {
    main.removeEventListener('click', onClick);
    main.removeEventListener('change', onChange);
    main.removeEventListener('submit', onSubmit);
    main.removeEventListener('input', onInput);
  };
}

function renderPanel() {
  const panel = document.getElementById('ksp-panel');
  if (!panel) return;
  const views = {
    ringkasan: viewRingkasan,
    dokumen: viewDokumen,
    verval: viewVerval,
    arsip: viewArsip,
  };
  panel.innerHTML = views[state.tab]();

  // Bilah tab berada di luar panel, jadi status aktifnya ikut disinkronkan.
  document.querySelectorAll('#ksp-tabs-main [data-tab]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === state.tab);
  });
}

function viewRingkasan() {
  const s = score();
  const openIssues = (state.issues || []).filter(i => !state.resolved[i.id]);
  const approvedStages = state.approvals.filter(a => a.status === 'disetujui').length;
  const done = STEPS.filter(step => wizardStatus(step.n) === 'final').length;
  const pct = Math.round((done / STEPS.length) * 100);

  return `
    <div class="card" style="border-left:4px solid var(--teal)">
      <h2>KSP ${esc(state.year)} — Alur Singkat</h2>
      <p class="muted">Empat fase: siapkan data di Profil Sekolah, lengkapi dokumen, jalankan verval &amp; persetujuan, lalu cetak hasil. Data identitas dan Rapor tidak diisi ulang di sini.</p>
      <div class="ksp-progress"><span style="width:${pct}%"></span></div>
      <p style="margin:8px 0 0"><strong>${done}/${STEPS.length}</strong> fase final • <strong>${s.n}/${s.total}</strong> indikator (${s.value}%, ${grade(s.value)})</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
        <button class="btn primary" data-act="autocheck" type="button">${icon('RefreshCw', { size: 15 })} Isi Otomatis dari Data</button>
        <button class="btn" data-act="check-consistency" type="button">${icon('ShieldCheck', { size: 15 })} Periksa Konsistensi</button>
        <button class="btn" data-act="print-full" type="button">${icon('Printer', { size: 15 })} Cetak Draf Lengkap</button>
        <button class="btn" data-act="download-full" type="button">${icon('Download', { size: 15 })} Unduh HTML</button>
      </div>
    </div>

    <div class="grid" style="margin-top:16px">
      ${profileSummaryCard()}
      ${raporSummaryCard()}
    </div>

    <div class="card" style="margin-top:16px">
      <h2>Empat Fase Penyusunan</h2>
      <p class="muted">Buka detail fase untuk menulis catatan. Catatan otomatis masuk ke BAB I–VI saat draf dicetak.</p>
      ${STEPS.map((step, i) => {
        const status = wizardStatus(step.n);
        const badge = status === 'final' ? 'selesai' : status === 'draft' ? 'sedang' : '';
        return `
          <details class="ksp-tpl-detail" ${i === 0 ? 'open' : ''}>
            <summary>
              <span class="ksp-badge ${badge}">${esc(status)}</span>
              <strong>${i + 1}. ${esc(step.title)}</strong>
              <small class="muted">${esc(stepHint(step.n))}</small>
            </summary>
            <p class="muted" style="margin:8px 0">${esc(step.desc)}</p>
            <div style="margin-bottom:8px">
              ${step.tab === 'profil'
                ? `<a class="btn sm" href="#/profil">${icon('Building2', { size: 14 })} Buka Profil &amp; Rapor →</a>`
                : `<button class="btn sm" data-tab="${step.tab}" type="button">Buka data terkait →</button>`}
            </div>
            <form class="form" id="ksp-step-form-${step.n}">
              <textarea name="note" rows="3" placeholder="Tuliskan isi/catatan untuk fase ini…">${esc(wizardNote(step.n))}</textarea>
              <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:8px">
                <label style="display:flex;align-items:center;gap:6px;margin:0">Status
                  <select name="status">
                    ${['belum', 'draft', 'final'].map(st => `<option value="${st}" ${status === st ? 'selected' : ''}>${st}</option>`).join('')}
                  </select>
                </label>
                <button class="btn primary sm" type="submit">${icon('Save', { size: 14 })} Simpan fase</button>
              </div>
            </form>
          </details>`;
      }).join('')}
    </div>

    <div class="grid" style="margin-top:16px">
      <div class="card">
        <h2>Status Persetujuan</h2>
        <p style="margin:4px 0"><strong>${approvedStages}/${KSP_APPROVAL_STAGES.length}</strong> tahap disetujui.</p>
        <p class="muted" style="margin:0">Penyusun → Kepala Sekolah → Komite → Pengawas → Dinas.</p>
        <button class="btn sm" data-tab="verval" type="button" style="margin-top:12px">Kelola persetujuan →</button>
      </div>
      <div class="card">
        <h2>Temuan Terbaru</h2>
        ${openIssues.length ? openIssues.slice(0, 5).map(i => `
          <div class="ksp-issue-row">
            <span class="ksp-badge ${i.severity}">${esc(i.severity)}</span>
            <span>${esc(i.title)}</span>
          </div>`).join('') : '<p class="muted">Belum ada pemeriksaan dijalankan atau tidak ada temuan.</p>'}
        <button class="btn sm" data-act="check-consistency" type="button" style="margin-top:10px">Periksa lagi</button>
      </div>
    </div>
  `;
}

function profileSummaryCard() {
  const p = state.profile;
  const row = (label, value) => `
    <tr><td><strong>${label}</strong></td><td>${esc(value || '-')}</td></tr>`;
  return `
    <div class="card" style="border-left:4px solid var(--teal)">
      <h3>Ringkasan Profil Sekolah</h3>
      <table class="ksp-table"><tbody>
        ${row('Nama sekolah', p.name)}
        ${row('NPSN / NSS', [p.npsn, p.nss].filter(Boolean).join(' / '))}
        ${row('Kepala sekolah', p.headmaster)}
        ${row('Akreditasi', p.akreditasi)}
        ${row('Visi / misi / tujuan', [p.visi, p.misi, p.tujuan].filter(Boolean).length + '/3 terisi')}
      </tbody></table>
      <a class="btn sm" href="#/profil" style="margin-top:10px">${icon('Building2', { size: 14 })} Ubah di Profil Sekolah →</a>
    </div>`;
}

function raporSummaryCard() {
  const r = state.raporReport;
  return `
    <div class="card" style="border-left:4px solid var(--teal)">
      <h3>Rapor Pendidikan Kemdikbud</h3>
      ${r ? `
        <p style="margin:4px 0"><strong>Tahun ${esc(r.tahun || '-')}</strong> — ${(r.indicators || []).length} indikator, ${(r.issues || []).length} temuan kuning/merah, ${(r.priorities || []).length} prioritas.</p>
        <p class="muted" style="margin:0">Dipakai otomatis pada BAB I, BAB IV, Lampiran RKJP, dan Lampiran ARKAS.</p>
      ` : '<p class="muted" style="margin:4px 0">Belum ada laporan PBD .xlsx yang dihubungkan ke tahun ajaran ini.</p>'}
      <a class="btn sm" href="#/profil" style="margin-top:10px">${icon('ChartColumn', { size: 14 })} Kelola Rapor →</a>
    </div>`;
}

function stepHint(key) {
  const byKind = k => state.docs.filter(d => d.kind === k).length;
  if (key === 'f1') {
    const kurikulum = [state.profile.visi, state.profile.misi, state.profile.tujuan].filter(Boolean).length;
    return `${kurikulum}/3 visi–misi–tujuan • ${state.raporReport ? 'Rapor terhubung' : 'Rapor belum diimpor'}`;
  }
  if (key === 'f2') {
    return `${byKind('struktur')} struktur • ${byKind('atp')} ATP • ${byKind('modul')} modul • ${byKind('p5')} P5`;
  }
  if (key === 'f3') {
    return wizardNote('f3') ? 'Catatan pendampingan sudah diisi' : 'Catatan pendampingan belum diisi';
  }
  return `${score().value}% verval • ${state.approvals.filter(a => a.status === 'disetujui').length}/${KSP_APPROVAL_STAGES.length} persetujuan`;
}

function viewVerval() {
  const s = score();
  const set = checkedSet();
  let lastGroup = '';

  return `
    <div class="card">
      <h2>Instrumen Verval KSP</h2>
      <p class="muted">Centang komponen yang sudah tersedia. Nilai dihitung otomatis: (jumlah tercentang ÷ 33) × 100.</p>
      <div class="ksp-progress"><span style="width:${s.value}%"></span></div>
      <p style="margin:8px 0 0"><strong>${s.value}</strong> — ${grade(s.value)} (${s.n}/${s.total})</p>
      <div style="margin-top:12px">
        <button class="btn" data-act="autocheck" type="button">${icon('RefreshCw', { size: 15 })} Isi otomatis dari data</button>
      </div>
    </div>
    <div class="card">
      <table class="ksp-table">
        <thead><tr><th style="width:46px">No</th><th>Komponen yang dinilai</th><th style="width:90px">Ada</th></tr></thead>
        <tbody>
          ${state.indicators.map(i => {
            const head = i.group !== lastGroup ? `<tr class="ksp-group"><td colspan="3">${esc(i.group)}</td></tr>` : '';
            lastGroup = i.group;
            return `${head}
              <tr>
                <td>${i.code}</td>
                <td><strong>${esc(i.label)}</strong><br><small class="muted">${esc(i.desc)}</small></td>
                <td style="text-align:center"><input type="checkbox" data-check="${i.code}" ${set.has(i.id) ? 'checked' : ''} aria-label="Indikator ${i.code}"></td>
              </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    ${viewKonsistensi()}
    ${viewPersetujuan()}
  `;
}

function viewDokumen() {
  const doc = editingId ? state.docs.find(d => d.id === editingId) : null;
  const team = state.team.find(t => t.id === editingId);
  const approvedCount = state.approvals.filter(a => a.status === 'disetujui').length;
  const tpl = KSP_TEMPLATES[printKind] || KSP_TEMPLATES.penetapan;
  const ctx = templateContext();
  const body = getTemplateBody(printKind, ctx, { overrides: state.templates });

  return `
    <div class="card">
      <h2>${doc ? 'Edit Dokumen' : 'Tambah Dokumen KSP'}</h2>
      <form class="form" id="ksp-doc-form">
        <input type="hidden" name="id" value="${doc?.id || ''}">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <label>Jenis
            <select name="kind">${KSP_DOC_KINDS.map(([k, l]) => `<option value="${k}" ${doc?.kind === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
          </label>
          <label>Status
            <select name="status">${STATUS.map(s => `<option value="${s}" ${doc?.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
          </label>
          <label>Nomor <input name="number" value="${esc(doc?.number || '')}" placeholder="000/.../YYYY"></label>
          <label>Tanggal <input type="date" name="date" value="${esc(doc?.date || today())}"></label>
          <label>Tahun Ajaran <input name="year" value="${esc(doc?.year || state.year)}"></label>
          <label>Kelas <small class="muted">(untuk ATP/Modul, pisah koma)</small><input name="kelas" value="${esc(doc?.kelas || '')}" placeholder="I, II, III"></label>
        </div>
        <label>Judul <input name="title" value="${esc(doc?.title || '')}" required placeholder="ATP Matematika Kelas V"></label>
        <label>Catatan / Hasil Telaah <textarea name="catatan" rows="2">${esc(doc?.catatan || '')}</textarea></label>
        <div class="form-actions">
          <button class="btn primary" type="submit">${icon(doc ? 'Save' : 'Plus', { size: 16 })} ${doc ? 'Simpan Perubahan' : 'Tambah Dokumen'}</button>
          ${doc ? '<button class="btn" type="button" data-act="edit-doc" data-id="">Batal</button>' : ''}
        </div>
      </form>
    </div>

    <div class="card">
      <h2>Daftar Dokumen (${state.docs.length})</h2>
      ${state.docs.length ? `
        <table class="ksp-table">
          <thead><tr><th>Jenis</th><th>Judul</th><th>Nomor</th><th>Status</th><th>Aksi</th></tr></thead>
          <tbody>${state.docs.map(d => `
            <tr>
              <td>${esc(kindLabel(d.kind))}</td>
              <td><strong>${esc(d.title)}</strong><br><small class="muted">${esc(d.kelas || '')} ${esc(d.year || '')}</small></td>
              <td>${esc(d.number || '-')}</td>
              <td><span class="ksp-status ${esc(d.status)}">${esc(d.status)}</span></td>
              <td>
                <button class="btn sm" data-act="edit-doc" data-id="${d.id}" type="button">${icon('PenLine', { size: 14 })}</button>
                <button class="btn sm danger" data-act="delete-doc" data-id="${d.id}" type="button">${icon('Trash2', { size: 14 })}</button>
              </td>
            </tr>`).join('')}</tbody>
        </table>` : '<p class="muted">Belum ada dokumen terdaftar.</p>'}
    </div>

    <div class="grid">
      <div class="card">
        <h2>Tim Pengembang (${state.team.length})</h2>
        <form class="form" id="ksp-team-form">
          <input type="hidden" name="id" value="${team?.id || ''}">
          <label>Nama <input name="name" value="${esc(team?.name || '')}" required></label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <label>NIP <input name="nip" value="${esc(team?.nip || '')}"></label>
            <label>Peran <input name="role" value="${esc(team?.role || '')}" placeholder="Ketua / Penyusun Bab I"></label>
          </div>
          <button class="btn primary sm" type="submit">${icon(team ? 'Save' : 'Plus', { size: 14 })} ${team ? 'Simpan' : 'Tambah Anggota'}</button>
        </form>
        ${state.team.length ? `<div style="margin-top:12px">${state.team.map(t => `
          <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)">
            <div><strong>${esc(t.name)}</strong><br><small class="muted">${esc(t.role || '-')}</small></div>
            <div>
              <button class="btn sm" data-act="edit-team" data-id="${t.id}" type="button">${icon('PenLine', { size: 13 })}</button>
              <button class="btn sm danger" data-act="delete-team" data-id="${t.id}" type="button">${icon('Trash2', { size: 13 })}</button>
            </div>
          </div>`).join('')}</div>` : ''}
      </div>

      <div class="card">
        <h2>Status Persetujuan</h2>
        <p style="margin:4px 0"><strong>${approvedCount}/${KSP_APPROVAL_STAGES.length}</strong> tahap telah disetujui.</p>
        <p class="muted" style="margin:0 0 12px">Kelola nama, NIP, tanggal, dan persetujuan setiap pihak pada tab Persetujuan.</p>
        <button class="btn sm" data-tab="verval" type="button">${icon('Users', { size: 14 })} Buka Alur Persetujuan →</button>
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <h2>Generator Dokumen & Surat (10 Template Bersih)</h2>
      <p class="muted">Template berasal dari 10 dokumen administratif paket KSP. Data identitas, tim, guru, siswa, dan hasil verval diisi otomatis dari menu Profil Sekolah.</p>
      ${KSP_TEMPLATE_GROUPS.filter(([g]) => g !== 'induk').map(([group, label]) => `
        <div class="ksp-tpl-group">
          <span class="muted">${esc(label)}</span>
          <div class="ksp-tabs">
            ${Object.values(KSP_TEMPLATES).filter(t => t.group === group).map(t => `
              <button class="ksp-tab ${printKind === t.id ? 'active' : ''}" data-act="set-print" data-kind="${t.id}" type="button">
                ${esc(t.name)}${t.corrections.length ? ` <span class="ksp-tpl-fix" title="${t.corrections.length} koreksi">${t.corrections.length}</span>` : ''}
              </button>`).join('')}
          </div>
        </div>`).join('')}
      <form class="form" id="ksp-print-form" style="margin-top:14px">
        <label>Isi Dokumen <textarea id="print-body" name="body" rows="14" style="font-family:monospace;font-size:12px">${esc(body)}</textarea></label>
        <p class="muted" style="font-size:12px;margin:0">
          Token pada template ini: ${tpl.tokens.map(t => `<code>{{${esc(t)}}}</code>`).join(' ')}
        </p>
        <details style="margin-top:8px;font-size:12.5px">
          <summary class="muted">Daftar token lengkap &amp; koreksi dokumen asli</summary>
          <p style="margin:8px 0 4px"><strong>Sumber:</strong> ${esc(tpl.source)}</p>
          <p style="margin:4px 0"><strong>${tpl.tokens.length} token:</strong> ${KSP_TEMPLATE_TOKENS.map(([k, l]) => `<code title="${esc(l)}">{{${esc(k)}}}</code>`).join(' ')}</p>
          ${tpl.corrections.length ? `<ul>${tpl.corrections.map(c => `<li><s>${esc(c.before)}</s> → <strong>${esc(c.after)}</strong> <span class="muted">${esc(c.note)}</span></li>`).join('')}</ul>` : '<p class="muted">Tidak ada koreksi tercatat.</p>'}
        </details>
        <div class="form-actions">
          <button class="btn primary" type="submit">${icon('Printer', { size: 16 })} Cetak / Simpan PDF</button>
          <button class="btn" data-act="reset-template" type="button">${icon('RotateCcw', { size: 15 })} Isi ulang dari data</button>
        </div>
      </form>
    </div>
  `;
}

function stageUnlocked(order) {
  return KSP_APPROVAL_STAGES
    .filter(s => s.order < order)
    .every(s => state.approvals.find(a => a.type === s.type)?.status === 'disetujui');
}

function viewPersetujuan() {
  const stages = KSP_APPROVAL_STAGES.map(s => ({
    ...s,
    data: state.approvals.find(a => a.type === s.type) || {},
  }));
  const approved = stages.filter(s => s.data.status === 'disetujui').length;
  const pct = Math.round((approved / stages.length) * 100);

  return `
    <div class="card">
      <h2>Alur Persetujuan KSP ${esc(state.year)}</h2>
      <p class="muted">Persetujuan berurutan: Penyusun → Kepala Sekolah → Ketua Komite → Pengawas → Dinas. Tahap berikutnya baru dapat disetujui setelah tahap sebelumnya selesai.</p>
      <div class="ksp-progress"><span style="width:${pct}%"></span></div>
      <p style="margin:8px 0 0"><strong>${approved}/${stages.length}</strong> tahap disetujui.</p>
      <div class="ksp-flow" style="margin-top:14px">
        ${stages.map(s => {
          const status = s.data.status || 'menunggu';
          return `<div class="ksp-flow-item ${status}">
            <span class="ksp-flow-dot">${s.order}</span>
            <span>${esc(s.label)}</span>
            <small>${status}</small>
          </div>`;
        }).join('')}
      </div>
    </div>

    ${stages.map(s => {
      const d = s.data;
      const unlocked = stageUnlocked(s.order);
      const status = d.status || 'menunggu';
      const badge = status === 'disetujui' ? 'selesai' : status === 'ditolak' ? 'tinggi' : '';
      return `
        <div class="card ksp-stage ${status}" style="margin-top:14px">
          <div class="ksp-issue-head">
            <span class="ksp-badge ${badge}">${esc(status)}</span>
            <strong>${s.order}. ${esc(s.label)}</strong>
            ${d.signedAt ? `<small class="muted">${esc(toISODate(d.signedAt))}</small>` : ''}
          </div>
          ${!unlocked ? '<p class="muted" style="margin:8px 0"><strong>Terkunci.</strong> Selesaikan tahap sebelumnya terlebih dahulu.</p>' : ''}
          <form class="form" id="ksp-stage-form-${s.type}" style="margin-top:10px">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
              <label>Nama <input name="name" value="${esc(d.name || defaultStageName(s.type))}"></label>
              <label>NIP <input name="nip" value="${esc(d.nip || defaultStageNip(s.type))}"></label>
              <label>Tanggal <input type="date" name="date" value="${esc(d.signedAt ? toISODate(d.signedAt) : today())}"></label>
              <label>Jabatan <input name="role" value="${esc(d.role || s.role)}"></label>
            </div>
            <label>Catatan <textarea name="note" rows="2" placeholder="Catatan persetujuan / tindak lanjut">${esc(d.note || '')}</textarea></label>
            <div class="form-actions" style="display:flex;gap:8px;flex-wrap:wrap">
              <button class="btn primary sm" type="submit">${icon('Save', { size: 14 })} Simpan</button>
              <button class="btn sm" data-act="approve-stage" data-type="${s.type}" type="button" ${unlocked ? '' : 'disabled'}>${icon('Check', { size: 14 })} Setujui</button>
              <button class="btn sm danger" data-act="reject-stage" data-type="${s.type}" type="button" ${unlocked ? '' : 'disabled'}>${icon('CircleX', { size: 14 })} Tolak</button>
              <button class="btn sm" data-act="reset-stage" data-type="${s.type}" type="button">${icon('RotateCcw', { size: 14 })} Reset</button>
            </div>
          </form>
        </div>`;
    }).join('')}
  `;
}

function defaultStageName(type) {
  if (type === 'kepala') return state.ws.headmaster || '';
  if (type === 'komite') return state.profile.ketuaKomite || '';
  if (type === 'pengawas') return state.profile.pengawas || '';
  if (type === 'penyusun') return state.team[0]?.name || '';
  return '';
}

function defaultStageNip(type) {
  if (type === 'kepala') return state.ws.headmasterNip || '';
  if (type === 'pengawas') return state.profile.nipPengawas || '';
  return '';
}

function nextAcademicYear(year) {
  const m = /^(\d{4})\/(\d{4})$/.exec(String(year || ''));
  if (!m) return currentAcademicYear();
  const start = Number(m[1]) + 1;
  return `${start}/${start + 1}`;
}

function viewArsip() {
  const nextYear = nextAcademicYear(state.year);

  return `
    <div class="grid">
      <div class="card">
        <h2>Buat KSP Tahun Baru</h2>
        <p class="muted">Menyalin struktur tahun berjalan sebagai draf tahun berikutnya. Arsip tahun lama otomatis disimpan.</p>
        <form class="form" id="ksp-new-year-form">
          <label>Tahun Ajaran Baru
            <input name="year" value="${esc(nextYear)}" placeholder="YYYY/YYYY" required pattern="20\\d{2}/20\\d{2}">
          </label>
          <button class="btn primary" type="submit">${icon('Copy', { size: 16 })} Buat Draf Tahun Baru</button>
        </form>
      </div>
      <div class="card">
        <h2>Simpan Snapshot</h2>
        <p class="muted">Simpan keadaan KSP saat ini sebelum direvisi, misalnya sebelum rapat pleno.</p>
        <form class="form" id="ksp-snapshot-form">
          <label>Label Arsip <input name="label" value="KSP ${esc(state.year)} — ${esc(today())}" required></label>
          <button class="btn" type="submit">${icon('Save', { size: 16 })} Simpan Snapshot</button>
        </form>
      </div>
    </div>

    <div class="card" style="margin-top:16px">
      <h2>Arsip Tersimpan (${state.snapshots.length})</h2>
      ${state.snapshots.length ? state.snapshots.map(s => `
        <div class="ksp-issue-row">
          <div style="flex:1">
            <strong>${esc(s.label || `KSP ${s.year}`)}</strong><br>
            <small class="muted">${esc(s.year)} • ${esc(new Date(s.createdAt).toLocaleString('id-ID'))} • ${(s.docs || []).length} dokumen</small>
          </div>
          <button class="btn sm" data-act="restore-snapshot" data-id="${s.id}" type="button">Pulihkan</button>
          <button class="btn sm danger" data-act="delete-snapshot" data-id="${s.id}" type="button">${icon('Trash2', { size: 14 })}</button>
        </div>`).join('') : '<p class="muted">Belum ada arsip. Snapshot otomatis dibuat saat membuat tahun baru.</p>'}
    </div>

    <div class="card" style="margin-top:16px">
      <h2>Bandingkan Arsip</h2>
      <p class="muted">Bandingkan dua snapshot, atau snapshot dengan data yang sedang aktif.</p>
      <form class="form" id="ksp-compare-form">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <label>Sebelum
            <select name="a">
              ${state.snapshots.map((s, i) => `<option value="${s.id}" ${i === 0 ? 'selected' : ''}>${esc(s.label || `KSP ${s.year}`)}</option>`).join('')}
              <option value="__active__" ${!state.snapshots.length ? 'selected' : ''}>Aktif — ${esc(state.year)}</option>
            </select>
          </label>
          <label>Sesudah
            <select name="b">
              ${state.snapshots.map(s => `<option value="${s.id}">${esc(s.label || `KSP ${s.year}`)}</option>`).join('')}
              <option value="__active__" selected>Aktif — ${esc(state.year)}</option>
            </select>
          </label>
        </div>
        <button class="btn" type="submit">${icon('Search', { size: 15 })} Bandingkan</button>
      </form>
      ${state.comparison ? comparisonHtml() : ''}
    </div>

    <div class="card" style="margin-top:16px">
      <h2>Pustaka Template &amp; Referensi (${state.references.length})</h2>
      <p class="muted">Template bawaan KSP sudah memakai token, form/rekap dihitung dari data, dan dokumen induk disusun ulang sebagai BAB I–VI + lampiran. Koreksi terhadap berkas referensi tercatat pada tiap entri.</p>
      <label style="max-width:360px">Cari referensi <input id="ref-search" value="${esc(state.refQuery)}" placeholder="Judul, jenis, atau kata kunci…"></label>

      <form class="form" id="ksp-reference-form" style="margin-top:16px;padding:14px;border:1px solid var(--border);border-radius:var(--radius-sm)">
        <h3 style="margin:0 0 8px">Tambah Referensi</h3>
        <label>Judul <input name="title" required placeholder="Contoh: KSP Tahun YYYY/YYYY"></label>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
          <label>Jenis <select name="kind">${KSP_DOC_KINDS.map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
          <label>Tahun <input name="year" value="${esc(state.year)}"></label>
        </div>
        <label>Sumber / Nama Berkas <input name="source" placeholder="nama-file.pdf"></label>
        <label>Catatan <textarea name="notes" rows="2" placeholder="Ringkasan atau hal yang perlu diperhatikan"></textarea></label>
        <label>Berkas Pendukung <input type="file" id="ref-file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.png"></label>
        <small class="muted" id="ref-file-hint">Belum ada berkas.</small>
        <div class="form-actions" style="margin-top:10px">
          <button class="btn primary sm" type="submit">${icon('Plus', { size: 14 })} Tambah Referensi</button>
        </div>
      </form>

      <div id="ref-list" style="margin-top:16px">${referenceRows()}</div>
    </div>
  `;
}

function referenceRows() {
  const q = norm(state.refQuery);
  const rows = state.references.filter(r => {
    if (!q) return true;
    return norm([r.title, r.kind, r.year, r.source, r.notes].join(' ')).includes(q);
  });
  if (!rows.length) return '<p class="muted">Tidak ada referensi yang cocok.</p>';

  return rows.map(r => `
    <div class="ksp-issue">
      <div class="ksp-issue-head">
        <span class="ksp-badge ${r.builtIn ? 'rendah' : 'selesai'}">${r.builtIn ? 'bawaan' : 'pengguna'}</span>
        <strong>${esc(r.title)}</strong>
        ${r.templateId && KSP_TEMPLATES[r.templateId]
          ? `<button class="btn sm primary" data-act="open-template" data-id="${esc(r.templateId)}" type="button">${icon('FileText', { size: 13 })} Buka Template</button>` : ''}
        <button class="btn sm" data-act="use-ref" data-id="${r.id}" type="button">Pakai</button>
        ${r.hasFile ? `<button class="btn sm" data-act="download-ref" data-id="${r.id}" type="button">${icon('Download', { size: 14 })}</button>` : ''}
        ${!r.builtIn ? `<button class="btn sm danger" data-act="delete-ref" data-id="${r.id}" type="button">${icon('Trash2', { size: 14 })}</button>` : ''}
      </div>
      <p class="muted" style="margin:6px 0 0">
        ${esc(kindLabel(r.kind))} • ${esc(r.year || '-')}${r.groupLabel ? ` • ${esc(r.groupLabel)}` : ''}${r.source ? ` • ${esc(r.source)}` : ''}
      </p>
      ${r.notes ? `<p class="muted" style="margin:4px 0 0">${esc(r.notes)}</p>` : ''}
      ${r.tokens?.length || r.corrections?.length ? `
        <details class="ksp-tpl-detail">
          <summary class="muted">Token &amp; koreksi (${(r.tokens || []).length} token, ${(r.corrections || []).length} koreksi)</summary>
          ${r.tokens?.length ? `<p style="margin:8px 0 4px">${r.tokens.map(t => `<code>{{${esc(t)}}}</code>`).join(' ')}</p>` : ''}
          ${r.corrections?.length ? `<ul>${r.corrections.map(c => `<li><s>${esc(c.before)}</s> → <strong>${esc(c.after)}</strong><br><small class="muted">${esc(c.note)}</small></li>`).join('')}</ul>` : ''}
        </details>` : ''}
    </div>`).join('');
}

function viewKonsistensi() {
  const issues = state.issues || [];
  const unresolved = issues.filter(i => !state.resolved[i.id]);
  const resolved = issues.filter(i => state.resolved[i.id]);

  return `
    <div class="card">
      <h2>Cek Konsistensi Dokumen</h2>
      <p class="muted">Memindai tahun ajaran, nomor SK, pemetaan guru PAI/PJOK, cakupan ATP, tanggal verifikasi, dan kelengkapan checklist.</p>
      <button class="btn primary" data-act="check-consistency" type="button">${icon('Search', { size: 16 })} Jalankan Pemeriksaan</button>
    </div>
    ${issues.length ? `
      <div class="card">
        <h2>Temuan (${unresolved.length} belum ditangani)</h2>
        ${unresolved.map(i => `
          <div class="ksp-issue">
            <div class="ksp-issue-head">
              <span class="ksp-badge ${i.severity}">${esc(i.severity)}</span>
              <strong>${esc(i.title)}</strong>
              <button class="btn sm" data-act="resolve-issue" data-id="${esc(i.id)}" type="button">${icon('Check', { size: 14 })} Tandai diperbaiki</button>
            </div>
            <p class="muted" style="margin:6px 0 0">${esc(i.detail)}</p>
          </div>`).join('') || '<p class="muted" style="color:var(--success)">Semua temuan sudah ditandai diperbaiki.</p>'}
      </div>
      ${resolved.length ? `
        <div class="card">
          <h2>Sudah Ditandai Diperbaiki (${resolved.length})</h2>
          ${resolved.map(i => `
            <div class="ksp-issue-row">
              <span class="ksp-badge selesai">selesai</span>
              <span>${esc(i.title)}</span>
              <button class="btn sm" data-act="unresolve-issue" data-id="${esc(i.id)}" type="button">Pulihkan</button>
            </div>`).join('')}
        </div>` : ''}
    ` : '<div class="card"><p class="muted">Belum ada hasil pemeriksaan. Klik tombol di atas untuk memulai.</p></div>'}
  `;
}

/* ------------------------------------------------------------------ */
/* Actions                                                            */
/* ------------------------------------------------------------------ */

async function setIndicator(code, checked) {
  const ind = state.indicators.find(i => i.code === code);
  if (!ind) return;
  const rows = await db.ksp_assessments.toArray();
  const row = rows.find(a => a.docId === 0 && a.year === state.year && a.indicatorId === ind.id);
  if (checked && !row) {
    await db.ksp_assessments.add({
      docId: 0, year: state.year, indicatorId: ind.id,
      checked: true, assessedAt: Date.now(),
    });
  } else if (!checked && row) {
    await db.ksp_assessments.delete(row.id);
  }
  state.assessments = await db.ksp_assessments.toArray();
  renderPanel();
}

async function autoCheck() {
  const codes = new Set();
  const has = kind => state.docs.some(d => d.kind === kind);
  if (state.docs.some(d => /penetapan/i.test(d.title))) codes.add(3);
  if (has('peraturan-akademik')) codes.add(20);
  if (has('kalender')) codes.add(21);
  if (state.docs.some(d => d.kind === 'p5')) codes.add(15);
  if (has('atp')) codes.add(18);
  if (has('modul')) codes.add(19);
  if (state.team.length) codes.add(33);

  const inds = await db.ksp_indicators.toArray();
  const existing = await db.ksp_assessments.toArray();
  let added = 0;
  for (const code of codes) {
    const ind = inds.find(i => i.code === code);
    if (!ind) continue;
    const exists = existing.some(a => a.docId === 0 && a.year === state.year && a.indicatorId === ind.id);
    if (!exists) {
      await db.ksp_assessments.add({
        docId: 0, year: state.year, indicatorId: ind.id,
        checked: true, note: 'Otomatis dari data E-KSP', assessedAt: Date.now(),
      });
      added++;
    }
  }
  return added;
}

async function saveDoc(fd) {
  const id = fd.get('id');
  const payload = {
    kind: fd.get('kind'),
    title: String(fd.get('title') || '').trim(),
    number: String(fd.get('number') || '').trim(),
    status: fd.get('status'),
    date: fd.get('date') || today(),
    year: String(fd.get('year') || state.year).trim(),
    kelas: String(fd.get('kelas') || '').trim(),
    catatan: String(fd.get('catatan') || '').trim(),
    updatedAt: Date.now(),
  };
  const prev = id ? await db.ksp_documents.get(Number(id)) : null;
  if (id) await db.ksp_documents.update(Number(id), payload);
  else await db.ksp_documents.add(payload);

  if (payload.status === 'revisi' && prev?.status !== 'revisi') {
    const due = toISODate(Date.now() + 7 * 86400000);
    await db.tasks.add({
      title: `Revisi ${kindLabel(payload.kind)} — ${payload.title}`,
      status: 'open', dueDate: due, createdAt: Date.now(), meetingId: null,
    });
    toast.info('Tugas revisi otomatis dibuat di menu Tugas.');
  }

  editingId = null;
  state.issues = null;
  await loadState(); renderPanel();
  toast.success(id ? 'Dokumen diperbarui.' : 'Dokumen ditambahkan.');
}

async function saveTeam(fd) {
  const id = fd.get('id');
  const payload = {
    year: state.year,
    name: String(fd.get('name') || '').trim(),
    nip: String(fd.get('nip') || '').trim(),
    role: String(fd.get('role') || '').trim(),
  };
  if (id) await db.ksp_team.update(Number(id), payload);
  else await db.ksp_team.add({ ...payload, createdAt: Date.now() });
  editingId = null;
  state.issues = null;
  await loadState(); renderPanel();
}

function stagePatch(fd, currentStatus, forcedStatus = null) {
  const date = String(fd.get('date') || '');
  const status = forcedStatus || currentStatus || 'menunggu';
  return {
    name: String(fd.get('name') || '').trim(),
    nip: String(fd.get('nip') || '').trim(),
    role: String(fd.get('role') || '').trim(),
    note: String(fd.get('note') || '').trim(),
    status,
    signedAt: date ? new Date(`${date}T00:00:00`).getTime()
      : (status === 'disetujui' ? Date.now() : null),
  };
}

async function saveStage(type, fd) {
  const row = await db.ksp_approvals.where('year').equals(state.year).filter(a => a.type === type).first();
  if (!row) return;
  await db.ksp_approvals.update(row.id, stagePatch(fd, row.status));
  await loadState(); renderPanel();
  toast.success('Data tahap tersimpan.');
}

async function updateStageStatus(type, status) {
  const stage = KSP_APPROVAL_STAGES.find(s => s.type === type);
  if (!stage) return;
  if (status !== 'menunggu' && !stageUnlocked(stage.order)) {
    toast.warn('Tahap sebelumnya belum disetujui.');
    return;
  }
  const form = document.getElementById(`ksp-stage-form-${type}`);
  const fd = form ? new FormData(form) : new FormData();
  const row = await db.ksp_approvals.where('year').equals(state.year).filter(a => a.type === type).first();
  if (!row) return;
  await db.ksp_approvals.update(row.id, stagePatch(fd, row.status, status));

  if (status === 'ditolak') {
    for (const next of KSP_APPROVAL_STAGES.filter(s => s.order > stage.order)) {
      const r = await db.ksp_approvals.where('year').equals(state.year).filter(a => a.type === next.type).first();
      if (r) await db.ksp_approvals.update(r.id, { status: 'menunggu', signedAt: null });
    }
  }

  state.issues = null;
  await loadState(); renderPanel();
  toast.success(status === 'disetujui' ? 'Tahap disetujui.' : status === 'ditolak' ? 'Tahap ditolak.' : 'Tahap direset.');
}

function packageFromSource(id) {
  if (id === null) {
    return {
      label: `Aktif — ${state.year}`, year: state.year,
      profile: state.profile, docs: state.docs, team: state.team,
      assessments: state.assessments, approvals: state.approvals,
    };
  }
  const s = state.snapshots.find(x => x.id === id);
  return {
    label: s?.label || `Arsip ${id}`, year: s?.year || '-',
    profile: s?.profile || {}, docs: s?.docs || [], team: s?.team || [],
    assessments: s?.assessments || [], approvals: s?.approvals || [],
  };
}

function shortText(s, max = 70) {
  const v = String(s || '').replace(/\s+/g, ' ').trim();
  return v.length > max ? `${v.slice(0, max)}…` : (v || '-');
}

function compareSnapshots(aId, bId) {
  const a = packageFromSource(aId);
  const b = packageFromSource(bId);
  const total = state.indicators.length || 33;
  const scoreOf = src => Math.round(((src.assessments || []).length / total) * 100);
  const approvedOf = src => (src.approvals || []).filter(x => x.status === 'disetujui').length;

  const rows = [
    ['Tahun ajaran', a.year, b.year],
    ['Akreditasi', a.profile.akreditasi || '-', b.profile.akreditasi || '-'],
    ['Visi', shortText(a.profile.visi, 55), shortText(b.profile.visi, 55)],
    ['Ketua komite', a.profile.ketuaKomite || '-', b.profile.ketuaKomite || '-'],
    ['Pengawas', a.profile.pengawas || '-', b.profile.pengawas || '-'],
    ['Jumlah dokumen', a.docs.length, b.docs.length],
    ['Jumlah anggota tim', a.team.length, b.team.length],
    ['Indikator tercentang', a.assessments.length, b.assessments.length],
    ['Nilai verval', scoreOf(a), scoreOf(b)],
    ['Tahap disetujui', approvedOf(a), approvedOf(b)],
  ];

  const titles = src => new Set(src.docs.map(d => d.title));
  const aTitles = titles(a); const bTitles = titles(b);
  const names = src => new Set(src.team.map(t => t.name));
  const aNames = names(a); const bNames = names(b);

  return {
    aLabel: a.label, bLabel: b.label, rows,
    docsAdded: b.docs.filter(d => !aTitles.has(d.title)).map(d => d.title),
    docsRemoved: a.docs.filter(d => !bTitles.has(d.title)).map(d => d.title),
    teamAdded: b.team.filter(t => !aNames.has(t.name)).map(t => t.name),
    teamRemoved: a.team.filter(t => !bNames.has(t.name)).map(t => t.name),
  };
}

function comparisonHtml() {
  const c = state.comparison;
  const list = (title, arr) => arr.length
    ? `<div><strong>${title} (${arr.length})</strong><ul>${arr.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>`
    : '';
  return `
    <div class="ksp-compare">
      <p class="muted"><strong>${esc(c.aLabel)}</strong> → <strong>${esc(c.bLabel)}</strong></p>
      <table class="ksp-table">
        <thead><tr><th>Aspek</th><th>Sebelum</th><th>Sesudah</th></tr></thead>
        <tbody>${c.rows.map(r => `
          <tr class="${String(r[1]) !== String(r[2]) ? 'changed' : ''}">
            <td>${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td>
          </tr>`).join('')}</tbody>
      </table>
      <div class="ksp-compare-lists">
        ${list('Dokumen baru', c.docsAdded)}
        ${list('Dokumen dihapus', c.docsRemoved)}
        ${list('Anggota tim baru', c.teamAdded)}
        ${list('Anggota tim keluar', c.teamRemoved)}
      </div>
    </div>`;
}

async function commitPrint() {
  const ctx = templateContext();
  const rawBody = document.getElementById('print-body')?.value
    || getTemplateBody(printKind, ctx, { overrides: state.templates });
  ctx.renderedBody = rawBody;
  const html = renderKspTemplate(printKind, ctx);
  const templates = await getSetting('ksp_templates', {});
  templates[printKind] = { name: KSP_TEMPLATES[printKind].name, body: rawBody };
  await setSetting('ksp_templates', templates);
  printHtml(html);
}

function studentsByClass() {
  const map = {};
  for (const s of state.students) {
    if (s.status && s.status !== 'Aktif') continue;
    const k = String(s.kelas || '').trim();
    if (!k) continue;
    map[k] = (map[k] || 0) + 1;
  }
  return map;
}

function fullDocumentHtml() {
  const ctx = templateContext();
  ctx.penetapanHtml = tokenize(
    getTemplateBody('penetapan', ctx, { overrides: state.templates }), ctx,
  );
  return renderKspTemplate('ksp', ctx);
}

async function saveStep(key, fd) {
  const all = await getSetting('ksp_wizard', {});
  if (!all[state.year]) all[state.year] = {};
  all[state.year][key] = {
    note: String(fd.get('note') || '').trim(),
    status: String(fd.get('status') || 'belum'),
    updatedAt: Date.now(),
  };
  await db.settings.put({ key: 'ksp_wizard', value: all });
  await loadState(); renderPanel();
  const step = STEPS.find(s => s.n === key);
  toast.success(`Fase ${step ? STEPS.indexOf(step) + 1 : key} tersimpan.`);
}

async function buildSnapshot(label) {
  const year = state.year;
  const approvals = await db.ksp_approvals.toArray();
  return {
    year,
    label: label || `KSP ${year}`,
    createdAt: Date.now(),
    profile: { ...state.profile },
    templates: { ...state.templates },
    wizard: { ...state.wizard },
    docs: await db.ksp_documents.where('year').equals(year).toArray(),
    team: await db.ksp_team.where('year').equals(year).toArray(),
    assessments: await db.ksp_assessments.where('year').equals(year).toArray(),
    approvals: approvals.filter(a => !a.year || a.year === year),
  };
}

async function saveSnapshot(label) {
  await db.ksp_snapshots.add(await buildSnapshot(label));
  state.issues = null;
  await loadState(); renderPanel();
  toast.success('Snapshot tersimpan.');
}

async function createNewYear(newYear) {
  if (!/^20\d{2}\/20\d{2}$/.test(newYear)) {
    toast.error('Format tahun ajaran harus seperti YYYY/YYYY.');
    return;
  }
  const oldYear = state.year;
  if (newYear === oldYear) {
    toast.warn('Tahun ajaran yang dimasukkan sama dengan yang aktif.');
    return;
  }
  const [existing, existingTeam] = await Promise.all([
    db.ksp_documents.where('year').equals(newYear).count(),
    db.ksp_team.where('year').equals(newYear).count(),
  ]);
  if (existing || existingTeam) {
    toast.error(`Tahun ${newYear} sudah memiliki data (${existing} dokumen, ${existingTeam} anggota tim). Pulihkan arsip atau hapus dulu.`);
    return;
  }
  const ok = await confirmDialog({
    title: 'Buat draf tahun baru?',
    message: `Struktur KSP ${oldYear} akan disalin sebagai draf ${newYear}. Tahun lama tetap tersimpan di arsip.`,
    confirmText: 'Buat draf',
  });
  if (!ok) return;

  await db.ksp_snapshots.add(await buildSnapshot(`Sebelum pindah ke ${newYear}`));
  const replaceYear = s => String(s ?? '').split(oldYear).join(newYear);

  const allWizard = await getSetting('ksp_wizard', {});
  allWizard[newYear] = JSON.parse(JSON.stringify(allWizard[oldYear] || {}).split(oldYear).join(newYear));
  await db.settings.put({ key: 'ksp_wizard', value: allWizard });

  for (const stage of KSP_APPROVAL_STAGES) {
    const exists = await db.ksp_approvals
      .where('year').equals(newYear).filter(a => a.type === stage.type).first();
    if (!exists) {
      await db.ksp_approvals.add({
        docId: 0, year: newYear, type: stage.type, stage: stage.order,
        status: 'menunggu', role: stage.role, name: '', nip: '', note: '',
        signedAt: null, createdAt: Date.now(),
      });
    }
  }

  let nextProfile;
  await db.transaction('rw', db.ksp_documents, db.ksp_team, db.ksp_assessments, db.settings, async () => {
    const docs = await db.ksp_documents.where('year').equals(oldYear).toArray();
    for (const d of docs) {
      const { id, ...rest } = d;
      await db.ksp_documents.add({
        ...rest,
        year: newYear,
        status: 'draft',
        number: '',
        title: replaceYear(d.title),
        catatan: `Dari tahun ${oldYear}. ${replaceYear(d.catatan || '')}`.trim(),
        updatedAt: Date.now(),
      });
    }

    const team = await db.ksp_team.where('year').equals(oldYear).toArray();
    for (const t of team) {
      const { id, ...rest } = t;
      await db.ksp_team.add({ ...rest, year: newYear, role: replaceYear(t.role) });
    }

    const assessments = await db.ksp_assessments.where('year').equals(oldYear).toArray();
    for (const a of assessments) {
      const { id, ...rest } = a;
      await db.ksp_assessments.add({
        ...rest,
        year: newYear,
        note: `Dari tahun ${oldYear} — perlu ditelaah ulang.`,
      });
    }

    nextProfile = { ...state.profile, tahun: newYear };
    for (const key of ['visi', 'misi', 'tujuan', 'dimensi', 'alamatLengkap', 'website']) {
      nextProfile[key] = replaceYear(nextProfile[key]);
    }
  });
  await saveSchoolProfile({ ...nextProfile, tahun: newYear });

  state.tab = 'dashboard';
  state.issues = null;
  await loadState(); renderPanel();
  toast.success(`Draf KSP ${newYear} dibuat. Verifikasi perlu diisi ulang.`);
}

async function restoreSnapshot(id) {
  const snap = await db.ksp_snapshots.get(id);
  if (!snap) return;
  await db.transaction('rw', db.ksp_documents, db.ksp_team, db.ksp_assessments, db.ksp_approvals, db.settings, async () => {
    for (const table of [db.ksp_documents, db.ksp_team, db.ksp_assessments]) {
      await table.where('year').equals(snap.year).delete();
    }
    await db.ksp_approvals.clear();
    for (const d of snap.docs || []) {
      const { id, ...rest } = d;
      await db.ksp_documents.add(rest);
    }
    for (const t of snap.team || []) {
      const { id, ...rest } = t;
      await db.ksp_team.add(rest);
    }
    for (const a of snap.assessments || []) {
      const { id, ...rest } = a;
      await db.ksp_assessments.add(rest);
    }
    for (const a of snap.approvals || []) {
      const { id, ...rest } = a;
      await db.ksp_approvals.add(rest);
    }
    if (snap.templates) await db.settings.put({ key: 'ksp_templates', value: snap.templates });
    const allWizard = await getSetting('ksp_wizard', {});
    allWizard[snap.year] = snap.wizard || {};
    await db.settings.put({ key: 'ksp_wizard', value: allWizard });
  });
  await saveSchoolProfile({ ...(snap.profile || {}), tahun: snap.year });
  state.tab = 'dashboard';
  state.issues = null;
  await loadState(); renderPanel();
}

async function saveReference(fd) {
  const file = pendingReferenceFile;
  const id = await db.ksp_references.add({
    kind: fd.get('kind'),
    year: String(fd.get('year') || '').trim(),
    title: String(fd.get('title') || '').trim(),
    source: String(fd.get('source') || '').trim(),
    notes: String(fd.get('notes') || '').trim(),
    builtIn: false,
    hasFile: !!file,
    fileName: file?.name || '',
    createdAt: Date.now(),
  });
  if (file) {
    await db.ksp_reference_files.add({
      refId: id, name: file.name, type: file.type, size: file.size, blob: file.blob,
    });
  }
  pendingReferenceFile = null;
  await loadState(); renderPanel();
  toast.success('Referensi ditambahkan.');
}

async function useReference(id) {
  const ref = await db.ksp_references.get(id);
  if (!ref) return;
  await db.ksp_documents.add({
    kind: ref.kind,
    title: ref.title,
    number: '',
    status: 'draft',
    date: today(),
    year: state.year,
    kelas: '',
    catatan: [
      `Referensi${ref.source ? ` (${ref.source})` : ''}. ${ref.notes || ''}`.trim(),
      ...(ref.corrections || []).map(c => `Koreksi: ${c.before} → ${c.after} (${c.note})`),
    ].join('\n'),
    updatedAt: Date.now(),
  });
  state.issues = null;
  await loadState(); renderPanel();
}

