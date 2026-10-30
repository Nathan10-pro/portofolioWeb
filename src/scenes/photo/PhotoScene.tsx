/* ============================================================
   PHOTO SCENE — Monochrome to Color (spec v2.0, FINAL).

   Struktur (§7/§8): PhotoImage (FluidReveal WebGL / CSS fallback)
   + PhotoInfo (tipografi identitas & hint) + PhotoBioModal.

   Perilaku terkunci:
   - State 01 Idle → 05 Return ditangani FluidField + shader mask.
   - Persistent overlay layer: state fluid TIDAK pernah di-reset
     oleh navigasi maupun modal (§13). Modal → paused (freeze).
   - Pointer & ambient disuplai lewat hooks (useFluidReveal),
     konversi koordinat memakai __toPlaneUV milik FluidReveal.
   - Klik pada foto = satu-satunya pintu PhotoBioModal (§13).
     Keyboard: .photo-hitarea membuka modal via Tab+Enter.
   - Konten bio selalu tersedia di DOM (§10).
   ============================================================ */

import { useCallback, useEffect, useRef, useState } from 'react';
import './PhotoScene.css';
import './effects/FluidReveal.css';
import { profile } from '../../data/profile';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useWebGLSupport } from '../../hooks/useWebGLSupport';
import { useFluidReveal } from '../../hooks/useFluidReveal';
import { useModal } from '../../ModalLayer';
import PhotoImage from './PhotoImage';
import PhotoInfo from './PhotoInfo';
import PhotoBioModal from './PhotoBioModal';

interface Props {
  active: boolean;
  goNext?: () => void;
}

type UVConverter = (cx: number, cy: number) => { u: number; v: number; inside: boolean };

export default function PhotoScene({ active, goNext }: Props) {
  const reduced = useReducedMotion();
  const webgl = useWebGLSupport();
  const modal = useModal();
  const [ready, setReady] = useState(false);
  const [bioOpen, setBioOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const lastPointer = useRef({ x: 0, y: 0, t: 0 });
  const { fieldRef, feedPointer, feedLeave } = useFluidReveal({ active, reducedMotion: reduced });

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

  // ---- Input pointer/touch → field (mode eksternal) ----------------------
  useEffect(() => {
    if (!webgl || !active) return;
    const mount = rootRef.current?.querySelector<HTMLElement & { __toPlaneUV?: UVConverter }>(
      '.fluid-reveal',
    );
    const toUV = mount?.__toPlaneUV;
    if (!mount || !toUV) return;

    const onMove = (e: PointerEvent) => {
      if (bioOpen) return;
      const now = performance.now();
      const dt = Math.max((now - lastPointer.current.t) / 1000, 1e-4);
      const speedPx = Math.hypot(e.clientX - lastPointer.current.x, e.clientY - lastPointer.current.y) / dt;
      lastPointer.current = { x: e.clientX, y: e.clientY, t: now };
      const { u, v, inside } = toUV(e.clientX, e.clientY);
      feedPointer(u, v, speedPx, inside);
    };
    const onLeave = () => feedLeave();

    mount.addEventListener('pointermove', onMove, { passive: true });
    mount.addEventListener('pointerdown', onMove, { passive: true }); // mobile tap/drag
    mount.addEventListener('pointerleave', onLeave);
    return () => {
      mount.removeEventListener('pointermove', onMove);
      mount.removeEventListener('pointerdown', onMove);
      mount.removeEventListener('pointerleave', onLeave);
    };
  }, [webgl, active, bioOpen, feedPointer, feedLeave]);

  return (
    <section className="scene scene--photo" data-scene="photo" aria-hidden={!active} ref={rootRef}>
      <PhotoImage
        bwSrc={profile.assets.photoBW}
        colorSrc={profile.assets.photoColor}
        webgl={webgl}
        active={active}
        paused={bioOpen}
        reducedMotion={reduced}
        onReady={() => setReady(true)}
        onPhotoClick={openBio}
        fieldRef={fieldRef}
      />

      {/* Pintu keyboard/screen-reader ke modal — transparan secara visual,
          pointer tembus sehingga fluid tetap menerima input. */}
      <button
        className="photo-hitarea"
        onClick={openBio}
        aria-label={`Buka bio ${profile.name}`}
      />

      <PhotoInfo ready={ready || !webgl} />

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
