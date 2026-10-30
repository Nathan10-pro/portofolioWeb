/* ============================================================
   useLenis — Smooth scrolling (keputusan stack: Lenis).

   Prinsip §10: JANGAN memperbarui React state setiap frame scroll.
   Lenis dijalankan sebagai singleton imperatif; GSAP ScrollTrigger
   disinkronkan lewat onUpdate → ScrollTrigger.update().

   - Aktif hanya saat `enabled` (scene projects) → di luar itu
     native scroll (hemat, tidak mengganggu Photo/Collaborate).
   - prefers-reduced-motion → Lenis tidak dipasang sama sekali.
   - Cleanup penuh (destroy) saat unmount/disable.
   ============================================================ */

import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

let lenisInstance: Lenis | null = null;
export function getLenis() { return lenisInstance; }

export function useLenis(enabled: boolean, reducedMotion: boolean) {
  useEffect(() => {
    if (!enabled || reducedMotion) return;

    const lenis = new Lenis({
      duration: 1.15,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenisInstance = lenis;

    lenis.on('scroll', ScrollTrigger.update);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(raf);
      lenis.destroy();
      if (lenisInstance === lenis) lenisInstance = null;
      // Sinkronkan posisi native setelah Lenis lepas
      ScrollTrigger.update();
    };
  }, [enabled, reducedMotion]);
}
