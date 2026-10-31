/**
 * TKA Studio — pages/export.js
 * © 2026 Ekwan Nugroho — Wonogiri
 * All rights reserved.
 */
import { h } from 'https://esm.sh/preact@10.24.3';
import { useState, useMemo } from 'https://esm.sh/preact@10.24.3/hooks';
import htm from 'https://esm.sh/htm@3.1.1';
import {
  ArrowLeft, Download, CheckCircle2, ExternalLink, Copy, Check,
  FileJson, Settings2, Info, RefreshCw, Lock, AlertTriangle, CopyPlus,
  CloudUpload, Loader2,
} from 'https://esm.sh/lucide-preact@0.460.0?deps=preact@10.24.3';
import { loadDraft, saveDraft, clearDraft } from '../stores/studio.js';
import { downloadPaket, toLocalHostFormat, slugify, validatePaket } from '../lib/tka-schema.js';
import { downloadCSV } from '../lib/csv-export.js';
import { saveToBank } from '../lib/bank-soal.js';
import { Stepper } from '../components/Stepper.js';

const html = htm.bind(h);

function copyText(text) {
  return navigator.clipboard.writeText(text).then(() => true).catch(() => false);
}

export function ExportPage({ navigate, profile }) {
  const draft = useMemo(() => loadDraft(), []);
  const [paket, setPaket] = useState(draft?.paket || null);
  const [judul, setJudul] = useState(draft?.paket?.judul || '');
  const [durasi, setDurasi] = useState(draft?.paket?.durasiMenit || 30);
  const [acakMode, setAcakMode] = useState(draft?.paket?.acakMode || 'per-tipe');
  const [latihanMandiri, setLatihanMandiri] = useState(draft?.paket?.latihanMandiri !== false);
  const [downloaded, setDownloaded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!draft || !paket) {
    return html`
      <div class="page">
        <div class="page-shell">
          <${Stepper} current="export" />
          <div class="result-card result-warning mt-4">
            <h2>Tidak ada data soal</h2>
            <button class="btn-primary" onClick=${() => navigate('/paste')}>Ke Langkah 2</button>
          </div>
        </div>
      </div>
    `;
  }

  const buildFinalPaket = () => {
    const id = slugify(judul) || slugify(paket.judul) || 'paket-soal';
    const soal = paket.soal.map((s, i) => ({ ...s, id: `s${i + 1}` }));
    return {
      ...paket,
      id,
      judul: judul.trim() || paket.judul,
      durasiMenit: Math.max(1, Math.round(durasi)),
      acakMode,
      latihanMandiri,
      soal,
    };
  };

  const handleDownload = () => {
    try {
      setError(null);
      const final = buildFinalPaket();
      const v = validatePaket(final);
      if (!v.valid) {
        setError(v.errors.map((e) => e.message).join('; '));
        return;
      }
      downloadPaket(final);
      const updated = { ...draft, paket: final };
      saveDraft(updated);
      setPaket(final);
      setDownloaded(true);
    } catch (e) {
      setError(String(e.message || e));
    }
  };

  const handleDownloadCSV = () => {
    try {
      setError(null);
      const final = buildFinalPaket();
      downloadCSV(final);
    } catch (e) {
      setError(String(e.message || e));
    }
  };

  const handleCopyCode = async () => {
    try {
      const final = buildFinalPaket();
      const json = toLocalHostFormat(final);
      const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(json))));
      const ok = await copyText(encoded);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (e) {
      setError(String(e.message || e));
    }
  };

  const handleSaveToCloud = async () => {
    if (!profile) {
      navigate('/login');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const final = buildFinalPaket();
      const v = validatePaket(final);
      if (!v.valid) {
        setError(v.errors.map((e) => e.message).join('; '));
        setSaving(false);
        return;
      }
      await saveToBank(profile.id, final);
      alert('Paket berhasil disimpan ke Bank Soal Anda!');
      navigate('/bank-soal');
    } catch (e) {
      setError('Gagal menyimpan ke cloud: ' + (e.message || e));
    }
    setSaving(false);
  };

  const handleDuplicateDraft = () => {
    if (!confirm('Duplikat paket ini menjadi draf baru? Anda bisa mengubah topik atau mapel dari awal tanpa kehilangan paket ini.')) return;
    saveDraft({ ...draft, originalText: '', savedAt: Date.now() });
    navigate('/build');
  };

  const handleFinish = () => {
    clearDraft();
    navigate('/');
  };

  const counts = {
    pg: paket.soal.filter((s) => s.tipe === 'pg').length,
    mcma: paket.soal.filter((s) => s.tipe === 'mcma').length,
    bs: paket.soal.filter((s) => s.tipe === 'bs').length,
  };

  const gambarDibutuhkan = paket.soal
    .map((s, index) => ({ ...s, index }))
    .filter((s) => s.img && String(s.img).trim())
    .map((s) => ({ nomor: s.index + 1, img: s.img }));

  const finalId = slugify(judul) || slugify(paket.judul) || 'paket-soal';
  const filename = `${finalId}.json`;

  return html`
    <div class="page">
      <div class="page-shell">
        <${Stepper} current="export" />
        <div class="page-header">
          <button class="btn-back" onClick=${() => navigate('/preview')}>
            <${ArrowLeft} size=${16} /> Preview
          </button>
          <h1 class="page-title">Ekspor Paket Soal</h1>
          <p class="page-subtitle">Download file .json, lalu impor ke TKA Local Host.</p>
        </div>

        ${gambarDibutuhkan.length > 0 && html`
          <div class="result-card result-warning mb-4">
            <div class="result-header">
              <${AlertTriangle} size=${18} color="var(--warning)" />
              <h2>${gambarDibutuhkan.length} Soal Butuh Gambar</h2>
            </div>
            <p class="text-muted text-sm mb-3">
              Sebelum mengimpor ke Local Host, siapkan file berikut di folder <b>paket/gambar/</b>:
            </p>
            <ul class="error-list font-monospace mb-3">
              ${gambarDibutuhkan.map((g) => html`<li>Soal #${g.nomor} &rarr; ${g.img}</li>`)}
            </ul>
          </div>
        `}

        <div class="export-section">
          <div class="export-section-header">
            <${FileJson} size=${18} />
            <h2>Ringkasan Paket</h2>
          </div>
          <div class="export-summary">
            <div class="summary-item">
              <span class="summary-label">File</span>
              <span class="summary-value">${filename}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Total Soal</span>
              <span class="summary-value">${paket.soal.length}</span>
            </div>
            <div class="summary-item">
              <span class="summary-label">Komposisi</span>
              <span class="summary-value summary-value-sm">
                PG ${counts.pg} · MCMA ${counts.mcma} · B/S ${counts.bs}
              </span>
            </div>
          </div>
        </div>

        <div class="export-section">
          <div class="export-section-header">
            <${Settings2} size=${18} />
            <h2>Pengaturan Ekspor</h2>
          </div>

          <div class="form-field">
            <label class="form-label">Judul Paket</label>
            <input
              class="form-input"
              value=${judul}
              onInput=${(e) => setJudul(e.target.value)}
              placeholder="Judul paket yang tampil di Local Host"
            />
          </div>

          <div class="form-field">
            <label class="form-label">Durasi Ujian (menit)</label>
            <input
              class="form-input"
              type="number"
              min=${1}
              max=${300}
              value=${durasi}
              onInput=${(e) => setDurasi(Number(e.target.value) || 30)}
            />
          </div>

          <div class="form-field">
            <label class="form-label">Mode Acak Soal</label>
            <div class="radio-group">
              ${[
                { v: 'per-tipe', l: 'Per Tipe' },
                { v: 'full', l: 'Penuh' },
                { v: 'none', l: 'Tidak Diacak' },
              ].map(({ v, l }) => html`
                <button
                  type="button"
                  class=${`radio-card ${acakMode === v ? 'active' : ''}`}
                  onClick=${() => setAcakMode(v)}
                >${l}</button>
              `)}
            </div>
          </div>

          <label class="checkbox-label mt-3">
            <input
              type="checkbox"
              checked=${latihanMandiri}
              onChange=${(e) => setLatihanMandiri(e.target.checked)}
            />
            Bisa dipakai untuk latihan mandiri siswa
          </label>
        </div>

        ${error && html`
          <div class="result-card result-error">
            <div class="result-header">
              <${Info} size=${18} color="var(--danger)" />
              <h2>Gagal mengekspor</h2>
            </div>
            <pre class="pre-wrap text-sm">${error}</pre>
          </div>
        `}

        <div class="export-actions">
          ${profile?.status === 'active' ? html`
            <button class="btn-primary btn-large" onClick=${handleDownload}>
              <${Download} size=${18} />
              Download File .json (Local Host)
            </button>

            <button class="btn-secondary w-full mt-2" onClick=${handleSaveToCloud} disabled=${saving}>
              ${saving
                ? html`<${Loader2} size=${16} class="spin" /> Menyimpan...`
                : html`<${CloudUpload} size=${16} /> Simpan ke Bank Soal (Cloud)`}
            </button>

            <button class="btn-secondary w-full mt-2" onClick=${handleDownloadCSV}>
              <${FileJson} size=${16} />
              Download CSV (Excel)
            </button>

            <button class="btn-secondary w-full mt-2" onClick=${handleCopyCode}>
              ${copied ? html`<${Check} size=${16} />` : html`<${Copy} size=${16} />`}
              ${copied ? 'Kode tersalin!' : 'Salin sebagai Kode (advanced)'}
            </button>
          ` : html`
            <button class="btn-primary btn-large btn-warning" onClick=${() => navigate(profile ? '/pending' : '/register')}>
              <${Lock} size=${18} />
              Daftar / Login untuk Download
            </button>
            <div class="text-center text-muted text-sm mt-2">
              ${profile ? 'Akun Anda masih menunggu verifikasi admin.' : 'Buat akun gratis untuk mengunduh soal ini.'}
            </div>
          `}
        </div>

        <div class="export-section export-instructions">
          <div class="export-section-header">
            <${Info} size=${18} />
            <h2>Cara Impor ke TKA Local Host</h2>
          </div>
          <ol class="steps-list">
            <li><div class="step-line"><span class="step-num">1</span><div>Buka TKA Local Host di laptop Anda</div></div></li>
            <li><div class="step-line"><span class="step-num">2</span><div>Masuk menu <b>Paket Soal</b></div></div></li>
            <li><div class="step-line"><span class="step-num">3</span><div>Klik tombol <b>Import JSON</b> (atau Import CSV)</div></div></li>
            <li><div class="step-line"><span class="step-num">4</span><div>Pilih file yang baru saja diunduh</div></div></li>
            ${gambarDibutuhkan.length > 0 && html`
              <li><div class="step-line"><span class="step-num">5</span><div>Upload gambar ke folder <b>paket/gambar/</b></div></div></li>
            `}
            <li><div class="step-line"><span class="step-num">${gambarDibutuhkan.length > 0 ? '6' : '5'}</span><div>Selesai — paket siap dipakai ujian</div></div></li>
          </ol>
        </div>

        <div class="form-actions" style="display: flex; flex-direction: column; gap: 8px;">
          ${profile?.status === 'active' && html`
            <button class="btn-secondary w-full" onClick=${handleDuplicateDraft}>
              <${CopyPlus} size=${16} /> Duplikat sebagai Draf Baru (Ubah Topik)
            </button>
          `}
          <button class="btn-secondary w-full" onClick=${handleFinish}>
            <${RefreshCw} size=${16} /> Selesai & Buat Soal Baru
          </button>
        </div>
      </div>

      ${downloaded && html`
        <div class="modal-backdrop" onClick=${() => setDownloaded(false)}>
          <div class="modal" onClick=${(e) => e.stopPropagation()}>
            <div class="modal-header">
              <div class="modal-title">
                <${CheckCircle2} size=${20} color="var(--success)" />
                <span>File berhasil diunduh!</span>
              </div>
            </div>
            <div class="modal-body">
              <p class="text-muted text-sm mb-4">
                File <b>${filename}</b> tersimpan di folder Download HP/laptop Anda.
              </p>
              <div class="form-hint mb-4">
                Pindahkan file ke laptop yang menjalankan TKA Local Host (via WhatsApp, Google Drive, atau USB), lalu impor.
              </div>
              <div class="steps-list">
                <div class="step-line"><span class="step-num">1</span><div>Buka TKA Local Host</div></div>
                <div class="step-line"><span class="step-num">2</span><div>Menu Paket Soal → Import JSON</div></div>
                <div class="step-line"><span class="step-num">3</span><div>Pilih file ${filename}</div></div>
                ${gambarDibutuhkan.length > 0 && html`
                  <div class="step-line"><span class="step-num">4</span><div>Upload ${gambarDibutuhkan.length} file gambar ke folder <b>paket/gambar/</b></div></div>
                `}
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn-secondary" onClick=${() => setDownloaded(false)}>Tutup</button>
              <button class="btn-primary" onClick=${handleFinish}>
                Buat Soal Baru
              </button>
            </div>
          </div>
        </div>
      `}
    </div>
  `;
}
