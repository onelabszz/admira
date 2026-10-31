import { h } from 'https://esm.sh/preact@10.24.3';
import { useState, useEffect } from 'https://esm.sh/preact@10.24.3/hooks';
import htm from 'https://esm.sh/htm@3.1.1';
import { ArrowLeft, FolderOpen, Trash2, Share2, Eye, Loader2 } from 'https://esm.sh/lucide-preact@0.460.0?deps=preact@10.24.3';
import { getMyBank, deleteFromBank, togglePublic } from '../lib/bank-soal.js';

const html = htm.bind(h);

export function BankSoalPage({ navigate, profile }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) { navigate('/login'); return; }
    loadData();
  }, [profile]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getMyBank(profile.id);
      setItems(data);
    } catch (e) { alert('Gagal memuat: ' + e.message); }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm('Hapus paket ini dari Bank Soal Anda?')) return;
    try {
      await deleteFromBank(id);
      loadData();
    } catch (e) { alert(e.message); }
  };

  const handleShare = async (item) => {
    const isPublic = !item.is_public;
    if (isPublic && !confirm('Bagikan paket ini ke Pustaka Publik? Guru lain bisa melihat dan mengunduhnya.')) return;
    try {
      await togglePublic(item.id, isPublic);
      loadData();
    } catch (e) { alert(e.message); }
  };

  const handleOpen = (item) => {
    localStorage.setItem('tka-studio-draft-v1', JSON.stringify({ paket: item.payload, warnings: [] }));
    navigate('/preview');
  };

  return html`
    <div class="page">
      <div class="page-shell">
        <div class="page-header">
          <button class="btn-back" onClick=${() => navigate('/')}><${ArrowLeft} size=${16} /> Beranda</button>
          <h1 class="page-title">Bank Soal Saya</h1>
          <p class="page-subtitle">Koleksi paket soal yang tersimpan di akun Anda.</p>
        </div>

        ${loading ? html`<div class="text-center mt-4"><${Loader2} class="spin" /></div>` : html`
          <div class="soal-list">
            ${items.length === 0 && html`<div class="empty-state"><${FolderOpen} size=${32}/><p>Belum ada soal tersimpan.</p></div>`}
            ${items.map(item => html`
              <div class="soal-card">
                <div class="soal-header">
                  <div class="soal-header-left">
                    <span class="badge-pg">${item.mapel}</span>
                    <b>${item.judul}</b>
                  </div>
                  <div class="soal-actions">
                    <button class="icon-btn" onClick=${() => handleOpen(item)} title="Buka"><${Eye} size=${16}/></button>
                    <button class="icon-btn ${item.is_public ? 'text-success' : ''}" onClick=${() => handleShare(item)} title="Bagikan ke Publik">
                      <${Share2} size=${16} />
                    </button>
                    <button class="icon-btn icon-danger" onClick=${() => handleDelete(item.id)} title="Hapus"><${Trash2} size=${16}/></button>
                  </div>
                </div>
                <div class="soal-body" style="padding: 12px 16px; font-size: 13px; color: var(--text-muted);">
                  ${item.payload.soal.length} soal · ${new Date(item.created_at).toLocaleDateString('id-ID')}
                  ${item.is_public ? html` · <span style="color:var(--success)">Publik</span>` : ''}
                </div>
              </div>
            `)}
          </div>
        `}
      </div>
    </div>
  `;
}
