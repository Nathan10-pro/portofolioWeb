/* ============================================================
   SCENE REGISTRY — daftar kanonik urutan LOADING → PHOTO →
   PROJECT → COLLABORATE beserta strategi transisinya.
   Experience Shell membaca file ini; tidak ada scene yang
   hardcode di Shell.
   ============================================================ */

import type { SceneId } from '../../types';
import type { SceneRegistryEntry } from './contracts';

import LoadingScene from '../../scenes/loading/LoadingScene';
import PhotoScene from '../../scenes/photo/PhotoScene';
import ProjectScene from '../../scenes/project/ProjectScene';
import CollaborateScene from '../../scenes/collaborate/CollaborateScene';

/** Urutan canonical perjalanan visual (kontrak saja; komponen dipetakan
   oleh Experience Shell agar registry tetap .ts-friendly). */
export const SCENE_REGISTRY: SceneRegistryEntry[] = [
  {
    id: 'loading',
    label: '01 · LOADING',
    persistent: false,        // swap: sekali lewat lalu unmount
    transition: 'gsap',       // fade-out logo handled oleh scene sendiri
  },
  {
    id: 'photo',
    label: '02 · PHOTO',
    persistent: true,         // overlay stack — fluid state dipertahankan
    transition: 'css',
  },
  {
    id: 'projects',
    label: '03 · PROJECTS',
    persistent: false,        // swap: section panjang di-unmount saat keluar
    transition: 'gsap',
  },
  {
    id: 'collaborate',
    label: '04 · COLLABORATE',
    persistent: true,         // overlay stack — karakter tetap hidup (§6)
    transition: 'css',
  },
];

export function findScene(id: SceneId): SceneRegistryEntry {
  const s = SCENE_REGISTRY.find((r) => r.id === id);
  if (!s) throw new Error(`Scene "${id}" tidak terdaftar di registry.`);
  return s;
}

export { LoadingScene, PhotoScene, ProjectScene, CollaborateScene };
