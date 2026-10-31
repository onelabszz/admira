/**
 * TKA Studio — components/Stepper.js
 * © 2026 Ekwan Nugroho — Wonogiri
 */
import { h } from 'https://esm.sh/preact@10.24.3';
import { useState, useEffect } from 'https://esm.sh/preact@10.24.3/hooks';
import htm from 'https://esm.sh/htm@3.1.1';
import { Wand2, ClipboardPaste, ScanSearch, FileDown, Check, Lock } from 'https://esm.sh/lucide-preact@0.460.0?deps=preact@10.24.3';
import { loadDraft } from '../stores/studio.js';

const html = htm.bind(h);

export function Stepper({ current }) {
  const [hasPaket, setHasPaket] = useState(false);
  
  useEffect(() => {
    const d = loadDraft();
    setHasPaket(!!(d && d.paket));
  }, []);
  
  const steps = [
    { id: 'build', num: 1, label: 'Prompt', icon: Wand2, path: '/build' },
    { id: 'paste', num: 2, label: 'Tempel', icon: ClipboardPaste, path: '/paste' },
    { id: 'preview', num: 3, label: 'Preview', icon: ScanSearch, path: '/preview' },
    { id: 'export', num: 4, label: 'Ekspor', icon: FileDown, path: '/export' },
  ];
  
  const currentIdx = steps.findIndex(s => s.id === current);
  
  return html`
    <div class="stepper-container">
      ${steps.map((step, idx) => {
        const isActive = step.id === current;
        const isDone = idx < currentIdx;
        const isLocked = idx > 1 && !hasPaket; // Step 3 & 4 terkunci jika belum ada soal

        let stateClass = '';
        if (isActive) stateClass = 'active';
        else if (isDone) stateClass = 'done';
        else if (isLocked) stateClass = 'locked';
        else stateClass = 'available';

        const Icon = step.icon;

        return html`
          <a href=${isLocked ? '#' : `#${step.path}`} 
             class=${'stepper-item ' + stateClass} 
             onClick=${(e) => { if (isLocked) e.preventDefault(); }}>
            <div class="stepper-circle">
              ${isDone ? html`<${Check} size=${14} />` : isLocked ? html`<${Lock} size=${12} />` : step.num}
            </div>
            <span class="stepper-label">
              <${Icon} size=${14} class="stepper-icon" />
              ${step.label}
            </span>
          </a>
        `;
      })}
    </div>
  `;
}