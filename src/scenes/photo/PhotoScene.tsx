/* ============================================================
   PHOTO SCENE — STUB (Tahap 2: Experience Shell)
   Persistent overlay layer (§ kontrak): tetap mounted saat aktif
   maupun tidak → state fluid & foto TIDAK di-reset.
   Tahap 4–5 mengisi PhotoCanvas (fluid), PhotoOverlay (metadata
   sudut), dan PhotoBioModal.
   Trigger keluar sementara: tombol dev kecil (nanti diganti
   trigger final yang kita diskusikan per scene).
   ============================================================ */

import { profile } from '../../data/profile';

interface Props {
  active: boolean;
  goNext?: () => void;
}

export default function PhotoScene({ active, goNext }: Props) {
  return (
    <section className="scene scene--photo" data-scene="photo" aria-hidden={!active}>
      <div className="scene__placeholder">
        <span className="meta-label">PHOTO · B&W PORTRAIT + FLUID [STUB]</span>
      </div>

      {/* Metadata empat sudut sesuai §4 — sudah memakai data asli */}
      {profile.cornerMeta.map((m) => (
        <span key={m.corner} className={`corner corner--${m.corner} meta-label`}>
          {m.label}
        </span>
      ))}

      {active && goNext && (
        <button className="dev-trigger" onClick={goNext} aria-label="Lanjut ke project scene (stub)">
          → PROJECTS
        </button>
      )}
    </section>
  );
}
