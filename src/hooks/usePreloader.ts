/* ============================================================
   usePreloader — persentase REAL, bukan animasi palsu.
   Menghitung kesiapan aset yang DIBUTUHKAN untuk membuka PHOTO:
   - logo.png (monogram fallback / aset identitas alternatif)
   - selfpotraitBW.png  (base scene Photo)
   - selfpotraitCOLOR.png (layer reveal fluid)
   Image lain (project/side/eksperiment) TIDAK ditunggu — spec:
   "jangan menunggu seluruh gambar project selesai diunduh".
   Fallback: timeout → force ready; error jaringan → dianggap
   selesai dengan catatan (scene Photo punya placeholder CSS).
   ============================================================ */

import { useEffect, useMemo, useRef, useState } from 'react';
import { LOADING_CONFIG } from '../scenes/loading/loading.config';

export type PreloadStatus = 'loading' | 'ready' | 'error-fallback';

interface PreloadItem {
  src: string;
  ok: boolean;
}

export interface PreloaderState {
  progress: number;          // 0–100, berdasarkan item selesai
  status: PreloadStatus;
  items: PreloadItem[];      // utk debug/dev — tidak dirender sebagai UI
}

/** Foto profil dimuat dua-duanya karena shader reveal butuh BW+COLOR
    sejak frame pertama Photo Scene. */
const PHOTO_CRITICAL_ASSETS = [
  '/assets/logo/logo.png',
  '/assets/profile/selfpotraitBW.png',
  '/assets/profile/selfpotraitCOLOR.png',
];

export function usePreloader(enabled: boolean): PreloaderState {
  const total = PHOTO_CRITICAL_ASSETS.length;
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [failed, setFailed] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!enabled || startedRef.current) return;
    startedRef.current = true;

    const cleanups: Array<() => void> = [];

    PHOTO_CRITICAL_ASSETS.forEach((src) => {
      const img = new Image();
      const mark = () => setDone((d) => ({ ...d, [src]: true }));
      img.onload = mark;
      img.onerror = () => {
        // Resource gagal → jangan gantung; tandai selesai + flag fallback.
        setFailed(true);
        mark();
      };
      img.src = src;
      cleanups.push(() => {
        img.onload = null;
        img.onerror = null;
      });
    });

    // Anti infinite-loading.
    const t = window.setTimeout(() => {
      setDone((d) => {
        const all: Record<string, boolean> = {};
        for (const s of PHOTO_CRITICAL_ASSETS) all[s] = true;
        return { ...all, ...d };
      });
      setFailed(true);
    }, LOADING_CONFIG.loadTimeoutMs);
    cleanups.push(() => window.clearTimeout(t));

    return () => cleanups.forEach((c) => c());
  }, [enabled]);

  const completedCount = Object.keys(done).length;
  const progress = useMemo(
    () => Math.round((Math.min(completedCount, total) / total) * 100),
    [completedCount, total],
  );

  return {
    progress,
    status: progress >= 100 ? (failed ? 'error-fallback' : 'ready') : 'loading',
    items: PHOTO_CRITICAL_ASSETS.map((src) => ({ src, ok: !!done[src] })),
  };
}
