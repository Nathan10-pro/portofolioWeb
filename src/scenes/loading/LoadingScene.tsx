/* ============================================================
   LOADING SCENE — STUB (Tahap 2: Experience Shell)
   Tahap 3 nanti mengisi: logo enter → gerakan halus → exit.
   Shell menunggu promise onDone sebelum pindah ke Photo Scene.
   ============================================================ */

import { useEffect } from 'react';

interface Props {
  active: boolean;
  /** Dipanggil scene ketika transisi exit-nya selesai (Shell → photo). */
  onDone?: () => void;
}

export default function LoadingScene({ active, onDone }: Props) {
  useEffect(() => {
    if (!active || !onDone) return;
    // STUB: auto-advance cepat agar navigasi Shell bisa diuji.
    const t = window.setTimeout(onDone, 900);
    return () => window.clearTimeout(t);
  }, [active, onDone]);

  return (
    <section className="scene scene--loading" data-scene="loading" aria-hidden={!active}>
      <div className="scene__placeholder">
        {/* Placeholder posisi logo final public/assets/logo.png */}
        <span className="meta-label">LOADING · LOGO HERE [STUB]</span>
      </div>
    </section>
  );
}
