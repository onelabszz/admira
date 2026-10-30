import { icon } from './lib-icons.js';

export function confirmDialog({
  title = 'Konfirmasi',
  message = '',
  confirmText = 'Lanjutkan',
  cancelText = 'Batal',
  danger = false,
  iconName = null,
} = {}) {
  return new Promise(resolve => {
    const dlg = document.createElement('dialog');
    dlg.className = 'confirm-dialog';
    const iName = iconName || (danger ? 'TriangleAlert' : 'Info');
    dlg.innerHTML = `
      <div class="confirm-body">
        <div class="confirm-icon ${danger ? 'danger' : ''}">${icon(iName, { size: 22 })}</div>
        <h2 class="confirm-title">${title}</h2>
        ${message ? `<p class="confirm-message">${message}</p>` : ''}
      </div>
      <div class="confirm-actions">
        <button type="button" class="btn" data-act="cancel">${cancelText}</button>
        <button type="button" class="btn ${danger ? 'danger' : 'primary'}" data-act="confirm">${confirmText}</button>
      </div>
    `;
    document.body.appendChild(dlg);

    let closed = false;
    const close = result => {
      if (closed) return;
      closed = true;
      dlg.close();
      setTimeout(() => dlg.remove(), 250);
      resolve(result);
    };

    dlg.querySelector('[data-act="cancel"]').addEventListener('click', () => close(false));
    dlg.querySelector('[data-act="confirm"]').addEventListener('click', () => close(true));
    dlg.addEventListener('cancel', e => { e.preventDefault(); close(false); });
    dlg.addEventListener('click', e => { if (e.target === dlg) close(false); });

    dlg.showModal();
    requestAnimationFrame(() => dlg.querySelector('[data-act="confirm"]').focus());
  });
}