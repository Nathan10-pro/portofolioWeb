/* ============================================================
   useProjectScroll — Scroll vertikal → track project kanan-ke-kiri.

   Konsep master plan §5 (2.5D Floating in Void) + spec Digital
   Terrain checkpoint 08: section tetap PINNED selama rangkaian
   project berlangsung; scroll mendorong dunia ke kiri dengan
   parallax per-depth (§5 "kedalaman setiap objek berbeda").

   Implementasi: GSAP ScrollTrigger (gratis, keputusan user #3).
   - Tidak ada React state per frame (§10): semua lewat gsap.set
     di dalam onUpdate pada elemen DOM langsung.
   - Mobile: track horizontal tetap, tetapi rotasi & parallax
     dikurangi (§5 mobile rule) via flag isMobile.
   - Cleanup: revert + kill saat scene di-unmount (swap lifecycle).
   ============================================================ */

import { useEffect } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface Params {
  rootRef: React.RefObject<HTMLDivElement | null>;
  trackRef: React.RefObject<HTMLDivElement | null>;
  itemRefs: React.RefObject<(HTMLElement | null)[]>;
  reducedMotion: boolean;
  /** HUD callback — sudah di-throttle (hanya dipanggil tiap ~5% progress). */
  onProgress?: (p: number, distancePx: number) => void;
}

export function useProjectScroll({ rootRef, trackRef, itemRefs, reducedMotion, onProgress }: Params) {
  useEffect(() => {
    const root = rootRef.current;
    const track = trackRef.current;
    if (!root || !track) return;

    const isMobile = window.matchMedia('(max-width: 767px)').matches;
    const rotScale = isMobile ? 0.4 : 1;      // §5: rotasi lebih rendah di mobile
    const parallaxScale = isMobile ? 0.5 : 1; // depth effect dikurangi

    // Bersihkan offset transform sisa (y art-directed diterapkan via CSS top)
    const items = (itemRefs.current ?? []).filter(Boolean) as HTMLElement[];
    for (const el of items) gsap.set(el, { y: 0 });

    const distance = () => Math.max(track.scrollWidth - window.innerWidth, 1);

    const baseRot = items.map((el) => parseFloat(el.dataset.rot ?? '0') * rotScale);
    const baseY = items.map((el) => parseFloat(el.dataset.baseY ?? '0'));

    let lastStep = -1;

    const st = ScrollTrigger.create({
      trigger: root,
      start: 'top top',
      end: () => '+=' + (distance() + (isMobile ? 300 : 800)),
      pin: true,
      scrub: reducedMotion ? 0 : 0.8,
      invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = self.progress;
        const d = distance();
        gsap.set(track, { x: -p * d });

        // Parallax per-depth: objek jauh bergerak lebih lambat dari track.
        for (let i = 0; i < items.length; i++) {
          const el = items[i];
          const depth = parseFloat(el.dataset.depth ?? '0'); // 0 depan .. 1 jauh
          const shift = p * d * depth * 0.28 * parallaxScale;
          const drift = Math.sin(p * Math.PI * 2 + i) * depth * 14 * parallaxScale;
          gsap.set(el, {
            x: shift + drift,
            y: baseY[i] + Math.cos(p * Math.PI * 2 + i * 1.7) * depth * 10 * parallaxScale,
            rotate: baseRot[i] * (1 + depth * 0.3),
          });
        }

        const step = Math.round(p * 20); // ~5% granularity untuk HUD
        if (step !== lastStep) { lastStep = step; onProgress?.(p, d); }
      },
    });

    return () => {
      st.kill(false, false);
      gsap.set(track, { clearProps: 'x' });
      for (const el of items) gsap.set(el, { clearProps: 'x,y,rotate' });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);
}
