import { h } from 'https://esm.sh/preact@10.24.3';
import { useState, useEffect } from 'https://esm.sh/preact@10.24.3/hooks';
import htm from 'https://esm.sh/htm@3.1.1';
import { ArrowLeft, Download, Eye, Loader2, BookOpen } from 'https://esm.sh/lucide-preact@0.460.0?deps=preact@10.24.3';
import { getPublicLibrary, copyFromPublic } from '../lib/bank-soal.js';

const html = htm.bind(h);

export function PustakaPage({ navigate, profile }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    getPublicLibrary().then(setItems).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleDownload = async (item) => {
    if (!profile) { navigate('/login'); return; }
    setDownloading(item.id);
    try {
      await copyFromPublic(profile.id, item);
      alert('Berhasil disimpan ke Bank Soal Anda!');
      navigate('/bank-soal');
    } catch (e) { alert(e.message); }
    setDownloading(null);
  };

  const handlePreview = (item) => {
    localStorage.setItem('tka-studio-draft-v1', JSON.stringify({ paket: item.payload, warnings: [] }));
    navigate('/preview');
  };

  return html`
    <div class="page">
      <div class="page-shell">
        <div class="page-header">
          <button class="btn-back" onClick=${() => navigate('/')}><${ArrowLeft} size=${16} /> Beranda</button>
          <h1 class="page-title">Pustaka Soal TKA</h1>
          <p class="page-subtitle">Koleksi soal terbaik yang dibagikan oleh guru-guru Indonesia.</p>
        </div>

        ${loading ? html`<div class="text-center mt-4"><${Loader2} class="spin" /></div>` : html`
          <div class="soal-list">
            ${items.length === 0 && html`<div class="empty-state"><${BookOpen} size=${32}/><p>Belum ada soal yang dibagikan.</p></div>`}
            ${items.map(item => html`
              <div class="soal-card">
                <div class="soal-header">
                  <div class="soal-header-left">
                    <span class="badge-pg">${item.mapel}</span>
                    <b>${item.judul}</b>
                  </div>
                </div>
                <div class="soal-body" style="padding-bottom: 0;">
                  <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 12px;">
                    Oleh: <b>${item.profiles?.nama || 'Guru'}</b> (${item.profiles?.sekolah || '-'}) · 
                    ${item.downloads || 0} unduhan
                  </div>
                  
                  <div class="result-card" style="padding: 12px; margin-bottom: 16px;">
                    <div style="font-size: 11px; font-weight: bold; color: var(--primary); margin-bottom: 4px;">CUPLIKAN SOAL #1:</div>
                    <div style="font-size: 13px;">${item.payload.soal[0]?.q || '-'}</div>
                  </div>

                  <div class="form-actions" style="flex-direction: row; margin-bottom: 16px;">
                    <button class="btn-secondary" onClick=${() => handlePreview(item)}><${Eye} size=${16}/> Preview</button>
                    <button class="btn-primary" onClick=${() => handleDownload(item)} disabled=${downloading === item.id}>
                      ${downloading === item.id ? html`<${Loader2} class="spin" size=${16}/>` : html`<${Download} size=${16}/>`}
                      Simpan ke Bank
                    </button>
                  </div>
                </div>
              </div>
            `)}
          </div>
        `}
      </div>
    </div>
  `;
}
