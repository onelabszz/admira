/**
 * TKA Studio — pages/auth.js
 * © 2026 Ekwan Nugroho — Wonogiri
 */
import { h } from 'https://esm.sh/preact@10.24.3';
import { useState } from 'https://esm.sh/preact@10.24.3/hooks';
import htm from 'https://esm.sh/htm@3.1.1';
import { GraduationCap, ArrowLeft, Loader2, CheckCircle2, Clock } from 'https://esm.sh/lucide-preact@0.460.0?deps=preact@10.24.3';
import { signIn, registerUser } from '../supabase/auth.js';

const html = htm.bind(h);

export function LoginPage({ navigate, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      onLoginSuccess();
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };
  
  return html`
    <div class="auth-wrap">
      <div class="auth-card">
        <button class="btn-back" onClick=${() => navigate('/')} style="margin-bottom: 24px;">
          <${ArrowLeft} size=${16} /> Beranda
        </button>
        <div class="logo" style="justify-content: center; margin-bottom: 24px;">
          <${GraduationCap} size=${28} />
          <span style="font-size: 20px;">TKA Studio</span>
        </div>
        <h1 style="text-align: center; font-size: 20px; margin-bottom: 8px;">Selamat Datang Kembali</h1>
        <p style="text-align: center; color: var(--text-muted); font-size: 14px; margin-bottom: 24px;">
          Masuk untuk melanjutkan membuat soal.
        </p>

        ${error && html`<div class="alert alert-error">${error}</div>`}

        <form onSubmit=${handleSubmit}>
          <div class="form-field">
            <label class="form-label">Email</label>
            <input class="form-input" type="email" required value=${email} onInput=${(e) => setEmail(e.target.value)} />
          </div>
          <div class="form-field">
            <label class="form-label">Password</label>
            <input class="form-input" type="password" required value=${password} onInput=${(e) => setPassword(e.target.value)} />
          </div>
          <button class="btn-primary btn-large" type="submit" disabled=${loading} style="margin-top: 16px;">
            ${loading ? html`<${Loader2} size=${18} class="spin" />` : 'Masuk'}
          </button>
        </form>

        <div style="text-align: center; margin-top: 24px; font-size: 13px; color: var(--text-muted);">
          Belum punya akun? <a href="#/register" style="color: var(--brand-700); font-weight: 600; text-decoration: none;">Daftar Gratis</a>
        </div>
      </div>
    </div>
  `;
}

export function RegisterPage({ navigate }) {
  const [form, setForm] = useState({ nama: '', email: '', wa: '', sekolah: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await registerUser(form.nama, form.email, form.wa, form.sekolah);
      setSuccess(true);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };
  
  if (success) {
    return html`
      <div class="auth-wrap">
        <div class="auth-card" style="text-align: center;">
          <${CheckCircle2} size=${48} color="var(--success)" style="margin-bottom: 16px;" />
          <h1 style="font-size: 20px; margin-bottom: 8px;">Pendaftaran Berhasil!</h1>
          <p style="color: var(--text-muted); font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
            Akun Anda sedang ditinjau oleh Admin. <br/>
            Password akan dikirim melalui WhatsApp Anda dalam 1x24 jam.
          </p>
          <button class="btn-secondary" onClick=${() => navigate('/')}>Kembali ke Beranda</button>
        </div>
      </div>
    `;
  }
  
  return html`
    <div class="auth-wrap">
      <div class="auth-card">
        <button class="btn-back" onClick=${() => navigate('/')} style="margin-bottom: 24px;">
          <${ArrowLeft} size=${16} /> Beranda
        </button>
        <h1 style="text-align: center; font-size: 20px; margin-bottom: 8px;">Daftar Akun Guru</h1>
        <p style="text-align: center; color: var(--text-muted); font-size: 13px; margin-bottom: 24px;">
          Dapatkan akses penuh untuk mengunduh bank soal.
        </p>

        ${error && html`<div class="alert alert-error">${error}</div>`}

        <form onSubmit=${handleSubmit}>
          <div class="form-field">
            <label class="form-label">Nama Lengkap</label>
            <input class="form-input" required value=${form.nama} onInput=${(e) => setForm({...form, nama: e.target.value})} placeholder="Contoh: Budi Santoso" />
          </div>
          <div class="form-field">
            <label class="form-label">Email</label>
            <input class="form-input" type="email" required value=${form.email} onInput=${(e) => setForm({...form, email: e.target.value})} placeholder="email@sekolah.com" />
          </div>
          <div class="form-field">
            <label class="form-label">No. WhatsApp</label>
            <input class="form-input" type="tel" required value=${form.wa} onInput=${(e) => setForm({...form, wa: e.target.value})} placeholder="08123456789" />
            <div class="form-hint">Password akan dikirim ke nomor ini.</div>
          </div>
          <div class="form-field">
            <label class="form-label">Asal Sekolah (Opsional)</label>
            <input class="form-input" value=${form.sekolah} onInput=${(e) => setForm({...form, sekolah: e.target.value})} placeholder="SD Negeri 1" />
          </div>
          <button class="btn-primary btn-large" type="submit" disabled=${loading} style="margin-top: 16px;">
            ${loading ? html`<${Loader2} size=${18} class="spin" />` : 'Kirim Pendaftaran'}
          </button>
        </form>

        <div style="text-align: center; margin-top: 24px; font-size: 13px; color: var(--text-muted);">
          Sudah punya akun? <a href="#/login" style="color: var(--brand-700); font-weight: 600; text-decoration: none;">Masuk</a>
        </div>
      </div>
    </div>
  `;
}

export function PendingPage({ navigate, onLogout }) {
  return html`
    <div class="auth-wrap">
      <div class="auth-card" style="text-align: center;">
        <div style="width: 64px; height: 64px; border-radius: 50%; background: #FFF7ED; color: #EA580C; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px;">
          <${Clock} size=${32} />
        </div>
        <h1 style="font-size: 22px; margin-bottom: 12px;">Menunggu Verifikasi</h1>
        <p style="color: var(--text-muted); font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
          Terima kasih sudah mendaftar! <br/>
          Saat ini akun Anda sedang ditinjau oleh Admin. <br/>
          Kami akan mengirimkan password melalui WhatsApp jika sudah disetujui.
        </p>
        
        <div style="background: var(--surface-muted); border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: left;">
          <div style="font-size: 13px; font-weight: 600; margin-bottom: 8px;">Sambil menunggu, Anda bisa:</div>
          <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: var(--text-muted); line-height: 1.6;">
            <li>Menyusun prompt soal</li>
            <li>Melihat preview soal</li>
            <li><i>(Belum bisa mengunduh)</i></li>
          </ul>
        </div>

        <button class="btn-primary" onClick=${() => navigate('/')} style="width: 100%; margin-bottom: 12px;">
          Coba Buat Soal
        </button>
        <button class="btn-secondary" onClick=${onLogout} style="width: 100%;">
          Keluar Akun
        </button>
      </div>
    </div>
  `;
}