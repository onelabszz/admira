import { parseDateValue } from './lib.js';

export function formatDateId(d) {
  if (!d) return '-';
  const date = parseDateValue(d);
  if (!date) return String(d);
  try {
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch { return String(d); }
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
}

export function buildPrintHtml({ workspace, letter, body, signatureMode = 'ttd' }) {
  const ws = workspace || {};
  const showTtd = signatureMode === 'ttd' || signatureMode === 'ttd-stamp';
  const showStamp = signatureMode === 'ttd-stamp';

  return `<!doctype html>
<html lang="id"><head>
<meta charset="utf-8">
<title>${escapeHtml(letter.number || 'Surat')}</title>
<style>
  @page { size: A4; margin: 2cm 2cm 2cm 2.5cm; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 11.5pt; color: #000; line-height: 1.4; margin: 0; padding: 0; }
  
  /* Kop Surat (Grid 3 Kolom) */
  .kop { display: grid; grid-template-columns: 80px 1fr 80px; align-items: center; border-bottom: 3px solid #000; padding-bottom: 6px; margin-bottom: 16px; }
  .kop-logo-left, .kop-logo-right { width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; }
  .kop-logo-left img, .kop-logo-right img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .kop-text { text-align: center; padding: 0 10px; }
  .kop-line-1 { font-size: 12pt; text-transform: uppercase; margin-bottom: 2px; }
  .kop-line-2 { font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; }
  .kop-line-3 { font-size: 16pt; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px; }
  .kop-line-4 { font-size: 9pt; margin-bottom: 1px; }
  .kop-line-5 { font-size: 9pt; margin-bottom: 0; }
  
  /* Meta Surat */
  .meta { display: table; width: 100%; margin-bottom: 20px; font-size: 11.5pt; }
  .meta .col { display: table-cell; width: 50%; vertical-align: top; }
  .meta .col div { margin: 2px 0; }
  
  /* Body / Isi */
  .body { text-align: justify; min-height: 400px; } /* Mendorong TTD ke bawah */
  .body p { margin: 0 0 10px 0; }
  .body table { border-collapse: collapse; margin-bottom: 10px; }
  .body td { padding: 2px 6px 2px 0; vertical-align: top; }
  
  /* Tanda Tangan */
  .signature { margin-top: 20px; display: flex; justify-content: flex-end; page-break-inside: avoid; }
  .signature .block { text-align: center; min-width: 250px; }
  .signature .stamp { 
    height: 70px; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    margin: 2px 0; 
    position: relative; 
  }
  .signature .stamp .cap { 
    position: absolute; 
    height: 90px; 
    opacity: 0.85; 
    z-index: 1; 
    left: 10px;
    top: -15px;
  }
  .signature .stamp .ttd { 
    max-height: 70px; 
    max-width: 160px; 
    position: relative; 
    z-index: 2; 
  }
  .signature .name { font-weight: bold; text-decoration: underline; margin-top: 4px; }
  .signature .nip { font-size: 11.5pt; }
</style>
</head><body>
  <div class="kop">
    <div class="kop-logo-left">${ws.logoDataUrl ? `<img src="${ws.logoDataUrl}" alt="Logo Kiri">` : ''}</div>
    <div class="kop-text">
      <div class="kop-line-1">${escapeHtml(ws.kopLine1 || 'PEMERINTAH DAERAH')}</div>
      <div class="kop-line-2">${escapeHtml(ws.kopLine2 || 'DINAS PENDIDIKAN')}</div>
      <div class="kop-line-3">${escapeHtml(ws.name || 'NAMA SEKOLAH')}</div>
      <div class="kop-line-4">${escapeHtml(ws.address || '-')}</div>
      <div class="kop-line-5">${[ws.contact ? `${escapeHtml(ws.contact)}` : '', ws.npsn ? `NPSN: ${escapeHtml(ws.npsn)}` : ''].filter(Boolean).join(' • ')}</div>
    </div>
    <div class="kop-logo-right">${ws.logoRightDataUrl ? `<img src="${ws.logoRightDataUrl}" alt="Logo Kanan">` : ''}</div>
  </div>

  <div class="meta">
    <div class="col">
      <div>Nomor&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${escapeHtml(letter.number || '-')}</div>
      <div>Lampiran : -</div>
      <div>Perihal&nbsp;&nbsp;&nbsp;: ${escapeHtml(letter.subject || '-')}</div>
    </div>
    <div class="col"></div>
  </div>

  <div class="body">${body}</div>

  <div class="signature">
    <div class="block">
      <div>${escapeHtml(ws.city || '')}${ws.city ? ', ' : ''}${formatDateId(letter.date)}</div>
      <div>Kepala ${escapeHtml(ws.name || 'Sekolah')}</div>
      <div class="stamp">
        ${showStamp && ws.stampDataUrl ? `<img class="cap" src="${ws.stampDataUrl}" alt="cap">` : ''}
        ${showTtd && ws.signatureDataUrl ? `<img class="ttd" src="${ws.signatureDataUrl}" alt="ttd">` : ''}
      </div>
      <div class="name">${escapeHtml(ws.headmaster || '_________________')}</div>
      <div class="nip">NIP. ${escapeHtml(ws.headmasterNip || '_________________')}</div>
    </div>
  </div>
</body></html>`;
}

/**
 * Cetak dokumen administratif E-KSP. Memakai kop yang sama dengan surat,
 * tetapi blok tanda tangan bisa dua atau tiga pihak.
 */
export function buildKspPrintHtml({ workspace, title, number = '', subject = '', date, body, signers = [] }) {
  const ws = workspace || {};
  const blocks = signers.length ? signers : [{
    name: ws.headmaster || '_________________',
    nip: ws.headmasterNip || '_________________',
    role: `Kepala ${ws.name || 'Sekolah'}`,
    image: ws.signatureDataUrl,
    stamp: ws.stampDataUrl,
  }];

  const signatureHtml = blocks.map(s => `
    <div class="block">
      <div>${escapeHtml(ws.city || '')}${ws.city ? ', ' : ''}${escapeHtml(s.date || formatDateId(date))}</div>
      <div>${escapeHtml(s.role || '')}</div>
      <div class="stamp">
        ${s.stamp ? `<img class="cap" src="${s.stamp}" alt="cap">` : ''}
        ${s.image ? `<img class="ttd" src="${s.image}" alt="ttd">` : ''}
      </div>
      <div class="name">${escapeHtml(s.name || '_________________')}</div>
      ${s.nip ? `<div class="nip">NIP. ${escapeHtml(s.nip)}</div>` : ''}
    </div>`).join('');

  return `<!doctype html>
<html lang="id"><head>
<meta charset="utf-8">
<title>${escapeHtml(title || 'Dokumen KSP')}</title>
<style>
  @page { size: A4; margin: 2cm 2cm 2cm 2.5cm; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 11.5pt; color: #000; line-height: 1.4; margin: 0; }
  .kop { display: grid; grid-template-columns: 80px 1fr 80px; align-items: center; border-bottom: 3px solid #000; padding-bottom: 6px; margin-bottom: 16px; }
  .kop-logo-left, .kop-logo-right { width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; }
  .kop-logo-left img, .kop-logo-right img { max-width: 100%; max-height: 100%; object-fit: contain; }
  .kop-text { text-align: center; padding: 0 10px; }
  .kop-line-1 { font-size: 12pt; text-transform: uppercase; margin-bottom: 2px; }
  .kop-line-2 { font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; }
  .kop-line-3 { font-size: 16pt; font-weight: bold; text-transform: uppercase; margin-bottom: 4px; }
  .kop-line-4 { font-size: 9pt; margin-bottom: 1px; }
  .kop-line-5 { font-size: 9pt; }
  .meta { width: 100%; margin-bottom: 20px; }
  .body { text-align: justify; min-height: 360px; }
  .body p { margin: 0 0 10px 0; }
  .body table { border-collapse: collapse; margin-bottom: 10px; }
  .body td { padding: 2px 6px 2px 0; vertical-align: top; }
  .body .tpl-missing { color: #B91C1C; background: #FEE2E2; padding: 0 3px; border-radius: 3px; }
  .body h3 { font-size: 12pt; margin: 14px 0 6px; }
  .signature { margin-top: 18px; display: flex; justify-content: space-around; gap: 20px; page-break-inside: avoid; }
  .signature .block { text-align: center; flex: 1; }
  .signature .stamp { height: 70px; display: flex; align-items: center; justify-content: center; position: relative; margin: 2px 0; }
  .signature .stamp .cap { position: absolute; height: 90px; opacity: .85; z-index: 1; left: 12px; top: -15px; }
  .signature .stamp .ttd { max-height: 70px; max-width: 160px; position: relative; z-index: 2; }
  .signature .name { font-weight: bold; text-decoration: underline; margin-top: 4px; }
  .signature .nip { font-size: 11pt; }
</style>
</head><body>
  <div class="kop">
    <div class="kop-logo-left">${ws.logoDataUrl ? `<img src="${ws.logoDataUrl}" alt="Logo Kiri">` : ''}</div>
    <div class="kop-text">
      <div class="kop-line-1">${escapeHtml(ws.kopLine1 || 'PEMERINTAH DAERAH')}</div>
      <div class="kop-line-2">${escapeHtml(ws.kopLine2 || 'DINAS PENDIDIKAN')}</div>
      <div class="kop-line-3">${escapeHtml(ws.name || 'NAMA SEKOLAH')}</div>
      <div class="kop-line-4">${escapeHtml(ws.address || '-')}</div>
      <div class="kop-line-5">${[ws.contact ? escapeHtml(ws.contact) : '', ws.npsn ? `NPSN: ${escapeHtml(ws.npsn)}` : ''].filter(Boolean).join(' • ')}</div>
    </div>
    <div class="kop-logo-right">${ws.logoRightDataUrl ? `<img src="${ws.logoRightDataUrl}" alt="Logo Kanan">` : ''}</div>
  </div>
  ${number || subject ? `<div class="meta"><div>Nomor&nbsp;&nbsp;: ${escapeHtml(number || '-')}</div><div>Perihal&nbsp;: ${escapeHtml(subject || title || '-')}</div></div>` : ''}
  <div class="body">${body}</div>
  <div class="signature">${signatureHtml}</div>
</body></html>`;
}

export function printHtml(html) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open(); doc.write(html); doc.close();
  const fire = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } finally {
      setTimeout(() => iframe.remove(), 1000);
    }
  };
  if (iframe.contentWindow.document.readyState === 'complete') fire();
  else iframe.onload = () => setTimeout(fire, 150);
}
