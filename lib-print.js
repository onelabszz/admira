export function formatDateId(d) {
  if (!d) return '-';
  try {
    return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  } catch { return d; }
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  })[c]);
}

export function buildPrintHtml({ workspace, letter, body, signatureDataUrl }) {
  const ws = workspace || {};
  return `<!doctype html>
<html lang="id"><head>
<meta charset="utf-8">
<title>${escapeHtml(letter.number || 'Surat')}</title>
<style>
  @page { size: A4; margin: 2cm 2cm 2cm 2.5cm; }
  body { font-family: 'Times New Roman', 'Liberation Serif', serif; font-size: 12pt; color: #000; line-height: 1.55; margin: 0; }
  .kop { display: flex; align-items: center; gap: 18px; border-bottom: 3px double #000; padding-bottom: 10px; margin-bottom: 20px; }
  .kop .logo { width: 85px; height: 85px; object-fit: contain; flex-shrink: 0; }
  .kop .text { flex: 1; text-align: center; }
  .kop .text h1 { margin: 0; font-size: 15pt; text-transform: uppercase; letter-spacing: .5px; }
  .kop .text h2 { margin: 2px 0; font-size: 11pt; font-weight: normal; }
  .kop .text p { margin: 2px 0; font-size: 9.5pt; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; margin-bottom: 8px; font-size: 11pt; }
  .meta .left div { margin: 1px 0; }
  .title { text-align: center; margin: 18px 0 16px; }
  .title h3 { margin: 0; font-size: 13pt; text-transform: uppercase; text-decoration: underline; letter-spacing: .5px; }
  .body { text-align: justify; white-space: pre-wrap; }
  .signature { margin-top: 40px; display: flex; justify-content: flex-end; }
  .signature .block { text-align: center; min-width: 220px; }
  .signature .block .stamp { height: 90px; display: flex; align-items: center; justify-content: center; margin: 6px 0; }
  .signature .block .stamp img { max-height: 90px; max-width: 180px; }
  .signature .block .name { font-weight: bold; text-decoration: underline; margin-top: 4px; }
  .signature .block .nip { font-size: 11pt; }
</style>
</head><body>
  <div class="kop">
    ${ws.logoDataUrl ? `<img class="logo" src="${ws.logoDataUrl}" alt="logo">` : ''}
    <div class="text">
      <h1>${escapeHtml(ws.name || 'Nama Sekolah')}</h1>
      <p>${escapeHtml(ws.address || 'Alamat sekolah')}</p>
      <p>${[ws.npsn ? `NPSN: ${escapeHtml(ws.npsn)}` : '', escapeHtml(ws.contact || '')].filter(Boolean).join(' • ')}</p>
    </div>
  </div>

  <div class="meta">
    <div class="left">
      <div>Nomor&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: ${escapeHtml(letter.number || '-')}</div>
      <div>Lampiran : -</div>
      <div>Perihal&nbsp;&nbsp;&nbsp;: ${escapeHtml(letter.subject || '-')}</div>
    </div>
  </div>

  <div class="title"><h3>${escapeHtml(letter.subject || '')}</h3></div>

  <div class="body">${escapeHtml(body)}</div>

  <div class="signature">
    <div class="block">
      <div>${escapeHtml(ws.city || '')}${ws.city ? ', ' : ''}${formatDateId(letter.date)}</div>
      <div>Kepala ${escapeHtml(ws.name || 'Sekolah')}</div>
      <div class="stamp">${signatureDataUrl ? `<img src="${signatureDataUrl}" alt="ttd">` : ''}</div>
      <div class="name">${escapeHtml(ws.headmaster || '_________________')}</div>
      <div class="nip">NIP. ${escapeHtml(ws.headmasterNip || '_________________')}</div>
    </div>
  </div>
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
