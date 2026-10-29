/* ============================================================
   PROJECTS DATA — DUMMY (jawaban user #6: "bebas karangan")
   ⚠ Semua project di bawah adalah fiksi untuk development.
   Layout art-directed & konstan (§5): posisi/depth/rotasi
   ditentukan manual, bukan random saat load.
   ============================================================ */

import type { ProjectData } from '../types';

export const projects: ProjectData[] = [
  {
    id: 'project1',
    title: 'NEURAL CANVAS',
    category: 'MAIN',
    year: '2026',
    stack: ['React', 'TypeScript', 'WebGL'],
    shortDescription: '[DUMMY] Interactive generative-art playground powered by an on-device model.',
    longDescription:
      '[DUMMY TEXT] Deskripsi panjang project MAIN akan diganti dengan konten asli. ' +
      'Detail lengkap hanya tampil melalui Project Modal (§5).',
    links: [{ label: 'CASE STUDY', url: '#' }],
    media: [{ type: 'image', src: '/assets/projects/MAIN/project1/thumb.png', caption: '[DUMMY MEDIA]' }],
    thumbnail: '/assets/projects/MAIN/project1/thumb.png',
    layout: { x: 0,    y: -40, depth: 0.0, rotation: -2.0, scale: 1.0 },
  },
  {
    id: 'project2',
    title: 'QUIET PROTOCOL',
    category: 'SIDE',
    year: '2025',
    stack: ['Node.js', 'SQLite'],
    shortDescription: '[DUMMY] Minimal sync tool for notes that refuse to become another app.',
    longDescription: '[DUMMY TEXT] Side project — treatment visual lebih tenang (§5).',
    links: [{ label: 'REPOSITORY', url: '#' }],
    media: [{ type: 'image', src: '/assets/projects/SIDE/project2/thumb.png', caption: '[DUMMY MEDIA]' }],
    thumbnail: '/assets/projects/SIDE/project2/thumb.png',
    layout: { x: 560,  y: 60,  depth: 0.5, rotation: 1.5,  scale: 0.78 },
  },
  {
    id: 'project3',
    title: 'FIELD NOTES 04',
    category: 'EXPERIMENT',
    year: '2025',
    stack: ['GLSL', 'Three.js'],
    shortDescription: '[DUMMY] Shader study: fluid density as a typographic mask.',
    longDescription: '[DUMMY TEXT] Eksperimen — penempatan/treatment lebih eksperimental (§5).',
    links: [],
    media: [{ type: 'image', src: '/assets/projects/EXPERIMENT/project3/thumb.png', caption: '[DUMMY MEDIA]' }],
    thumbnail: '/assets/projects/EXPERIMENT/project3/thumb.png',
    layout: { x: 1040, y: -120, depth: 0.8, rotation: 3.5,  scale: 0.6 },
  },
  {
    id: 'project4',
    title: 'LATTICE',
    category: 'MAIN',
    year: '2024',
    stack: ['Python', 'PyTorch'],
    shortDescription: '[DUMMY] Small language-model toolkit for structured extraction.',
    longDescription: '[DUMMY TEXT] AI engineering side of the portfolio.',
    links: [{ label: 'PAPER', url: '#' }, { label: 'CODE', url: '#' }],
    media: [{ type: 'image', src: '/assets/projects/MAIN/project1/thumb.png', caption: '[DUMMY MEDIA]' }],
    thumbnail: '/assets/projects/MAIN/project1/thumb.png',
    layout: { x: 1560, y: 30,  depth: 0.1, rotation: -3.0, scale: 0.95 },
  },
  {
    id: 'project5',
    title: 'HALFTONE MAIL',
    category: 'EXPERIMENT',
    year: '2024',
    stack: ['GSAP', 'Canvas'],
    shortDescription: '[DUMMY] Email receipts rendered as newspaper halftone prints.',
    longDescription: '[DUMMY TEXT] Web-only experiment, never productionized.',
    links: [],
    media: [{ type: 'image', src: '/assets/projects/EXPERIMENT/project3/thumb.png', caption: '[DUMMY MEDIA]' }],
    thumbnail: '/assets/projects/EXPERIMENT/project3/thumb.png',
    layout: { x: 2120, y: -60, depth: 0.65, rotation: 2.5, scale: 0.55 },
  },
];

/** Rentang scroll virtual untuk track project (dipakai systems/scroll nanti). */
export const PROJECT_TRACK_WIDTH = 2600;
