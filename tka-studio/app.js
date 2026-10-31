/**
 * TKA Studio — app.js
 * © 2026 Ekwan Nugroho — Wonogiri
 * All rights reserved.
 */
import { h, render, Component } from 'https://esm.sh/preact@10.24.3';
import { useState, useEffect } from 'https://esm.sh/preact@10.24.3/hooks';
import htm from 'https://esm.sh/htm@3.1.1';
import {
  GraduationCap, Sparkles, ArrowRight, FlaskConical, ClipboardPaste,
  FolderOpen, BookOpen,
} from 'https://esm.sh/lucide-preact@0.460.0?deps=preact@10.24.3';

import { runSchemaTests } from './lib/tka-schema.test.js';
import { BuildPage } from './pages/build.js';
import { PastePage } from './pages/paste.js';
import { PreviewPage } from './pages/preview.js';
import { ExportPage } from './pages/export.js';
import { LoginPage, RegisterPage, PendingPage } from './pages/auth.js';
import { BankSoalPage } from './pages/bank-soal.js';
import { PustakaPage } from './pages/pustaka.js';
import { getSession, getProfile, signOut } from './supabase/auth.js';

const html = htm.bind(h);

function useHashRoute() {
  const [route, setRoute] = useState(() => window.location.hash.slice(1) || '/');
  useEffect(() => {
    const handler = () => setRoute(window.location.hash.slice(1) || '/');
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  return route;
}
function navigate(path) { window.location.hash = path; }

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) { console.error('ErrorBoundary:', error, info); }
  render() {
    if (this.state.error) {
      return html`
        <div style="padding: 24px; max-width: 720px; margin: 0 auto; font-family: system-ui;">
          <h1 style="color: #DC2626; font-size: 20px;">Terjadi Kesalahan</h1>
          <p style="color: #78716C; font-size: 14px;">Ada bug di aplikasi. Silakan laporkan dengan salinan pesan di bawah.</p>
          <pre style="background: #F5F4F0; padding: 12px; border-radius: 8px; overflow: auto; font-size: 12px; white-space: pre-wrap;">${String(this.state.error?.stack || this.state.error)}</pre>
          <button onClick=${() => window.location.reload()} style="padding: 10px 16px; background: #0F766E; color: white; border: none; border-radius: 8px; cursor: pointer;">
            Muat Ulang
          </button>
        </div>
      `;
    }
    return this.props.children;
  }
}

function Header() {
  return html`
    <header class="landing-header">
      <div class="logo" onClick=${() => navigate('/')} style="cursor: pointer;">
        <${GraduationCap} size=${24} strokeWidth=${2} />
        <span>TKA Studio</span>
      </div>
    </header>
  `;
}

function Footer() {
  return html`
    <footer class="landing-footer">
      © 2026 Ekwan Nugroho — Wonogiri · TKA Studio · Pelengkap TKA Local Host
    </footer>
  `;
}

function Landing() {
  return html`
    <div class="landing">
      <${Header} />
      <main class="landing-main">
        <div class="landing-hero">
          <div class="landing-hero-grid">
            <div class="landing-hero-copy">
              <h1>Buat Bank Soal dalam 3 Langkah</h1>
              <p>Tempel prompt ke AI, olah hasilnya, ekspor ke TKA Local Host. Tanpa API key. Tanpa biaya.</p>
            </div>
            <div class="landing-hero-visual" aria-hidden="true">
              <div class="hero-visual-card">
                <span class="hero-visual-badge-pg">PG</span>
                <div class="hero-visual-q">Hasil dari 1/4 + 2/4 adalah...</div>
                <div class="hero-visual-opt">
                  <span class="hero-visual-letter">A</span> 1/4
                </div>
                <div class="hero-visual-opt hero-visual-correct">
                  <span class="hero-visual-letter">B</span> 3/4
                </div>
                <div class="hero-visual-opt">
                  <span class="hero-visual-letter">C</span> 4/4
                </div>
              </div>
              <div class="hero-visual-mini-badge">
                <span class="hero-visual-check">✓</span>
                <div>
                  <div class="hero-visual-mini-title">40 soal siap</div>
                  <div class="hero-visual-mini-sub">.json · siap impor ke Local Host</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="steps-grid">
          <div class="step-card">
            <div class="step-number">1</div>
            <h3 class="step-title">Susun Prompt</h3>
            <p class="step-desc">Isi form, dapatkan prompt siap pakai untuk ChatGPT, Gemini, atau Claude.</p>
          </div>
          <div class="step-card">
            <div class="step-number">2</div>
            <h3 class="step-title">Tempel Hasil AI</h3>
            <p class="step-desc">Copy hasil dari AI, paste ke TKA Studio. Format otomatis dikenali.</p>
          </div>
          <div class="step-card">
            <div class="step-number">3</div>
            <h3 class="step-title">Ekspor ke Local Host</h3>
            <p class="step-desc">Download file .json, impor ke TKA Local Host. Siap untuk ujian.</p>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px; align-items: center;">
          <button class="cta-button" onClick=${() => navigate('/build')}>
            <${Sparkles} size=${18} strokeWidth=${2} />
            Mulai Buat Soal
            <${ArrowRight} size=${18} strokeWidth=${2} />
          </button>
          
          <div style="color: var(--text-muted); font-size: 13px; margin-top: 16px;">
            Sudah punya hasil AI dari ChatGPT/Gemini?
          </div>
          <button class="btn-secondary" onClick=${() => navigate('/paste')} style="width: 100%; max-width: 300px; height: 44px;">
            <${ClipboardPaste} size=${16} />
            Langsung Tempel Hasil AI
          </button>

          <div style="display: flex; gap: 12px; margin-top: 24px; flex-wrap: wrap; justify-content: center;">
             <button class="btn-secondary" onClick=${() => navigate('/bank-soal')}>
                <${FolderOpen} size=${16} /> Bank Soal Saya
             </button>
             <button class="btn-secondary" onClick=${() => navigate('/pustaka')}>
                <${BookOpen} size=${16} /> Pustaka Soal
             </button>
          </div>
        </div>

        <div style="margin-top: var(--space-8); font-size: 12px; color: var(--text-subtle);">
          <a href="#/debug" style="display: inline-flex; align-items: center; gap: 4px; color: var(--text-muted); text-decoration: none;">
            <${FlaskConical} size=${14} /> Developer tools (test)
          </a>
        </div>
      </main>
      <${Footer} />
    </div>
  `;
}

function DebugPageInner() {
  const [result, setResult] = useState(null);
  useEffect(() => {
    try {
      const r = runSchemaTests();
      setResult(r);
    } catch (e) {
      console.error('runSchemaTests fatal:', e);
      setResult({ error: String(e?.stack || e), passed: 0, failed: 0, results: [] });
    }
  }, []);

  if (!result) {
    return html`<div class="landing"><${Header} /><main class="landing-main"><p>Menjalankan test...</p></main></div>`;
  }

  const results = result.results || [];
  const hasFatal = result.error;

  return html`
    <div class="landing">
      <${Header} />
      <main class="landing-main" style="text-align: left; max-width: 900px;">
        <h1 style="font-size: 24px; margin-bottom: var(--space-4);">Schema Tests</h1>
        ${hasFatal && html`<p style="color: var(--danger); font-size: 13px;"><b>Fatal:</b> ${result.error}</p>`}
        <p style="margin-bottom: var(--space-4);">
          <b style="color: var(--success);">${result.passed} lulus</b>
          ${result.failed > 0 && html` · <b style="color: var(--danger);">${result.failed} gagal</b>`}
        </p>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${results.map((r) => html`
            <div style="padding: 12px; border: 1px solid ${r.ok ? '#BBF7D0' : '#FECACA'}; background: ${r.ok ? '#F0FDF4' : '#FEF2F2'}; border-radius: 8px; font-size: 13px;">
              <div><b>${r.ok ? '✓' : '✗'} ${r.name}</b></div>
              ${!r.ok && html`<div style="margin-top: 6px; color: #7F1D1D; font-family: monospace; font-size: 12px; white-space: pre-wrap;">${r.message}</div>`}
            </div>
          `)}
        </div>
        <button class="cta-button" style="margin-top: var(--space-6);" onClick=${() => navigate('/')}>Kembali</button>
      </main>
      <${Footer} />
    </div>
  `;
}

function DebugPage() {
  return html`<${ErrorBoundary}><${DebugPageInner} /></${ErrorBoundary}>`;
}

function NotFound() {
  return html`
    <div class="landing">
      <${Header} />
      <main class="landing-main">
        <h1>404</h1>
        <p>Halaman tidak ditemukan.</p>
        <button class="cta-button" onClick=${() => navigate('/')}>Kembali</button>
      </main>
      <${Footer} />
    </div>
  `;
}

function App() {
  const route = useHashRoute();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const session = await getSession();
        if (session) {
          setUser(session.user);
          const prof = await getProfile(session.user.id);
          setProfile(prof);
        }
      } catch (e) {
        console.error('Auth init error:', e);
      } finally {
        setAuthLoading(false);
      }
    })();
  }, []);

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setProfile(null);
    navigate('/');
  };

  const handleLoginSuccess = async () => {
    const session = await getSession();
    if (session) {
      setUser(session.user);
      const prof = await getProfile(session.user.id);
      setProfile(prof);
      navigate(prof?.status === 'pending' ? '/pending' : '/build');
    }
  };

  if (authLoading) return html`<div style="padding: 40px; text-align: center;">Memuat...</div>`;

  // Public Routes
  if (route === '/' || route === '') return html`<${Landing} />`;
  if (route === '/login') return html`<${LoginPage} navigate=${navigate} onLoginSuccess=${handleLoginSuccess} />`;
  if (route === '/register') return html`<${RegisterPage} navigate=${navigate} />`;
  
  // Auth Routes
  if (route === '/pending') return html`<${PendingPage} navigate=${navigate} onLogout=${handleLogout} />`;
  if (route === '/build') return html`<${BuildPage} navigate=${navigate} />`;
  if (route === '/paste') return html`<${PastePage} navigate=${navigate} />`;
  if (route === '/preview') return html`<${PreviewPage} navigate=${navigate} profile=${profile} />`;
  if (route === '/export') return html`<${ExportPage} navigate=${navigate} profile=${profile} />`;
  if (route === '/bank-soal') return html`<${BankSoalPage} navigate=${navigate} profile=${profile} />`;
  if (route === '/pustaka') return html`<${PustakaPage} navigate=${navigate} profile=${profile} />`;
  
  // Dev Route
  if (route === '/debug') return html`<${DebugPage} />`;
  
  return html`<${NotFound} />`;
}

render(html`<${ErrorBoundary}><${App} /></${ErrorBoundary}>`, document.getElementById('app'));
