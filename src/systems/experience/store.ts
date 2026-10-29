/* ============================================================
   EXPERIENCE SYSTEM (§8) — state scene utama.
   loading | photo | projects | collaborate

   Prinsip:
   - Scene TIDAK di-reset oleh modal (modal = layer UI terpisah,
     state modal hidup di komponen masing-masing scene).
   - Transisi antar-scene nanti dikendalikan GSAP dari Experience
     Shell; sistem ini hanya menyimpan "scene mana yang aktif".
   - Fluid harus tahu kapan Photo Scene aktif → subscribe().
   ============================================================ */

import { useCallback, useEffect, useState } from 'react';
import type { SceneId } from '../../types';

const SCENE_ORDER: SceneId[] = ['loading', 'photo', 'projects', 'collaborate'];

type Listener = (scene: SceneId) => void;

/** Store kecil tanpa dependency eksternal (Zustand tidak diperlukan di sini). */
export function createExperienceStore(initial: SceneId = 'loading') {
  let current: SceneId = initial;
  const listeners = new Set<Listener>();

  return {
    get(): SceneId {
      return current;
    },
    set(next: SceneId): void {
      if (next === current) return;
      current = next;
      listeners.forEach((l) => l(next));
    },
    subscribe(l: Listener): () => void {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    /** Urutan canonical untuk trigger scroll/klik (§9 diskusi user #9). */
    order: SCENE_ORDER,
  };
}

export type ExperienceStore = ReturnType<typeof createExperienceStore>;

/** Hook React: sinkronkan komponen dengan store. */
export function useExperienceScene(store: ExperienceStore): [SceneId, (s: SceneId) => void] {
  const [scene, setScene] = useState<SceneId>(store.get());

  useEffect(() => store.subscribe(setScene), [store]);

  const go = useCallback((s: SceneId) => store.set(s), [store]);
  return [scene, go];
}
