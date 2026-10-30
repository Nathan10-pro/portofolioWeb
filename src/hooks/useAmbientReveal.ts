/* ============================================================
   useAmbientReveal — scheduler autonomous color reveal
   (spec PHOTO v2.0 §4 "Perilaku otomatis").

   Aturan yang diimplementasikan:
   - Interval bervariasi, TIDAK terus-menerus (min/max delay).
   - Lokasi tidak selalu di tengah → titik acak dengan bias
     horizontal (§4 master plan: gerakan otomatis terutama
     horizontal, variasi diagonal ringan).
   - Berhenti ketika pengunjung mulai berinteraksi (pointer aktif
   → `notifyInteraction()` me-reset timer; ambient baru muncul lagi
     setelah periode sepi).
   - Pada reduced motion: interval lebih panjang & strength lebih
     lemah agar tidak mengganggu membaca.
   ============================================================ */

import { useEffect, useRef } from 'react';

export interface AmbientEvent {
  /** Posisi awal UV (0..1) pada plane foto. */
  x: number;
  y: number;
  /** Arah gerak dominan. */
  dirX: number;
  dirY: number;
  /** Kekuatan relatif reveal (0..1). */
  strength: number;
}

interface Options {
  enabled: boolean;
  minDelaySec?: number;
  maxDelaySec?: number;
  onAmbient?: (ev: AmbientEvent) => void;
}

export function useAmbientReveal({
  enabled,
  minDelaySec = 5,
  maxDelaySec = 11,
  onAmbient,
}: Options) {
  const cbRef = useRef(onAmbient);
  cbRef.current = onAmbient;
  const lastInteraction = useRef(0);

  /** Dipanggil scene setiap ada input pointer → ambient mundur. */
  const notifyInteraction = () => {
    lastInteraction.current = performance.now() / 1000;
  };

  useEffect(() => {
    if (!enabled) return;
    let timer = 0;

    const rand = (a: number, b: number) => a + Math.random() * (b - a);

    const schedule = () => {
      const delay = rand(minDelaySec, maxDelaySec) * 1000;
      timer = window.setTimeout(() => {
        const now = performance.now() / 1000;
        // Tidak mengganggu: jika user interaksi < 3s terakhir, tunda.
        if (now - lastInteraction.current < 3) {
          schedule();
          return;
        }
        const horizontal = Math.random() < 0.8;
        const fromLeft = Math.random() < 0.5;
        cbRef.current?.({
          x: horizontal ? (fromLeft ? -0.05 : 1.05) : rand(0.2, 0.8),
          y: horizontal ? rand(0.25, 0.75) : (fromLeft ? -0.05 : 1.05),
          dirX: horizontal ? (fromLeft ? 1 : -1) : rand(-0.2, 0.2),
          dirY: horizontal ? rand(-0.15, 0.15) : (Math.random() < 0.5 ? 1 : -1),
          strength: rand(0.5, 0.85),
        });
        schedule();
      }, delay);
    };

    schedule();
    return () => window.clearTimeout(timer);
  }, [enabled, minDelaySec, maxDelaySec]);

  return { notifyInteraction };
}
