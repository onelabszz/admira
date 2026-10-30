import { icon } from './lib-icons.js';

let container = null;
const ICONS = { success: 'CircleCheck', error: 'CircleX', warn: 'TriangleAlert', info: 'Info' };

function ensureContainer() {
  if (container && document.body.contains(container)) return container;
  container = document.createElement('div');
  container.className = 'toast-container';
  container.setAttribute('role', 'status');
  container.setAttribute('aria-live', 'polite');
  document.body.appendChild(container);
  return container;
}

function show(message, { type = 'info', duration = 4000 } = {}) {
  const c = ensureContainer();
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.innerHTML = `
    <div class="toast-icon">${icon(ICONS[type] || 'Info', { size: 18 })}</div>
    <div class="toast-message">${message}</div>
    <button class="toast-close" aria-label="Tutup">${icon('X', { size: 14 })}</button>
    <div class="toast-progress" style="animation-duration:${duration}ms"></div>
  `;
  c.appendChild(el);

  let timer = setTimeout(dismiss, duration);
  function dismiss() {
    clearTimeout(timer);
    el.classList.add('toast-out');
    setTimeout(() => el.remove(), 280);
  }
  el.querySelector('.toast-close').addEventListener('click', dismiss);
  return { dismiss };
}

export const toast = {
  success: (m, o) => show(m, { ...o, type: 'success' }),
  error:   (m, o) => show(m, { ...o, type: 'error' }),
  warn:    (m, o) => show(m, { ...o, type: 'warn' }),
  info:    (m, o) => show(m, { ...o, type: 'info' }),
};