// Referensi bawaan E-KSP = 11 format dokumen KSP Kemdikdasmen yang sudah
// diubah menjadi template bersih. Metadata di sini menjelaskan token dan
// koreksi umum; tidak menyimpan identitas sekolah tertentu.

import { KSP_TEMPLATES, KSP_TEMPLATE_GROUPS } from './ksp-templates.js';

const REFERENCES = [
  ['Dokumen KSP (BAB I–VI + Lampiran)', 'ksp', 'Format induk KSP'],
  ['SK Tim Pengembang KSP', 'sk-pengembang', 'Format SK tim pengembang'],
  ['Instrumen Verval & Telaah ATP/Modul', 'verval-ksp', 'Format lembar verifikasi'],
  ['Umpan Balik RPP & Observasi Pembelajaran', 'modul-ajar', 'Format observasi pembelajaran'],
  ['Surat Penetapan KSP', 'penetapan', 'Format surat penetapan'],
  ['Surat Pernyataan Pengembangan KSP', 'pernyataan', 'Format surat pernyataan'],
  ['Berita Acara Verval KSP', 'berita_acara', 'Format berita acara'],
  ['Rekapitulasi Verval ATP dan Modul Ajar', 'rekap-verval', 'Format rekapitulasi'],
  ['Rekomendasi Pengawas', 'rekomendasi', 'Format rekomendasi pengawas'],
  ['SK Pembagian Tugas Guru', 'sk-pbm', 'Format SK pembagian tugas'],
  ['SK Tim Kerja Kokurikuler', 'sk-kokurikuler', 'Format SK tim kokurikuler'],
];

const groupLabel = id => {
  const key = KSP_TEMPLATES[id]?.group;
  return KSP_TEMPLATE_GROUPS.find(([g]) => g === key)?.[1] || '-';
};

export const KSP_BUILTIN_REFERENCES = REFERENCES.map(([title, templateId, source]) => {
  const t = KSP_TEMPLATES[templateId];
  return {
    title,
    templateId,
    kind: t.kind,
    group: t.group,
    groupLabel: groupLabel(templateId),
    year: '',
    source,
    notes: t.summary,
    tokens: [...t.tokens],
    corrections: t.corrections.map(c => ({ ...c })),
  };
});
