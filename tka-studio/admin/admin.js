/**
 * TKA Studio — Admin Panel
 * © 2026 Ekwan Nugroho — Wonogiri
 */
import { h, render } from 'https://esm.sh/preact@10.24.3';
import { useState, useEffect, useMemo } from 'https://esm.sh/preact@10.24.3/hooks';
import htm from 'https://esm.sh/htm@3.1.1';
import {
  GraduationCap, LogOut, RefreshCw, UserCheck, Clock, Check, Copy,
  ExternalLink, CheckCircle2, Users, Ban, Trash2, Search, X,
  ChevronLeft, ChevronRight,
} from 'https://esm.sh/lucide-preact@0.460.0?deps=preact@10.24.3';

const html = htm.bind(h);

const SUPABASE_URL = 'https://zrzbitqfrvtgmxeqnyhi.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpyemJpdHFmcnZ0Z214ZXFueWhpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI2NDA1ODUsImV4cCI6MjEwODIxNjU4NX0.xGZesUy6jrkcXGGg3N-uYgqNjRl7jtHEbqoBQN1IEpQ';

const PAGE_SIZE = 10;

let sb = null;
async function getSupabase() {
  if (sb) return sb;
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  sb = createClient(SUPABASE_URL, SUPABASE_ANON, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: 'tka-admin-auth' },
  });
  return sb;
}

function formatDate(iso) {
  if (!iso) return '-';
  try { return new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return iso; }
}

function waLink(wa, message) {
  if (!wa) return null;
  let num = String(wa).replace(/\D/g, '');
  if (num.startsWith('0')) num = '62' + num.slice(1);
  else if (num.startsWith('8')) num = '62' + num;
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`;
}

function waMessage(nama, email, password) {
  return `Halo ${nama || 'Bapak/Ibu'}!\n\nAkun TKA Studio Anda sudah aktif. 🎉\n\nLogin di: https://ekwannugroho.github.io/tka-studio/#/login\nEmail: ${email}\nPassword: ${password}\n\nPassword ini digenerate otomatis. Mohon disimpan di tempat aman.\n\nTerima kasih,\nEkwan Nugroho\nTKA Studio — Wonogiri`;
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; }
  catch {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy'); document.body.removeChild(ta); return ok;
  }
}

function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const client = await getSupabase();
      const { data, error: err } = await client.auth.signInWithPassword({ email, password });
      if (err) { setError(err.message); setLoading(false); return; }
      const { data: profile, error: pErr } = await client.from('profiles').select('role,status,nama').eq('id', data.user.id).single();
      if (pErr || !profile) { setError('Profil tidak ditemukan.'); await client.auth.signOut(); setLoading(false); return; }
      if (profile.role !== 'admin') { setError('Akun ini bukan admin.'); await client.auth.signOut(); setLoading(false); return; }
      if (profile.status !== 'active') { setError('Akun admin belum aktif.'); await client.auth.signOut(); setLoading(false); return; }
      onLogin(data.session, profile);
    } catch (e) { setError(String(e?.message || e)); setLoading(false); }
  };

  return html`
    <div class="login-wrap">
      <div class="login-card">
        <div class="brand" style="margin-bottom: 20px; justify-content: center;">
          <${GraduationCap} size=${24} strokeWidth=${2} />
          <span>TKA Studio <small>Admin</small></span>
        </div>
        <h1>Masuk sebagai Admin</h1>
        <p>Panel ini hanya untuk pengelola TKA Studio.</p>
        ${error && html`<div class="alert alert-error">${error}</div>`}
        <form onSubmit=${handleSubmit}>
          <div class="field"><label>Email</label><input class="input" type="email" required value=${email} onInput=${(e) => setEmail(e.target.value)} placeholder="admin@example.com" /></div>
          <div class="field"><label>Password</label><input class="input" type="password" required value=${password} onInput=${(e) => setPassword(e.target.value)} placeholder="••••••••" /></div>
          <button class="btn btn-primary" type="submit" disabled=${loading}>${loading ? 'Memeriksa...' : 'Masuk'}</button>
        </form>
      </div>
    </div>
  `;
}

function PasswordModal({ data, onClose }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => { const ok = await copyText(data.password); if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000); } };
  const link = waLink(data.wa, waMessage(data.nama, data.email, data.password));
  return html`
    <div class="modal-backdrop" onClick=${onClose}>
      <div class="modal" style="position: relative;" onClick=${(e) => e.stopPropagation()}>
        <button class="modal-close" onClick=${onClose}>×</button>
        <h2><${CheckCircle2} size=${20} color="var(--success)" /> Akun Aktif</h2>
        <div class="info-row"><span class="info-label">Nama</span><span>${data.nama || '-'}</span></div>
        <div class="info-row"><span class="info-label">Email</span><span>${data.email}</span></div>
        <div class="info-row"><span class="info-label">WhatsApp</span><span>${data.wa || '-'}</span></div>
        <div style="margin-top: 16px; font-size: 12px; color: var(--text-muted);">Password yang digenerate:</div>
        <div class="password-box"><span>${data.password}</span><button onClick=${handleCopy} title="Salin">${copied ? html`<${Check} size=${18} />` : html`<${Copy} size=${18} />`}</button></div>
        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">Password ini hanya ditampilkan sekali. Salin dan kirim ke guru via WhatsApp sekarang.</div>
        ${link ? html`<a class="btn btn-primary" href=${link} target="_blank" rel="noopener"><${ExternalLink} size=${16} /> Kirim via WhatsApp</a>` : html`<div class="alert alert-error">Nomor WA tidak tersedia.</div>`}
        <button class="btn btn-secondary" style="margin-top: 8px; width: 100%;" onClick=${onClose}>Tutup</button>
      </div>
    </div>
  `;
}

function Dashboard({ session, profile, onLogout }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [tab, setTab] = useState('pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(null);
  const [modalData, setModalData] = useState(null);

  const loadUsers = async () => {
    setLoading(true); setError('');
    try {
      const client = await getSupabase();
      const { data, error: err } = await client.from('profiles').select('id,email,nama,wa,sekolah,kota,status,role,created_at,verified_at').order('created_at', { ascending: false });
      if (err) { setError(err.message); setLoading(false); return; }
      setUsers(data || []);
      setLoading(false);
    } catch (e) { setError(String(e?.message || e)); setLoading(false); }
  };

  useEffect(() => { loadUsers(); }, []);

  // Reset ke halaman 1 saat tab atau search berubah
  useEffect(() => { setPage(1); }, [tab, search]);

  const counts = useMemo(() => ({
    pending: users.filter(u => u.status === 'pending' && u.role !== 'admin').length,
    active: users.filter(u => u.status === 'active' && u.role !== 'admin').length,
    suspended: users.filter(u => u.status === 'suspended' && u.role !== 'admin').length,
  }), [users]);

  const filteredList = useMemo(() => {
    const statusMap = { pending: 'pending', active: 'active', suspended: 'suspended' };
    let list = users.filter(u => u.status === statusMap[tab] && u.role !== 'admin');

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(u => {
        const nama = String(u.nama || '').toLowerCase();
        const email = String(u.email || '').toLowerCase();
        const sekolah = String(u.sekolah || '').toLowerCase();
        const wa = String(u.wa || '').toLowerCase();
        return nama.includes(q) || email.includes(q) || sekolah.includes(q) || wa.includes(q);
      });
    }
    return list;
  }, [users, tab, search]);

  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const paginatedList = filteredList.slice(startIdx, startIdx + PAGE_SIZE);
  const showingFrom = filteredList.length === 0 ? 0 : startIdx + 1;
  const showingTo = Math.min(startIdx + PAGE_SIZE, filteredList.length);

  const flashSuccess = (msg) => { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); };

  const handleActivate = async (user) => {
    if (!confirm(`Aktifkan akun ${user.nama || user.email} dan buat password?`)) return;
    setBusy(user.id); setError('');
    try {
      const client = await getSupabase();
      const res = await fetch(SUPABASE_URL + '/functions/v1/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token, 'apikey': SUPABASE_ANON },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Gagal aktivasi (' + res.status + ')'); setBusy(null); return; }
      setModalData({ ...data, wa: user.wa, nama: user.nama || data.nama });
      await loadUsers();
      setBusy(null);
    } catch (e) { setError('Gagal: ' + String(e?.message || e)); setBusy(null); }
  };

  const handleSuspend = async (user) => {
    if (!confirm(`Nonaktifkan akun ${user.nama || user.email}?\n\nGuru tidak akan bisa mengakses fitur sampai diaktifkan kembali.`)) return;
    setBusy(user.id); setError('');
    try {
      const client = await getSupabase();
      const { error: err } = await client.from('profiles').update({ status: 'suspended' }).eq('id', user.id);
      if (err) { setError(err.message); setBusy(null); return; }
      await loadUsers();
      flashSuccess(`Akun ${user.nama || user.email} dinonaktifkan.`);
      setBusy(null);
    } catch (e) { setError(String(e?.message || e)); setBusy(null); }
  };

  const handleReactivate = async (user) => {
    if (!confirm(`Aktifkan kembali akun ${user.nama || user.email}?`)) return;
    setBusy(user.id); setError('');
    try {
      const client = await getSupabase();
      const { error: err } = await client.from('profiles').update({ status: 'active' }).eq('id', user.id);
      if (err) { setError(err.message); setBusy(null); return; }
      await loadUsers();
      flashSuccess(`Akun ${user.nama || user.email} diaktifkan kembali.`);
      setBusy(null);
    } catch (e) { setError(String(e?.message || e)); setBusy(null); }
  };

  const handleDelete = async (user) => {
    const typed = prompt(`HAPUS PERMANEN akun ${user.nama || user.email}.\n\nSemua data guru ini akan hilang dan tidak bisa dikembalikan.\n\nKetik "HAPUS" untuk konfirmasi:`);
    if (typed !== 'HAPUS') { if (typed !== null) alert('Konfirmasi tidak cocok. Dibatalkan.'); return; }
    setBusy(user.id); setError('');
    try {
      const res = await fetch(SUPABASE_URL + '/functions/v1/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + session.access_token, 'apikey': SUPABASE_ANON },
        body: JSON.stringify({ user_id: user.id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Gagal menghapus (' + res.status + ')'); setBusy(null); return; }
      await loadUsers();
      flashSuccess(`Akun ${user.nama || user.email} dihapus permanen.`);
      setBusy(null);
    } catch (e) { setError('Gagal: ' + String(e?.message || e)); setBusy(null); }
  };

  const handleLogout = async () => {
    if (!confirm('Keluar dari panel admin?')) return;
    const client = await getSupabase();
    await client.auth.signOut();
    onLogout();
  };

  const tabs = [
    { k: 'pending', label: 'Menunggu', icon: Clock, count: counts.pending },
    { k: 'active', label: 'Aktif', icon: Users, count: counts.active },
    { k: 'suspended', label: 'Ditangguhkan', icon: Ban, count: counts.suspended },
  ];

  return html`
    <div class="shell">
      <div class="header">
        <div class="brand"><${GraduationCap} size=${22} strokeWidth=${2} /><span>TKA Studio <small>Admin</small></span></div>
        <div class="header-actions">
          <button class="btn btn-secondary btn-sm" onClick=${loadUsers} disabled=${loading}><${RefreshCw} size=${14} class=${loading ? 'spin' : ''} /> Muat Ulang</button>
          <button class="btn btn-secondary btn-sm" onClick=${handleLogout}><${LogOut} size=${14} /> Keluar</button>
        </div>
      </div>

      <div class="current-user">Login sebagai <b>${profile.nama || 'Admin'}</b></div>

      ${error && html`<div class="alert alert-error">${error}</div>`}
      ${success && html`<div class="alert alert-success">${success}</div>`}

      <div class="tabs">
        ${tabs.map(t => html`
          <button class=${'tab' + (tab === t.k ? ' active' : '')} onClick=${() => setTab(t.k)}>
            <${t.icon} size=${14} class="tab-icon" />
            ${t.label} <span class="count">${t.count}</span>
          </button>
        `)}
      </div>

      <div class="search-wrapper">
        <${Search} size=${16} class="search-icon" />
        <input
          class="search-input"
          type="text"
          placeholder="Cari nama, email, sekolah, atau nomor WA..."
          value=${search}
          onInput=${(e) => setSearch(e.target.value)}
        />
        ${search && html`
          <button class="search-clear" onClick=${() => setSearch('')} aria-label="Hapus pencarian">
            <${X} size=${14} />
          </button>
        `}
      </div>

      ${loading && users.length === 0 && html`<div class="empty"><p>Memuat data...</p></div>`}

      ${!loading && filteredList.length === 0 && html`
        <div class="empty">
          <${UserCheck} size=${32} strokeWidth=${1.5} color="var(--text-subtle)" />
          ${search
            ? html`<p>Tidak ada hasil untuk "<b>${search}</b>"</p>
                <button class="btn btn-secondary btn-sm" style="margin-top: 12px;" onClick=${() => setSearch('')}>Hapus Pencarian</button>`
            : html`<p>${tab === 'pending' ? 'Tidak ada pendaftar yang menunggu.' : tab === 'active' ? 'Belum ada user aktif.' : 'Tidak ada akun yang ditangguhkan.'}</p>`}
        </div>
      `}

      ${filteredList.length > 0 && html`
        <div class="list">
          ${paginatedList.map((u) => html`
            <div class=${'list-item ' + (u.status === 'suspended' ? 'suspended' : u.status)}>
              <div class="list-head">
                <div>
                  <div class="list-title">${u.nama || '(tanpa nama)'}</div>
                  <div class="list-meta">
                    <span>📧 ${u.email}</span>
                    ${u.wa && html`<span>📱 ${u.wa}</span>`}
                    ${u.sekolah && html`<span>🏫 ${u.sekolah}</span>`}
                  </div>
                  <div class="list-meta">
                    <span>📅 Daftar: ${formatDate(u.created_at)}</span>
                    ${u.verified_at && html`<span>✅ Aktif: ${formatDate(u.verified_at)}</span>`}
                  </div>
                </div>
              </div>
              <div class="list-actions">
                ${u.status === 'pending' && html`
                  <button class="btn btn-primary btn-sm" disabled=${busy === u.id} onClick=${() => handleActivate(u)}>
                    ${busy === u.id ? 'Memproses...' : html`<${UserCheck} size=${14} /> Aktifkan & Buat Password`}
                  </button>
                `}
                ${u.status === 'active' && html`
                  <button class="btn btn-secondary btn-sm" disabled=${busy === u.id} onClick=${() => handleSuspend(u)}>
                    <${Ban} size=${14} /> Nonaktifkan
                  </button>
                  <button class="btn btn-danger btn-sm" disabled=${busy === u.id} onClick=${() => handleDelete(u)}>
                    <${Trash2} size=${14} /> Hapus
                  </button>
                `}
                ${u.status === 'suspended' && html`
                  <button class="btn btn-primary btn-sm" disabled=${busy === u.id} onClick=${() => handleReactivate(u)}>
                    <${UserCheck} size=${14} /> Aktifkan Kembali
                  </button>
                  <button class="btn btn-danger btn-sm" disabled=${busy === u.id} onClick=${() => handleDelete(u)}>
                    <${Trash2} size=${14} /> Hapus
                  </button>
                `}
              </div>
            </div>
          `)}
        </div>

        ${totalPages > 1 && html`
          <div class="pagination">
            <div class="pagination-info">
              Menampilkan <b>${showingFrom}–${showingTo}</b> dari <b>${filteredList.length}</b>
            </div>
            <div class="pagination-controls">
              <button class="pagination-btn" disabled=${safePage <= 1} onClick=${() => setPage(safePage - 1)} aria-label="Halaman sebelumnya">
                <${ChevronLeft} size=${16} />
              </button>
              <span class="pagination-page">${safePage} / ${totalPages}</span>
              <button class="pagination-btn" disabled=${safePage >= totalPages} onClick=${() => setPage(safePage + 1)} aria-label="Halaman berikutnya">
                <${ChevronRight} size=${16} />
              </button>
            </div>
          </div>
        `}

        ${totalPages === 1 && filteredList.length > PAGE_SIZE / 2 && html`
          <div class="pagination">
            <div class="pagination-info">Menampilkan <b>${filteredList.length}</b> data</div>
          </div>
        `}
      `}

      <div class="footer">© 2026 Ekwan Nugroho — Wonogiri · Panel Admin</div>

      ${modalData && html`<${PasswordModal} data=${modalData} onClose=${() => setModalData(null)} />`}
    </div>
  `;
}

function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      const client = await getSupabase();
      const { data } = await client.auth.getSession();
      if (data?.session) {
        const { data: prof } = await client.from('profiles').select('role,status,nama').eq('id', data.session.user.id).single();
        if (prof && prof.role === 'admin' && prof.status === 'active') { setSession(data.session); setProfile(prof); }
        else { await client.auth.signOut(); }
      }
      setChecking(false);
    })();
  }, []);

  if (checking) return html`<div class="login-wrap"><div class="login-card"><p>Memeriksa sesi...</p></div></div>`;
  if (!session || !profile) return html`<${LoginScreen} onLogin=${(s, p) => { setSession(s); setProfile(p); }} />`;
  return html`<${Dashboard} session=${session} profile=${profile} onLogout=${() => { setSession(null); setProfile(null); }} />`;
}

render(html`<${App} />`, document.getElementById('app'));