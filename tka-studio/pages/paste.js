/**
 * TKA Studio — pages/paste.js
 * © 2026 Ekwan Nugroho — Wonogiri
 */
import { h } from 'https://esm.sh/preact@10.24.3';
import { useState } from 'https://esm.sh/preact@10.24.3/hooks';
import htm from 'https://esm.sh/htm@3.1.1';
import {
  ArrowLeft, ArrowRight, ScanSearch, AlertTriangle,
  CircleCheck, CircleX, Loader2, Sparkles,
} from 'https://esm.sh/lucide-preact@0.460.0?deps=preact@10.24.3';
import { smartParse } from '../lib/parser/index.js';
import { normalizePaket } from '../lib/tka-schema.js';
import { saveDraft } from '../stores/studio.js';
import { Stepper } from '../components/Stepper.js';

const html = htm.bind(h);

export function PastePage({ navigate }) {
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState(null);

  const handleParse = () => {
    if (!text.trim()) return;
    setParsing(true);
    setResult(null);

    setTimeout(() => {
      try {
        const parsed = smartParse(text);
        if (!parsed.ok) {
          setResult({ status: 'parse-failed', error: parsed.error });
          setParsing(false);
          return;
        }

        const { paket, warnings, errors } = normalizePaket(parsed.raw);

        if (!paket) {
          setResult({
            status: 'normalize-failed',
            format: parsed.format,
            errors: errors.length ? errors : [{ message: 'Tidak ada soal yang bisa dipulihkan' }],
            warnings: warnings || [],
          });
          setParsing(false);
          return;
        }

        saveDraft({
          paket,
          warnings: warnings || [],
          errors: errors || [],
          originalText: text,
          format: parsed.format,
          savedAt: Date.now(),
        });
        setResult({
          status: 'success',
          format: parsed.format,
          paket,
          warnings: warnings || [],
          errors: errors || [],
        });
        setParsing(false);
      } catch (e) {
        setResult({ status: 'fatal', error: String(e?.message || e) });
        setParsing(false);
      }
    }, 250);
  };

  return html`
    <div class="page">
      <div class="page-shell">
        <${Stepper} current="paste" />
        <div class="page-header">
          <button class="btn-back" onClick=${() => navigate('/build')}>
            <${ArrowLeft} size=${16} /> Susun Prompt
          </button>
          <h1 class="page-title">Tempel Hasil AI</h1>
          <p class="page-subtitle">Copy hasil dari ChatGPT / Gemini / Claude, lalu paste di bawah. Format JSON atau CSV otomatis dikenali.</p>
        </div>

        ${!result && html`
          <div class="paste-box">
            <textarea
              class="paste-textarea"
              placeholder='Tempel hasil AI di sini...&#10;&#10;Contoh:&#10;&#123;&#10;  "version": "1.0",&#10;  "id": "matematika-pecahan-2026",&#10;  "soal": [...]&#10;&#125;'
              value=${text}
              onInput=${(e) => setText(e.target.value)}
              spellcheck=${false}
            />
            <div class="form-hint mt-2">💡 Tips: paste langsung (Ctrl+V) — format otomatis dikenali.</div>
          </div>
          <div class="form-actions">
            <button class="btn-primary btn-large" disabled=${!text.trim() || parsing} onClick=${handleParse}>
              ${parsing ? html`<${Loader2} size=${18} class="spin" />` : html`<${ScanSearch} size=${18} />`}
              ${parsing ? 'Mengolah...' : 'Olah & Preview'}
            </button>
          </div>
        `}

        ${result?.status === 'parse-failed' && html`
          <div class="result-card result-error">
            <div class="result-header">
              <${CircleX} size=${20} color="var(--danger)" />
              <h2>Tidak bisa membaca hasil AI</h2>
            </div>
            <p class="text-muted text-sm mb-3">${result.error}</p>
            <div class="form-hint mb-4">
              Coba:<br />
              • Copy dari karakter awal sampai karakter akhir<br />
              • Minta AI: "berikan hanya JSON valid, tanpa penjelasan"<br />
              • Pastikan hasil AI sudah selesai (belum berhenti di tengah)
            </div>
            <button class="btn-secondary" onClick=${() => { setResult(null); setParsing(false); }}>Coba Parse Ulang</button>
          </div>
        `}

        ${result?.status === 'normalize-failed' && html`
          <div class="result-card result-warning">
            <div class="result-header">
              <${AlertTriangle} size=${20} color="var(--warning)" />
              <h2>Sebagian soal tidak valid</h2>
            </div>
            <p class="text-muted text-sm mb-3">Format <b>${result.format?.toUpperCase()}</b> terdeteksi, tapi ada ${result.errors.length} masalah:</p>
            <ul class="error-list">
              ${result.errors.map((e) => html`<li>${e.message}</li>`)}
            </ul>
            <button class="btn-secondary" onClick=${() => { setResult(null); setParsing(false); }}>Kembali & Perbaiki</button>
          </div>
        `}

        ${result?.status === 'success' && html`
          <div class="result-card result-success">
            <div class="result-header">
              <${CircleCheck} size=${20} color="var(--success)" />
              <h2>${result.paket.soal.length} soal berhasil di-parse</h2>
            </div>
            <div class="result-summary">
              <div class="summary-item">
                <span class="summary-label">Format</span>
                <span class="summary-value">${result.format?.toUpperCase()}</span>
              </div>
              <div class="summary-item">
                <span class="summary-label">Total soal</span>
                <span class="summary-value">${result.paket.soal.length}</span>
              </div>
              ${result.warnings.length > 0 && html`
                <div class="summary-item">
                  <span class="summary-label">Peringatan</span>
                  <span class="summary-value" style="color: var(--warning);">${result.warnings.length}</span>
                </div>
              `}
            </div>
            ${result.warnings.length > 0 && html`
              <details class="warnings-detail">
                <summary>Lihat ${result.warnings.length} peringatan</summary>
                <ul>${result.warnings.map((w) => html`<li>${w.message}</li>`)}</ul>
              </details>
            `}
          </div>
          <div class="form-actions">
            <button class="btn-primary btn-large" onClick=${() => navigate('/preview')}>
              <${Sparkles} size=${18} /> Lanjut ke Preview <${ArrowRight} size=${18} />
            </button>
            <button class="btn-secondary" onClick=${() => { setResult(null); setParsing(false); }}>Paste Ulang</button>
          </div>
        `}

        ${result?.status === 'fatal' && html`
          <div class="result-card result-error">
            <div class="result-header">
              <${CircleX} size=${20} color="var(--danger)" />
              <h2>Terjadi kesalahan internal</h2>
            </div>
            <pre class="pre-wrap text-sm">${result.error}</pre>
            <button class="btn-secondary" onClick=${() => { setResult(null); setParsing(false); }}>Coba Lagi</button>
          </div>
        `}
      </div>
    </div>
  `;
}