/**
 * TKA Studio — pages/preview.js
 * © 2026 Ekwan Nugroho — Wonogiri
 */
import { h } from 'https://esm.sh/preact@10.24.3';
import { useState, useMemo } from 'https://esm.sh/preact@10.24.3/hooks';
import htm from 'https://esm.sh/htm@3.1.1';
import {
  ArrowLeft, ArrowRight, CircleDot, ListChecks, CheckCheck,
  Pencil, Trash2, CopyPlus, X, Check, AlertTriangle, MessageCircle,
  Image as ImageIcon, Printer,
} from 'https://esm.sh/lucide-preact@0.460.0?deps=preact@10.24.3';
import { loadDraft, saveDraft } from '../stores/studio.js';
import { checkQuality } from '../lib/quality-checks.js';
import { Stepper } from '../components/Stepper.js';

const html = htm.bind(h);

const TIPE_META = {
  pg:   { label: 'PG',   Icon: CircleDot,  cls: 'badge-pg' },
  mcma: { label: 'MCMA', Icon: ListChecks, cls: 'badge-mcma' },
  bs:   { label: 'B/S',  Icon: CheckCheck, cls: 'badge-bs' },
};

function SoalBadge({ tipe }) {
  const meta = TIPE_META[tipe] || TIPE_META.pg;
  return html`
    <span class=${'soal-badge ' + meta.cls}>
      <${meta.Icon} size=${12} strokeWidth=${2} />
      ${meta.label}
    </span>
  `;
}

function ViewMode({ soal }) {
  return html`
    <div class="soal-body">
      ${soal.img && html`
        <div class="soal-img-badge">
          <${ImageIcon} size=${14} /> Butuh gambar: <b>${soal.img}</b>
        </div>
      `}
      <div class="soal-question">${soal.q}</div>

      ${soal.tipe === 'bs' && html`
        <div class="soal-bs-list">
          ${soal.pernyataan.map(function (p, pi) {
            return html`
              <div class="soal-bs-item">
                <span class="soal-bs-num">${pi + 1}.</span>
                <span class="soal-bs-text">${p.teks}</span>
                <span class=${'soal-bs-key ' + (p.key ? 'key-true' : 'key-false')}>
                  ${p.key ? 'Benar' : 'Salah'}
                </span>
              </div>
            `;
          })}
        </div>
      `}

      ${(soal.tipe === 'pg' || soal.tipe === 'mcma') && html`
        <div class="soal-options">
          ${soal.options.map(function (opt, oi) {
            const isCorrect = soal.tipe === 'pg'
              ? soal.key === oi
              : soal.key.indexOf(oi) !== -1;
            return html`
              <div class=${'soal-option' + (isCorrect ? ' correct' : '')}>
                <span class="soal-option-letter">${'ABCD'[oi]}</span>
                <span class="soal-option-text">${opt}</span>
                ${isCorrect && html`<${Check} size=${14} class="soal-option-check" />`}
              </div>
            `;
          })}
        </div>
      `}

      ${soal.pembahasan && html`
        <div class="soal-explanation">
          <${MessageCircle} size=${13} />
          <span>${soal.pembahasan}</span>
        </div>
      `}
    </div>
  `;
}

function EditMode({ soal, onSave, onCancel }) {
  const [draft, setDraft] = useState(function () {
    return JSON.parse(JSON.stringify(soal));
  });

  const setField = function (patch) {
    setDraft(function (d) { return Object.assign({}, d, patch); });
  };

  const handleOptionChange = function (idx, val) {
    const opts = draft.options.slice();
    opts[idx] = val;
    setField({ options: opts });
  };

  const handlePGCorrect = function (idx) { setField({ key: idx }); };

  const handleMCMAToggle = function (idx) {
    const set = new Set(draft.key || []);
    if (set.has(idx)) set.delete(idx); else set.add(idx);
    const keys = Array.from(set).sort(function (a, b) { return a - b; });
    setField({ key: keys });
  };

  const handleBSPernyataan = function (idx, patch) {
    const list = draft.pernyataan.map(function (p, i) {
      if (i !== idx) return p;
      return Object.assign({}, p, patch);
    });
    setField({ pernyataan: list });
  };

  let canSave = false;
  if (draft.q && draft.q.trim()) {
    if (draft.tipe === 'pg' || draft.tipe === 'mcma') {
      if (draft.options && draft.options.length >= 2) {
        const hasEmpty = draft.options.some(function (o) { return !String(o).trim(); });
        if (!hasEmpty) {
          if (draft.tipe === 'pg') {
            if (Number.isInteger(draft.key) && draft.key >= 0 && draft.key < draft.options.length) canSave = true;
          } else {
            if (Array.isArray(draft.key) && draft.key.length >= 2) canSave = true;
          }
        }
      }
    } else if (draft.tipe === 'bs') {
      if (draft.pernyataan && draft.pernyataan.length >= 2) {
        const noEmpty = draft.pernyataan.every(function (p) { return String(p.teks || '').trim(); });
        if (noEmpty) canSave = true;
      }
    }
  }

  return html`
    <div class="soal-body edit-mode">
      <textarea class="edit-textarea" value=${draft.q} onInput=${function (e) { setField({ q: e.target.value }); }} rows=${2} />

      ${draft.tipe === 'bs' && html`
        <div class="edit-bs-list">
          ${draft.pernyataan.map(function (p, pi) {
            return html`
              <div class="edit-bs-row">
                <span class="edit-bs-num">${pi + 1}.</span>
                <input class="edit-input" value=${p.teks} onInput=${function (e) { handleBSPernyataan(pi, { teks: e.target.value }); }} />
                <button type="button" class=${'edit-bs-toggle ' + (p.key ? 'active-true' : '')} onClick=${function () { handleBSPernyataan(pi, { key: true }); }}>B</button>
                <button type="button" class=${'edit-bs-toggle ' + (!p.key ? 'active-false' : '')} onClick=${function () { handleBSPernyataan(pi, { key: false }); }}>S</button>
              </div>
            `;
          })}
        </div>
      `}

      ${(draft.tipe === 'pg' || draft.tipe === 'mcma') && html`
        <div class="edit-options">
          ${draft.options.map(function (opt, oi) {
            const isCorrect = draft.tipe === 'pg'
              ? draft.key === oi
              : (draft.key || []).indexOf(oi) !== -1;
            return html`
              <div class="edit-option-row">
                <button type="button" class=${'edit-option-key ' + (isCorrect ? 'active' : '')} onClick=${function () {
                  if (draft.tipe === 'pg') handlePGCorrect(oi);
                  else handleMCMAToggle(oi);
                }}>${'ABCD'[oi]}</button>
                <input class="edit-input" value=${opt} onInput=${function (e) { handleOptionChange(oi, e.target.value); }} />
              </div>
            `;
          })}
        </div>
      `}

      <textarea class="edit-textarea edit-pembahasan" value=${draft.pembahasan || ''} onInput=${function (e) { setField({ pembahasan: e.target.value }); }} placeholder="Pembahasan (opsional)" rows=${2} />

      <div class="edit-actions">
        <button class="btn-secondary" onClick=${onCancel}><${X} size=${16} /> Batal</button>
        <button class="btn-primary" disabled=${!canSave} onClick=${function () { onSave(draft); }}><${Check} size=${16} /> Simpan</button>
      </div>
    </div>
  `;
}

function SoalCard({ soal, index, warnings, onUpdate, onDelete, onDuplicate }) {
  const [editing, setEditing] = useState(false);
  const hasWarning = warnings && warnings.length > 0;

  const handleSave = function (updated) {
    onUpdate(index, updated);
    setEditing(false);
  };

  return html`
    <div class=${'soal-card' + (hasWarning ? ' has-warning' : '')}>
      <div class="soal-header">
        <div class="soal-header-left">
          <span class="soal-number">#${index + 1}</span>
          <${SoalBadge} tipe=${soal.tipe} />
        </div>
        ${!editing && html`
          <div class="soal-actions">
            <button class="icon-btn" onClick=${function () { setEditing(true); }} aria-label="Edit"><${Pencil} size=${15} /></button>
            <button class="icon-btn" onClick=${function () { onDuplicate(index); }} aria-label="Duplikat"><${CopyPlus} size=${15} /></button>
            <button class="icon-btn icon-danger" onClick=${function () { onDelete(index); }} aria-label="Hapus"><${Trash2} size=${15} /></button>
          </div>
        `}
      </div>

      ${hasWarning && !editing && html`
        <div class="soal-warning">
          <${AlertTriangle} size=${13} />
          <div>${warnings.map(function (w, wi) { return html`<div key=${wi}>${w}</div>`; })}</div>
        </div>
      `}

      ${editing
        ? html`<${EditMode} soal=${soal} onSave=${handleSave} onCancel=${function () { setEditing(false); }} />`
        : html`<${ViewMode} soal=${soal} />`}
    </div>
  `;
}

export function PreviewPage({ navigate }) {
  const draft = useMemo(function () { return loadDraft(); }, []);
  const [paket, setPaket] = useState(draft && draft.paket ? draft.paket : null);
  const [baseWarnings] = useState(draft && draft.warnings ? draft.warnings : []);
  const [filter, setFilter] = useState('all');

  const qualityWarnings = useMemo(function () { return paket ? checkQuality(paket) : []; }, [paket]);
  const allWarnings = useMemo(function () { return baseWarnings.concat(qualityWarnings); }, [baseWarnings, qualityWarnings]);

  if (!draft || !paket) {
    return html`
      <div class="page">
        <div class="page-shell">
          <${Stepper} current="preview" />
          <div class="result-card result-warning mt-4">
            <h2>Tidak ada data soal</h2>
            <p>Silakan mulai dari langkah pertama.</p>
            <button class="btn-primary" onClick=${function () { navigate('/paste'); }}>Ke Langkah 2</button>
          </div>
        </div>
      </div>
    `;
  }

  const persist = function (updatedPaket) {
    setPaket(updatedPaket);
    saveDraft(Object.assign({}, draft, { paket: updatedPaket }));
  };

  const handleUpdate = function (index, updated) {
    const soal = paket.soal.map(function (s, i) {
      if (i !== index) return s;
      return Object.assign({}, updated, { id: s.id });
    });
    persist(Object.assign({}, paket, { soal: soal }));
  };

  const handleDelete = function (index) {
    if (paket.soal.length <= 1) { alert('Minimal harus ada 1 soal.'); return; }
    if (!confirm('Hapus soal #' + (index + 1) + '?')) return;
    const soal = paket.soal.filter(function (_, i) { return i !== index; }).map(function (s, i) { return Object.assign({}, s, { id: 's' + (i + 1) }); });
    persist(Object.assign({}, paket, { soal: soal }));
  };

  const handleDuplicate = function (index) {
    const src = paket.soal[index];
    const cloned = JSON.parse(JSON.stringify(src));
    const soal = paket.soal.slice(0, index + 1).concat([cloned], paket.soal.slice(index + 1))
      .map(function (s, i) { return Object.assign({}, s, { id: 's' + (i + 1) }); });
    persist(Object.assign({}, paket, { soal: soal }));
  };

  const counts = {
    all: paket.soal.length,
    pg: paket.soal.filter(function (s) { return s.tipe === 'pg'; }).length,
    mcma: paket.soal.filter(function (s) { return s.tipe === 'mcma'; }).length,
    bs: paket.soal.filter(function (s) { return s.tipe === 'bs'; }).length,
  };

  const indexed = paket.soal.map(function (s, i) { return { soal: s, index: i }; });
  const filtered = filter === 'all' ? indexed : indexed.filter(function (x) { return x.soal.tipe === filter; });

  const filters = [
    { k: 'all', label: 'Semua', n: counts.all },
    { k: 'pg', label: 'PG', n: counts.pg },
    { k: 'mcma', label: 'MCMA', n: counts.mcma },
    { k: 'bs', label: 'B/S', n: counts.bs },
  ].filter(function (f) { return f.k === 'all' || f.n > 0; });

  return html`
    <div class="page">
      <div class="page-shell page-shell-wide">
        <${Stepper} current="preview" />
        <div class="page-header">
          <button class="btn-back" onClick=${function () { navigate('/paste'); }}>
            <${ArrowLeft} size=${16} /> Tempel Hasil
          </button>
          <h1 class="page-title">Preview Soal</h1>
          <p class="page-subtitle">${paket.soal.length} soal · ${paket.mapel} · ${paket.judul}</p>
        </div>

        ${allWarnings.length > 0 && html`
          <div class="result-card result-warning no-print">
            <div class="result-header">
              <${AlertTriangle} size=${18} color="var(--warning)" />
              <h2>${allWarnings.length} peringatan kualitas</h2>
            </div>
            <ul class="error-list" style="color: var(--warning);">
              ${allWarnings.slice(0, 5).map(function (w, i) { return html`<li key=${i}>${w.message}</li>`; })}
              ${allWarnings.length > 5 && html`<li>... dan ${allWarnings.length - 5} lainnya</li>`}
            </ul>
          </div>
        `}

        <div class="filter-bar no-print">
          <div class="filter-chips">
            ${filters.map(function (f) {
              return html`<button class=${'filter-chip' + (filter === f.k ? ' active' : '')} onClick=${function () { setFilter(f.k); }}>${f.label} <span class="filter-count">${f.n}</span></button>`;
            })}
          </div>
          <button class="btn-secondary btn-sm print-btn" onClick=${() => window.print()}>
            <${Printer} size=${14} /> Cetak
          </button>
        </div>

        <div class="soal-list">
          ${filtered.length === 0 && html`
            <div class="empty-state">
              <${ListChecks} size=${32} strokeWidth=${1.5} />
              <p>Tidak ada soal dengan tipe ${filter === 'pg' ? 'PG' : filter === 'mcma' ? 'MCMA' : 'B/S'}.</p>
              <button class="btn-secondary" onClick=${function () { setFilter('all'); }}>Tampilkan Semua</button>
            </div>
          `}
          ${filtered.map(function (item) {
            const warnMessages = allWarnings.filter(function (w) { return w.index === item.index; }).map(function (w) { return w.message; });
            return html`<${SoalCard} key=${item.soal.id} soal=${item.soal} index=${item.index} warnings=${warnMessages} onUpdate=${handleUpdate} onDelete=${handleDelete} onDuplicate=${handleDuplicate} />`;
          })}
        </div>

        <div class="form-actions sticky-bottom no-print">
          <button class="btn-primary btn-large" onClick=${function () { navigate('/export'); }}>Lanjut ke Ekspor <${ArrowRight} size=${18} /></button>
        </div>
      </div>
    </div>
  `;
}
