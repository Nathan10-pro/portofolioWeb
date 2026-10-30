/* ============================================================
   useFluidReveal — orkestrasi perilaku reveal Photo (Spec Fluid v1.0).

   Menghubungkan:
   - FluidEngine (src/fluid/core) → simulasi GPU Stable Fluids 2D
   - useAmbientReveal             → scheduler autonomous reveal (§12)
   - Scene menyuplai pointer/touch via feedPointer/feedLeave.

   Ambient sekarang berjalan di MESIN YANG SAMA dengan pointer:
   controller menghasilkan urutan splat velocity/dye buatan dengan
   lifecycle Waiting → Activation → Expansion → Holding → Dissipation
   (§9), lewat engine.enqueue — bukan animasi terpisah.

   Prioritas input (§12): pointer aktif menghentikan INPUT ambient
   baru; dye yang sudah ada tetap disimulasikan sampai hilang alami.
   ============================================================ */

import { useEffect, useRef } from 'react';
import type { FluidEngine, FluidInputSample } from '../fluid/core/FluidEngine';
import { useAmbientReveal, type AmbientEvent } from './useAmbientReveal';

interface Options {
  active: boolean;
  reducedMotion: boolean;
}

/** Durasi lifecycle ambient (§9): activation→expansion→hold→dissipation ~2–4s. */
const AMBIENT_DURATION = 2.8;

export function useFluidReveal({ active, reducedMotion }: Options) {
  const engineRef = useRef<FluidEngine | null>(null);
  const pointerActiveUntil = useRef(0);
  const ambientRaf = useRef(0);

  /** Satu siklus ambient → serangkaian splat lemah & lambat ke engine. */
  const runAmbientCycle = (ev: AmbientEvent) => {
    const engine = engineRef.current;
    if (!engine || engine.pausedForInput?.() !== false) return;
    // Prioritas: pointer sedang aktif → ambient tidak merebut kendali.
    if (performance.now() < pointerActiveUntil.current) return;

    const start = performance.now();
    const speedScale = reducedMotion ? 0.4 : 0.7; // ambient lebih lambat dari pointer (§v2.0 §4)
    let px = ev.x;
    let py = ev.y;

    const step = () => {
      const e = engineRef.current;
      if (!e) return;
      const t = (performance.now() - start) / 1000;
      if (t > AMBIENT_DURATION || performance.now() < pointerActiveUntil.current) return; // dibatalkan oleh pointer

      // Kecepatan ambient: naik saat expansion, plateau saat hold, nol saat dissipation
      const env =
        t < 0.9 ? t / 0.9 :
        t < 1.8 ? 1 :
        Math.max(0, 1 - (t - 1.8) / (AMBIENT_DURATION - 1.8));
      const spd = 0.06 * speedScale * env; // uv/detik — pelan, organik
      px += ev.dirX * spd * (1 / 60);
      py += ev.dirY * spd * (1 / 60);

      const sample: FluidInputSample = {
        u: Math.min(1.05, Math.max(-0.05, px)),
        v: Math.min(1.05, Math.max(-0.05, py)),
        du: ev.dirX * spd,
        dv: ev.dirY * spd,
        intensity: ev.strength * env * (reducedMotion ? 0.5 : 1),
        kind: 'ambient',
      };
      e.enqueue(sample);
      if (t < AMBIENT_DURATION) ambientRaf.current = requestAnimationFrame(step);
    };
    ambientRaf.current = requestAnimationFrame(step);
  };

  const ambient = useAmbientReveal({
    enabled: active,
    minDelaySec: reducedMotion ? 10 : 5,
    maxDelaySec: reducedMotion ? 18 : 11,
    onAmbient: runAmbientCycle,
  });

  /** Suplai sample pointer dari scene (UV plane + delta gerak layar px). */
  const feedPointer = (u: number, v: number, speedPx: number, inside: boolean, dx = 0, dy = 0) => {
    const e = engineRef.current;
    if (!e) return;
    // konversi px → uv/detik relatif ukuran plane foto di layar (perkiraan: 42vw × proporsional)
    const planeWpx = Math.max(window.innerWidth * 0.42, 1);
    const planeHpx = Math.max(planeWpx / e.planeAspectValue(), 1);
    const du = (dx / planeWpx) * 60; // aproksimasi per-frame → uv/s
    const dv = (dy / planeHpx) * 60;
    const duv = speedPx / Math.max(planeWpx, 1);
    e.enqueue({
      u, v,
      du, dv,
      intensity: inside ? Math.min(1, 0.35 + duv * 1.2) : 0.15,
      kind: 'pointer',
    });
    if (inside) {
      pointerActiveUntil.current = performance.now() + 1200; // §12: matikan input ambient baru
      ambient.notifyInteraction();
    }
  };

  /** Pointer keluar area foto → biarkan dissipation engine bekerja (STATE 05). */
  const feedLeave = () => {
    // Tidak ada injeksi lagi; dye meluruh sendiri lewat dyeDissipation.
    pointerActiveUntil.current = performance.now() + 400;
  };

  useEffect(() => () => cancelAnimationFrame(ambientRaf.current), []);

  return { engineRef, feedPointer, feedLeave };
}
