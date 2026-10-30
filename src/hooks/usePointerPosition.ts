/* ============================================================
   usePointerPosition — membaca posisi pointer ter-normalisasi
   terhadap elemen target (spec PHOTO v2.0 §8).

   Dipakai oleh:
   - FluidReveal (WebGL): koordinat UV plane foto.
   - Fallback CSS mask: koordinat relatif container.

   Catatan performa: TIDAK men-set React state per move. Nilai
   ditulis ke ref yang dibaca render loop; callback opsional untuk
   consumer non-RAF. Arah dependensi: UI → Scene → System → Shader.
   ============================================================ */

import { useEffect, useRef } from 'react';

export interface PointerSample {
  /** 0..1 relatif lebar elemen. */
  x: number;
  /** 0..1 relatif tinggi elemen. */
  y: number;
  /** Kecepatan kasar px/detik (untuk karakter blob vs ribbon). */
  speed: number;
  inside: boolean;
}

export function usePointerPosition(
  targetRef: React.RefObject<HTMLElement | null>,
  onSample?: (s: PointerSample) => void,
  enabled = true,
) {
  const latest = useRef<PointerSample>({ x: 0.5, y: 0.5, speed: 0, inside: false });
  const cbRef = useRef(onSample);
  cbRef.current = onSample;

  useEffect(() => {
    const el = targetRef.current;
    if (!el || !enabled) return;

    let lastX = 0, lastY = 0, lastT = 0;

    const handle = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const now = performance.now();
      const dt = Math.max((now - lastT) / 1000, 1e-4);
      const speed = Math.hypot(e.clientX - lastX, e.clientY - lastY) / dt;
      lastX = e.clientX; lastY = e.clientY; lastT = now;

      const s: PointerSample = {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
        speed,
        inside: true,
      };
      latest.current = s;
      cbRef.current?.(s);
    };

    const leave = () => {
      latest.current = { ...latest.current, inside: false };
      cbRef.current?.(latest.current);
    };

    el.addEventListener('pointermove', handle, { passive: true });
    el.addEventListener('pointerdown', handle, { passive: true }); // mobile tap/drag (§6)
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', handle);
      el.removeEventListener('pointerdown', handle);
      el.removeEventListener('pointerleave', leave);
    };
  }, [targetRef, enabled]);

  return latest;
}
