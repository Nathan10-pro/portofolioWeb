/* ============================================================
   PHOTO SCENE (Tahap 4 — FINAL, menggantikan stub Tahap 2)

   Struktur (§8): PhotoCanvas (WebGL fluid mask) + PhotoOverlay
   (tipografi sudut) + PhotoBioModal (klik foto).

   - Persistent overlay layer: state fluid TIDAK pernah di-reset
     oleh navigasi maupun modal (§13).
   - WebGL tidak tersedia → fallback DOM <img B&W>; teks bio selalu
     ada di DOM (§10 "konten penting tetap tersedia dalam DOM").
   - Modal terbuka → canvas paused (freeze, bukan reset).
   - Klik pada foto = satu-satunya pintu PhotoBioModal (§13).
     Keyboard: tombol .photo-hitarea (visually hidden) membuka modal.
   - Trigger keluar masih tombol dev sementara (trigger final
     didiskusikan per scene — keputusan user #9).
   ============================================================ */

import { useCallback, useRef, useState } from 'react';
import './PhotoScene.css';
import { profile } from '../../data/profile';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useWebGLSupport } from '../../hooks/useWebGLSupport';
import { useModal } from '../../ModalLayer';
import PhotoCanvas from './PhotoCanvas';
import PhotoOverlay from './PhotoOverlay';
import PhotoBioModal from './PhotoBioModal';

interface Props {
  active: boolean;
  goNext?: () => void;
}

export default function PhotoScene({ active, goNext }: Props) {
  const reduced = useReducedMotion();
  const webgl = useWebGLSupport();
  const modal = useModal();
  const [ready, setReady] = useState(false);
  const [bioOpen, setBioOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const openBio = useCallback(() => {
    if (modal.isOpen) return;
    setBioOpen(true);
    modal.open(
      <PhotoBioModal
        onClose={() => { modal.close(); setBioOpen(false); }}
        originEl={rootRef.current}
      />,
    );
  }, [modal]);

  return (
    <section className="scene scene--photo" data-scene="photo" aria-hidden={!active} ref={rootRef}>
      {webgl ? (
        <PhotoCanvas
          bwSrc={profile.assets.photoBW}
          colorSrc={profile.assets.photoColor}
          active={active}
          paused={bioOpen}
          reducedMotion={reduced}
          onReady={() => setReady(true)}
          onPhotoClick={openBio}
        />
      ) : (
        /* Fallback §10 — konten tetap terbaca tanpa WebGL */
        <div className="photo-fallback">
          <img src={profile.assets.photoBW} alt={`Potret ${profile.name}`} />
        </div>
      )}

      {/* Pintu keyboard/screen-reader ke modal — menutupi area foto,
          transparan secara visual (bukan elemen UI baru). */}
      <button
        className="photo-hitarea"
        onClick={openBio}
        aria-label={`Buka bio ${profile.name}`}
      />

      <PhotoOverlay ready={ready || !webgl} />

      {/* Konten bio selalu ada di DOM untuk reader/SEO (visually hidden) */}
      <div className="sr-only">
        <h1>{profile.name} — {profile.role}, {profile.major}</h1>
        <p>{profile.bio.summary}</p>
        <p>{profile.bio.biography}</p>
      </div>

      {active && goNext && (
        <button className="dev-trigger" onClick={goNext} aria-label="Lanjut ke project scene (stub)">
          → PROJECTS
        </button>
      )}
    </section>
  );
}
