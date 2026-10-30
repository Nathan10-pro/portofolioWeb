/* ============================================================
   LOADING SCREEN — Tahap 3 (Minimalist Cinematic Intro)
   Struktur spec v1.0: tiga area — top info, center monogram,
   bottom indicator. GSAP timeline per fase; exit = expanding
   mask reveal (clip-path circle dari tengah), foto PHOTO muncul
   perlahan dari hitam selama mask terbuka.

   Aturan yang dijaga:
   - Persentase REAL dari usePreloader (aset kritikal Photo saja).
   - Tidak ada loading tanpa batas (timeout fallback di preloader).
   - prefers-reduced-motion → durasi 0, konten langsung siap.
   - Loading screen HANYA tampil sekali (Experience Shell meng-
     unmount swap scene setelah pindah ke photo → tidak muncul
     lagi saat berpindah bagian).
   - Interaksi fluid Photo baru diaktifkan SETELAH transisi selesai
     (onDone dipanggil setelah mask reveal penuh).
   ============================================================ */

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

import Monogram from './Monogram';
import ProgressBar from './ProgressBar';
import { LOADING_CONFIG } from './loading.config';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { usePreloader } from '../../hooks/usePreloader';
import './LoadingScreen.css';

interface Props {
  /** Dipanggil SETELAH mask reveal selesai → Shell mengaktifkan Photo. */
  onDone: () => void;
}

export default function LoadingScreen({ onDone }: Props) {
  // Preloader dimount di sini agar Experience tidak ikut re-render
  // tiap perubahan progress (progress hanya mengalir ke ProgressBar).
  const preloader = usePreloader(true);
  const rootRef = useRef<HTMLDivElement>(null);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const firedRef = useRef(false);
  const reduced = useReducedMotion();

  /* ---- Phase 01–02: entrance sequence ---------------------- */
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const ctx = gsap.context(() => {
      const E = LOADING_CONFIG.entrance;
      const m = reduced ? 0 : 1; // reduced-motion → seluruh durasi jadi 0

      const tl = gsap.timeline({ defaults: { ease: 'power2.out', duration: 0.4 * m || 0 } });
      tlRef.current = tl;

      // 1. Background initialization (hitam murni sudah dari CSS; elemen lain 0)
      tl.set(
        ['[data-top-info]', '[data-monogram]', '[data-bottom-meta]', '[data-progress-block]'],
        { autoAlpha: 0 },
      );

      // 2. Monogram appearance: opacity + scale kecil + blur halus menghilang
      tl.fromTo(
        '[data-monogram]',
        { autoAlpha: 0, scale: E.logoScaleFrom, filter: `blur(${E.logoBlurFrom}px)` },
        {
          autoAlpha: 1,
          scale: 1,
          filter: 'blur(0px)',
          duration: E.logoDuration * m,
          delay: E.logoDelay * m,
          ease: 'power2.out',
        },
      );

      // 3. Subtitle muncul SETELAH logo settle
      tl.fromTo(
        '.loading__monogram-subtitle',
        { autoAlpha: 0, y: 6 },
        { autoAlpha: 1, y: 0, duration: E.subtitleDuration * m },
        E.subtitleDelay * m,
      );

      // 4. Informasi kecil (top & bottom meta) mulai terlihat
      tl.to(
        '[data-top-info], [data-bottom-meta]',
        { autoAlpha: 1, duration: E.metaDuration * m, stagger: E.staggerMeta * m },
        '>-=0.2',
      );

      // 5. Indikator bawah selalu ada selama inisialisasi
      tl.to('[data-progress-block]', { autoAlpha: 1, duration: 0.3 * m }, 0.2 * m);
    }, el);

    return () => ctx.revert();
  }, [reduced]);

  /* ---- Progress fill: transform-driven, bukan state/frame React ----- */
  useEffect(() => {
    const el = rootRef.current?.querySelector<HTMLElement>('[data-progress-fill]');
    if (!el) return;
    gsap.to(el, {
      scaleX: preloader.progress / 100,
      duration: reduced ? 0 : 0.5,
      ease: 'power2.out',
      overwrite: true,
    });
  }, [preloader.progress, reduced]);

  /* ---- Phase 03→04: exit + mask reveal --------------------- */
  useEffect(() => {
    if (preloader.status !== 'ready' && preloader.status !== 'error-fallback') return;
    if (firedRef.current) return;
    const el = rootRef.current;
    if (!el) return;
    firedRef.current = true;

    const X = LOADING_CONFIG.exit;
    const m = reduced ? 0 : 1;

    // Jangan perlambat artifisial: intro minimal hanya jika TIDAK reduced.
    const bootTs = (window as Window & { __npaBootTs?: number }).__npaBootTs;
    const elapsed = performance.now() - (bootTs ?? performance.now());
    const waitIntro = reduced ? 0 : Math.max(0, LOADING_CONFIG.minIntroMs - elapsed);

    const tl = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      onComplete: () => {
        // Mask penuh → loading dilepas, Photo menjadi aktif & interaktif.
        onDone();
      },
    });

    // a. Foto di belakang layer loading mulai dimunculkan dari hitam
    //    SEBELUMLayer loading sendiri dibuka — Shell memperlakukan
    //    flag ini pada photo layer (lihat Experience.tsx / registry).
    tl.call(() => {
      document.documentElement.setAttribute('data-loading-reveal', 'true');
    }, undefined, waitIntro / 1000);

    // b. Logo, subtitle, dan informasi memudar bersamaan (300–500ms)
    tl.to(
      '[data-monogram], [data-top-info], [data-bottom-meta], [data-progress-block]',
      { autoAlpha: 0, duration: X.fadeDuration * m },
      waitIntro / 1000,
    );

    // c. Expanding mask reveal: clip-path circle membuka dari tengah,
    //    foto PHOTO muncul perlahan mengikuti bukaan mask.
    tl.fromTo(
      el,
      { clipPath: 'circle(0% at 50% 50%)' },
      {
        clipPath: 'circle(150% at 50% 50%)',
        duration: X.maskDuration * m,
        ease: X.maskEase,
      },
      `>-=${X.fadeDuration * m * 0.5}`,
    );

    // d. Setelah reveal penuh, element di-unmount oleh Shell (swap).
    tl.call(() => {
      document.documentElement.removeAttribute('data-loading-reveal');
      gsap.set(el, { autoAlpha: 0 });
    });

    return () => {
      if (!tl.completed()) tl.kill();
    };
  }, [preloader.status, reduced, onDone]);

  return (
    <div className="loading-screen" ref={rootRef} data-scene="loading" role="status" aria-live="polite">
      {/* A. TOP — information */}
      <div className="loading__top">
        <span className="meta-label" data-top-info>PORTFOLIO / 2026</span>
        <span className="meta-label" data-top-info>INTRODUCTION</span>
      </div>

      {/* B. CENTER — monogram */}
      <div className="loading__center">
        <Monogram />
      </div>

      {/* C. BOTTOM — indikator inisialisasi */}
      <div className="loading__bottom">
        <div className="loading__bottom-meta" data-bottom-meta>
          <span className="meta-label">IDENTITY · NPA / 001</span>
          <span className="meta-label">STYLE · MINIMAL MONOCHROME</span>
          <span className="meta-label">TRANSITION · MASK REVEAL</span>
        </div>
        <ProgressBar progress={preloader.progress} />
      </div>
    </div>
  );
}
