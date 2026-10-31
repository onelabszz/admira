/**
 * TKA Studio — stores/studio.js
 * © 2026 Ekwan Nugroho — Wonogiri
 * All rights reserved.
 */

const DRAFT_KEY = 'tka-studio-draft-v1';

export function saveDraft(draft) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch {}
}

export function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}