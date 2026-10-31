/**
 * TKA Studio — pages/build.js
 * © 2026 Ekwan Nugroho — Wonogiri
 */
import { h } from 'https://esm.sh/preact@10.24.3';
import { useState, useEffect } from 'https://esm.sh/preact@10.24.3/hooks';
import htm from 'https://esm.sh/htm@3.1.1';
import {
  Sparkles, ArrowRight, ArrowLeft, Copy, Check, X,
  BookOpen, Gauge, ListChecks, MessageSquareText, Settings2, Info, ExternalLink,
  ClipboardCheck, ChevronDown, ChevronUp, CircleDot, CheckCheck, Wand2, Image as ImageIcon,
  Save, FolderOpen,
} from 'https://esm.sh/lucide-preact@0.460.0?deps=preact@10.24.3';
import { buildPrompt } from '../lib/prompt-template.js';
import { Stepper } from '../components/Stepper.js';

const html = htm.bind(h);

const MAPEL_OPTIONS = ['Matematika', 'IPA', 'IPS', 'Bahasa Indonesia', 'Bahasa Inggris', 'PPKn', 'Seni Budaya', 'PJOK', 'Informatika', 'Prakarya'];
const KELAS_OPTIONS = ['1 SD', '2 SD', '3 SD', '4 SD', '5 SD', '6 SD', '7 SMP', '8 SMP', '9 SMP', '10 SMA', '11 SMA', '12 SMA'];

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { return false; }
}

function Section({ icon: Icon, title, children }) {
  return html`
    <section class="form-section">
      <div class="form-section-header">
        <${Icon} size=${18} strokeWidth=${2} />
        <h2>${title}</h2>
      </div>
      <div class="form-section-body">${children}</div>
    </section>
  `;
}

function Field({ label, hint, children }) {
  return html`
    <div class="form-field">
      <label class="form-label">${label}</label>
      ${children}
      ${hint && html`<div class="form-hint">${hint}</div>`}
    </div>
  `;
}

function NumberStepper({ value, onChange, min = 0, max = 60 }) {
  return html`
    <div class="stepper">
      <button type="button" class="stepper-btn" onClick=${() => onChange(Math.max(min, value - 1))} disabled=${value <= min}>−</button>
      <input type="number" class="stepper-input" value=${value} min=${min} max=${max} onInput=${(e) => {
        const v = Number(e.target.value);
        if (Number.isFinite(v)) onChange(Math.max(min, Math.min(max, Math.round(v))));
      }} />
      <button type="button" class="stepper-btn" onClick=${() => onChange(Math.min(max, value + 1))} disabled=${value >= max}>+</button>
    </div>
  `;
}

function PromptModal({ prompt, onClose, onContinue }) {
  const [showFull, setShowFull] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyText(prompt);
    setCopied(ok);
    if (ok) setTimeout(() => setCopied(false), 2000);
  };

  return html`
    <div class="modal-backdrop" onClick=${onClose}>
      <div class="modal" onClick=${(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div class="modal-header">
          <div class="modal-title"><${Check} size=${20} color="var(--success)" /><span>Prompt siap!</span></div>
          <button class="modal-close" onClick=${onClose} aria-label="Tutup"><${X} size=${18} /></button>
        </div>
        <div class="modal-body">
          <p class="text-muted text-sm mb-4">Prompt sudah otomatis tersalin ke clipboard. Sekarang ikuti langkah ini:</p>
          <ol class="steps-list">
            <li><div class="step-line"><span class="step-num">1</span><div><b>Buka salah satu AI</b><div class="ai-links">
              <a href="https://chat.openai.com" target="_blank" class="ai-link">ChatGPT <${ExternalLink} size=${12} /></a>
              <a href="https://gemini.google.com" target="_blank" class="ai-link">Gemini <${ExternalLink} size=${12} /></a>
              <a href="https://claude.ai" target="_blank" class="ai-link">Claude <${ExternalLink} size=${12} /></a>
            </div></div></div></li>
            <li><div class="step-line"><span class="step-num">2</span><div><b>Paste prompt di chat AI</b></div></div></li>
            <li><div class="step-line"><span class="step-num">3</span><div><b>Tunggu AI selesai (30–90 detik)</b></div></div></li>
            <li><div class="step-line"><span class="step-num">4</span><div><b>Copy seluruh hasil AI</b></div></div></li>
          </ol>
          <div class="accordion">
            <button class="accordion-toggle" onClick=${() => setShowFull(!showFull)}>
              ${showFull ? html`<${ChevronUp} size=${16} />` : html`<${ChevronDown} size=${16} />`} Lihat prompt lengkap
            </button>
            ${showFull && html`<textarea class="prompt-textarea" readonly value=${prompt} />`}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" onClick=${handleCopy}>${copied ? html`<${Check} size=${16} />` : html`<${Copy} size=${16} />`} ${copied ? 'Tersalin!' : 'Salin ulang'}</button>
          <button class="btn-primary" onClick=${onContinue}><${ClipboardCheck} size=${16} /> Lanjut: Paste Hasil AI</button>
        </div>
      </div>
    </div>
  `;
}

export function BuildPage({ navigate }) {
  const [mapel, setMapel] = useState('Matematika');
  const [kelas, setKelas] = useState('6 SD');
  const [topik, setTopik] = useState('');
  const [tingkat, setTingkat] = useState('sedang');
  const [pg, setPg] = useState(20);
  const [mcma, setMcma] = useState(10);
  const [bs, setBs] = useState(10);
  const [instruksi, setInstruksi] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [durasi, setDurasi] = useState(30);
  const [latihanMandiri, setLatihanMandiri] = useState(true);
  const [sertakanGambar, setSertakanGambar] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [promptText, setPromptText] = useState('');
  
  const [recipes, setRecipes] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('tka-recipes');
    if (saved) setRecipes(JSON.parse(saved));
  }, []);

  const handleSaveRecipe = () => {
    const name = prompt('Beri nama resep ini (contoh: "Matematika Kelas 6"):', topik || `${mapel} ${kelas}`);
    if (!name) return;
    const newRecipe = { id: Date.now().toString(), name, config: { mapel, kelas, topik, tingkat, pg, mcma, bs, instruksi, durasi, latihanMandiri, sertakanGambar } };
    const updated = [...recipes, newRecipe];
    setRecipes(updated);
    localStorage.setItem('tka-recipes', JSON.stringify(updated));
    alert('Resep berhasil disimpan!');
  };

  const handleLoadRecipe = (id) => {
    const recipe = recipes.find(r => r.id === id);
    if (!recipe) return;
    const c = recipe.config;
    setMapel(c.mapel); setKelas(c.kelas); setTopik(c.topik); setTingkat(c.tingkat);
    setPg(c.pg); setMcma(c.mcma); setBs(c.bs); setInstruksi(c.instruksi);
    setDurasi(c.durasi); setLatihanMandiri(c.latihanMandiri); setSertakanGambar(c.sertakanGambar);
  };

  const total = pg + mcma + bs;
  const isValid = total > 0 && topik.trim().length > 0;

  const handleGenerate = async () => {
    if (!isValid) return;
    try {
      const prompt = buildPrompt({ mapel, kelas, topik, tingkat, pg, mcma, bs, instruksiTambahan: instruksi, durasi, latihanMandiri, sertakanGambar });
      setPromptText(prompt);
      await copyText(prompt);
      setShowModal(true);
    } catch (err) { alert('Gagal membuat prompt: ' + err.message); }
  };

  return html`
    <div class="page">
      <div class="page-shell">
        <${Stepper} current="build" />
        <div class="page-header">
          <button class="btn-back" onClick=${() => navigate('/')}><${ArrowLeft} size=${16} /> Beranda</button>
          <h1 class="page-title">Susun Prompt</h1>
          <p class="page-subtitle">Isi detail soal, lalu kami buatkan prompt siap-copy untuk AI.</p>
        </div>

        <div class="recipe-bar">
          <div class="recipe-select">
            <${FolderOpen} size=${18} color="var(--brand-700)" />
            <select class="form-select" onChange=${(e) => e.target.value && handleLoadRecipe(e.target.value)} value="">
              <option value="" disabled>Muat Resep Tersimpan...</option>
              ${recipes.map(r => html`<option value=${r.id}>${r.name}</option>`)}
            </select>
          </div>
          <button class="btn-secondary" onClick=${handleSaveRecipe}><${Save} size=${16} /> Simpan Resep</button>
        </div>

        <${Section} icon=${BookOpen} title="Detail Materi">
          <${Field} label="Mata Pelajaran">
            <select class="form-select" value=${mapel} onChange=${(e) => setMapel(e.target.value)}>
              ${MAPEL_OPTIONS.map((m) => html`<option value=${m}>${m}</option>`)}
            </select>
          </${Field}>
          <div class="form-row">
            <${Field} label="Kelas">
              <select class="form-select" value=${kelas} onChange=${(e) => setKelas(e.target.value)}>
                ${KELAS_OPTIONS.map((k) => html`<option value=${k}>${k}</option>`)}
              </select>
            </${Field}>
            <${Field} label="Topik" hint="Contoh: Operasi Hitung Pecahan">
              <input class="form-input" type="text" value=${topik} onInput=${(e) => setTopik(e.target.value)} placeholder="Topik materi…" />
            </${Field}>
          </div>
        </${Section}>

        <${Section} icon=${Gauge} title="Tingkat Kesulitan">
          <div class="radio-group">
            ${[{ v: 'mudah', l: 'Mudah' }, { v: 'sedang', l: 'Sedang' }, { v: 'sulit', l: 'Sulit' }].map(({ v, l }) => html`
              <button type="button" class=${`radio-card ${tingkat === v ? 'active' : ''}`} onClick=${() => setTingkat(v)}>${l}</button>
            `)}
          </div>
        </${Section}>

        <${Section} icon=${ListChecks} title="Komposisi Soal">
          <div class="komposisi-list">
            <div class="komposisi-row">
              <div class="komposisi-label"><${CircleDot} size=${16} /> PG <span class="form-hint">Pilihan ganda, 1 benar</span></div>
              <${NumberStepper} value=${pg} onChange=${setPg} max=${50} />
            </div>
            <div class="komposisi-row">
              <div class="komposisi-label"><${ListChecks} size=${16} /> MCMA <span class="form-hint">Kompleks, 2–3 benar</span></div>
              <${NumberStepper} value=${mcma} onChange=${setMcma} max=${30} />
            </div>
            <div class="komposisi-row">
              <div class="komposisi-label"><${CheckCheck} size=${16} /> B/S <span class="form-hint">Benar / Salah</span></div>
              <${NumberStepper} value=${bs} onChange=${setBs} max=${30} />
            </div>
          </div>
          <div class="komposisi-total">Total: <b>${total}</b> soal</div>
        </${Section}>

        <${Section} icon=${MessageSquareText} title="Instruksi Tambahan (opsional)">
          <textarea class="form-textarea" rows=${3} value=${instruksi} onInput=${(e) => setInstruksi(e.target.value)} placeholder="Contoh: Soal kontekstual, hindari desimal…" />
        </${Section}>

        <div class="advanced-toggle">
          <button class="accordion-toggle" onClick=${() => setShowAdvanced(!showAdvanced)}>
            ${showAdvanced ? html`<${ChevronUp} size=${16} />` : html`<${ChevronDown} size=${16} />`} <${Settings2} size=${14} /> Pengaturan lanjutan
          </button>
        </div>

        ${showAdvanced && html`
          <${Section} icon=${Settings2} title="Pengaturan Lanjutan">
            <${Field} label="Durasi Ujian (menit)">
              <${NumberStepper} value=${durasi} onChange=${setDurasi} min=${5} max=${180} />
            </${Field}>
            <div class="form-field mt-4">
              <label class="checkbox-label">
                <input type="checkbox" checked=${latihanMandiri} onChange=${(e) => setLatihanMandiri(e.target.checked)} />
                Bisa dipakai untuk latihan mandiri siswa
              </label>
            </div>
            <div class="form-field mt-3">
              <label class="checkbox-label">
                <input type="checkbox" checked=${sertakanGambar} onChange=${(e) => setSertakanGambar(e.target.checked)} />
                <${ImageIcon} size=${16} class="mr-1" /> Sertakan soal bergambar
              </label>
              <div class="form-hint ml-6">Guru perlu menyiapkan file gambar manual sebelum impor ke Local Host.</div>
            </div>
          </${Section}>
        `}

        <div class="form-actions">
          <button class="btn-primary btn-large" disabled=${!isValid} onClick=${handleGenerate}>
            <${Wand2} size=${18} /> Buat & Salin Prompt <${ArrowRight} size=${18} />
          </button>
          ${!topik.trim() && html`<div class="form-warning"><${Info} size=${14} /> Isi topik dulu untuk melanjutkan</div>`}
        </div>
      </div>

      ${showModal && html`<${PromptModal} prompt=${promptText} onClose=${() => setShowModal(false)} onContinue=${() => { setShowModal(false); navigate('/paste'); }} />`}
    </div>
  `;
}
