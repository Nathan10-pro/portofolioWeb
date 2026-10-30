/* ============================================================
   PHOTO OVERLAY — tipografi identitas & hint di atas canvas.
   §2: typography TIDAK boleh mengalahkan foto → kecil, tracking
   lebar, warna secondary. pointer-events none kecuali tombol.
   ============================================================ */

import { profile } from '../../data/profile';

interface Props {
  /** Foto siap (tekstur loaded) → metadata boleh muncul. */
  ready: boolean;
}

export default function PhotoOverlay({ ready }: Props) {
  return (
    <div className={`photo-overlay${ready ? ' is-ready' : ''}`} aria-hidden="true">
      {/* Nomor section — kiri-tengah vertikal, halus */}
      <span className="photo-index meta-label">01 — PHOTO</span>

      {/* Empat sudut memakai data profil asli (§4 master plan) */}
      {profile.cornerMeta.map((m) => (
        <span key={m.corner} className={`corner corner--${m.corner} meta-label`}>
          {m.label}
        </span>
      ))}

      {/* Hint navigasi bawah — tanpa navbar (§13). Trigger final
          Photo→Projects masih didiskusikan; ini hanya petunjuk visual. */}
      <span className="photo-hint meta-label">SCROLL TO EXPLORE</span>
    </div>
  );
}
