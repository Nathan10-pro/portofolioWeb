/* ============================================================
   PHOTO INFO — tipografi identitas & hint di atas canvas.
   Spec PHOTO v2.0 §6: identitas + tagline diletakkan DI BAWAH
   foto (bukan di atas wajah); urutan mata: foto → interaksi →
   identitas → petunjuk lanjut.
   §2: typography TIDAK boleh mengalahkan foto → kecil, tracking
   lebar, warna secondary. pointer-events none.
   ============================================================ */

import { profile } from '../../data/profile';

interface Props {
  /** Foto siap (tekstur loaded) → metadata boleh muncul. */
  ready: boolean;
}

export default function PhotoInfo({ ready }: Props) {
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

      {/* Identitas & tagline — blok terpusat di bawah foto (§3:
          informasi tidak boleh tertutup foto; §6 contoh konten). */}
      <div className="photo-identity">
        <p className="photo-name">
          {profile.name}
          <span className="photo-name-dot">.</span>
        </p>
        <p className="photo-role meta-label">{profile.role}</p>
        {profile.tagline && <p className="photo-tagline">{profile.tagline}</p>}
        {profile.taglineSub && <p className="photo-tagline-sub">{profile.taglineSub}</p>}
      </div>

      {/* Hint navigasi bawah — tanpa navbar (§13). Trigger final
          Photo→Projects masih didiskusikan; ini hanya petunjuk visual. */}
      <span className="photo-hint meta-label">
        SCROLL TO EXPLORE <span className="photo-hint-arrow">↓</span>
      </span>
    </div>
  );
}
