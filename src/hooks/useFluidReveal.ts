/* ============================================================
   useFluidReveal — orkestrasi perilaku reveal Photo (spec §8).

   Menghubungkan:
   - FluidField (systems/fluid)  → state simulasi mask
   - usePointerPosition          → input pointer/touch
   - useAmbientReveal            → autonomous reveal scheduler

   Scene memanggil hook ini, lalu memberi `feed*` ke event listener
   DOM dan `fieldRef` ke <FluidReveal/> untuk dirender shader.
   ============================================================ */

import { useEffect, useMemo, useRef } from 'react';
import { FluidField } from '../systems/fluid/field';
import { useAmbientReveal, type AmbientEvent } from './useAmbientReveal';

interface Options {
  active: boolean;
  reducedMotion: boolean;
}

export function useFluidReveal({ active, reducedMotion }: Options) {
  const fieldRef = useRef<FluidField | null>(null);
  if (!fieldRef.current) fieldRef.current = new FluidField();

  // Stabilisasi konfigurasi per sesi (bukan per frame — §10).
  useEffect(() => {
    fieldRef.current?.setConfig(
      reducedMotion
        ? { autoMinDelay: 9, autoMaxDelay: 16, baseRadius: 0.14 }
        : {},
    );
  }, [reducedMotion]);

  const ambient = useAmbientReveal({
    enabled: active, // ambient tetap ada saat reduced, tapi lebih jarang & lebih lemah
    minDelaySec: reducedMotion ? 10 : 5,
    maxDelaySec: reducedMotion ? 18 : 11,
    onAmbient: (ev: AmbientEvent) => {
      const f = fieldRef.current;
      if (!f) return;
      f.feedAmbient(ev.x, ev.y, ev.dirX, ev.dirY, ev.strength * (reducedMotion ? 0.5 : 1));
    },
  });

  /** Suplai sample pointer ter-normalisasi dari scene. */
  const feedPointer = (u: number, v: number, speedPx: number, inside: boolean) => {
    fieldRef.current?.feedPointer(u, v, speedPx, inside, performance.now() / 1000);
    if (inside) ambient.notifyInteraction();
  };

  const feedLeave = () => {
    fieldRef.current?.feedPointer(0.5, 0.5, 0, false, performance.now() / 1000);
  };

  // Fluid mati total di luar Photo Scene (§10 master plan).
  useEffect(() => {
    if (!active) fieldRef.current?.suspend();
  }, [active]);

  return useMemo(
    () => ({ fieldRef, feedPointer, feedLeave }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reducedMotion],
  );
}
