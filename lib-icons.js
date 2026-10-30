import {
  Menu, X, Building2, Home, Inbox, Send, Users, Settings,
  SquareCheck, ChartColumn, Plus, PenLine, Trash2, Printer,
  MessageSquare, Download, Upload, Check, TriangleAlert, Save, RotateCcw
} from 'https://cdn.jsdelivr.net/npm/lucide@0.451.0/dist/esm/lucide.js';

const REGISTRY = {
  Menu, X, Building2, Home, Inbox, Send, Users, Settings,
  SquareCheck, ChartColumn, Plus, PenLine, Trash2, Printer,
  MessageSquare, Download, Upload, Check, TriangleAlert, Save, RotateCcw
};

/**
 * Hasilkan SVG Lucide secara konsisten.
 * @param {string} name - nama ikon Lucide (PascalCase)
 * @param {{size?:number, strokeWidth?:number, className?:string}} opts
 */
export function icon(name, opts = {}) {
  const { size = 18, strokeWidth = 2, className = '' } = opts;
  const node = REGISTRY[name];
  if (!node) {
    console.warn('[icon] ikon tidak dikenal:', name);
    return '';
  }
  const inner = node.map(([tag, attrs]) => {
    const a = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
    return `<${tag} ${a}/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" class="lucide ${className}" aria-hidden="true">${inner}</svg>`;
}
