/* ============================================================
   usePhotoFluid — Photo scene menjadi PERSISTENT WORLD LAYER.

   Digital Terrain ckpt 08 (transisi) + aturan §13:
   - Fluid HANYA hidup di Photo Scene → engine jalan hanya saat
     `enabled` true; begitu user masuk PROJECTS, simulasi berhenti
     total (bukan cuma tersembunyi).
   - State tidak pernah di-reset: engine TIDAK di-unmount oleh
     navigasi (persistent layer), hanya start/stop.
   - Pointer listener global (window) karena photo kini berada di
     bawah world overlay; konversi koordinat memakai __toPlaneUV
     milik FluidReveal (relatif plane foto, bukan window — spec
     fluid §11). Di luar area foto → feedLeave (return to mono).
   ============================================================ */

import { useEffect, useRef } from 'react';
import type { FluidEngine } from '../../fluid/core/FluidEngine';

type UVConverter = (cx: number, cy: number) => { u: number; v: number; inside: boolean };

interface Params {
  enabled: boolean;
  rootRef: React.RefObject<HTMLElement | null>;
  engineRef: React.MutableRefObject<FluidEngine | null>;
  feedPointer: (u: number, v: number, speedPx: number, inside: boolean, dx: number, dy: number) => void;
  feedLeave: () => void;
}

export function usePhotoFluid({ enabled, rootRef, engineRef, feedPointer, feedLeave }: Params) {
  const last = useRef({ x: 0, y: 0, t: 0 });

  useEffect(() => {
    if (!enabled) return;

    const getUV = (): UVConverter | undefined =>
      rootRef.current
        ?.querySelector<HTMLElement & { __toPlaneUV?: UVConverter }>('.fluid-reveal')
        ?.__toPlaneUV;

    const onMove = (e: PointerEvent) => {
      const toUV = getUV();
      if (!toUV || !engineRef.current) return;
      const now = performance.now();
      const dt = Math.max((now - last.current.t) / 1000, 1e-4);
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      const speedPx = Math.hypot(dx, dy) / dt;
      last.current = { x: e.clientX, y: e.clientY, t: now };
      const { u, v, inside } = toUV(e.clientX, e.clientY);
      feedPointer(u, v, speedPx, inside, dx, -dy);
    };

    // Listener di window: photo layer bisa menerima event saat aktif,
    // dan tetap aman saat overlay projects menutupi (pointer-events off).
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
      feedLeave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}
