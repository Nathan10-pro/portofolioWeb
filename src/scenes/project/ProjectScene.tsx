/* ============================================================
   PROJECT SCENE — "The Digital Terrain" (spec §1–§11).

   Arsitektur keputusan: dunia = WORLD LAYER yang TEMBUS PANDANG.
   Photo scene (persistent overlay di bawah) dibiarkan terlihat
   sebagian melalui background semi-transparan + vignette, sehingga
   PHOTO → PROJECT terasa seperti satu dunia berkesinambungan
   (spec §8 transisi), BUKAN halaman terpisah. Fluid otomatis berhenti
   karena PhotoScene menerima active=false saat scene projects aktif.

   Checkpoint terpenuhi: 01 canvas dunia (CSS/SVG), 02 terrain,
   03 environment details, 04 landmarks, 06 interaction (hover via
   CSS + HUD imperatif; klik → modal), 07 modal, 08 UI & transition.
   Camera hybrid (ckpt 05) disederhanakan sesuai master plan §5:
   scroll-driven traversal + parallax depth = "dynamic perspective"
   versi DOM — tanpa kontrol kamera bebas agar pengunjung tidak
   tersesat (risiko §9 spec).

   Lifecycle: swap scene (mount/unmount) — ScrollTrigger & Lenis
   dibersihkan saat keluar; kembali ke ENTRY setiap masuk (konsisten
   dengan guided intro).
   ============================================================ */

import { useCallback, useEffect, useRef } from 'react';
import gsap from 'gsap';
import './ProjectScene.css';
import { projects } from '../../data/projects';
import { zoneAt } from '../../data/worldZones';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { useLenis } from '../../systems/scroll/useLenis';
import { useProjectScroll } from '../../systems/scroll/useProjectScroll';
import { useModal } from '../../ModalLayer';
import ProjectObject, { landmarkId } from './ProjectObject';
import ProjectModal from './ProjectModal';
import TerrainBackdrop from './TerrainBackdrop';
import WorldHUD from './ui/WorldHUD';

interface Props {
  active: boolean;
  goNext?: () => void;
  goBack?: () => void;
}

export default function ProjectScene({ active, goNext, goBack }: Props) {
  const reduced = useReducedMotion();
  const modal = useModal();

  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const hudRef = useRef<HTMLDivElement>(null);

  // Lenis hanya selama dunia project aktif (smooth traversal)
  useLenis(active, reduced);

  // Parallax terrain + progress track → HUD (imperatif, tanpa state/frame)
  const handleProgress = useCallback((p: number, distancePx: number) => {
    const z = zoneAt(p);
    const zoneEl = hudRef.current?.querySelector('.hud-zone');
    if (zoneEl) zoneEl.textContent = `ZONE ${String(z.index).padStart(2, '0')} — ${z.name}`;
    const root = rootRef.current;
    if (root) {
      const x = -p * distancePx;
      root.style.setProperty('--px-bg', String(x * 0.06));
      root.style.setProperty('--px-mid', String(x * 0.14));
      root.style.setProperty('--px-fg', String(x * 0.26));
    }
  }, []);

  useProjectScroll({ rootRef, trackRef, itemRefs, reducedMotion: reduced, onProgress: handleProgress });

  // Hover → label fokus HUD + parallax pointer (event delegation, murah)
  useEffect(() => {
    const track = trackRef.current;
    const root = rootRef.current;
    const focusEl = hudRef.current?.querySelector('.hud-focus');
    if (!track || !focusEl || !root) return;
    const over = (e: Event) => {
      const obj = (e.target as HTMLElement).closest<HTMLElement>('.project-object');
      if (!obj) return;
      const id = obj.dataset.id ?? '';
      const idx = projects.findIndex((p) => p.id === id);
      if (idx >= 0) focusEl.textContent = `${landmarkId(idx)} / ${projects[idx].title.toUpperCase()}`;
    };
    const out = (e: Event) => {
      const obj = (e.target as HTMLElement).closest<HTMLElement>('.project-object');
      if (!obj) return;
      const to = e instanceof MouseEvent ? (e.relatedTarget as HTMLElement | null) : null;
      if (!to || !to.closest('.project-object')) focusEl.textContent = 'HOVER OR SELECT A LANDMARK';
    };
    const move = (e: PointerEvent) => {
      if (reduced) return;
      root.style.setProperty('--mx', String(e.clientX / window.innerWidth - 0.5));
      root.style.setProperty('--my', String(e.clientY / window.innerHeight - 0.5));
    };
    track.addEventListener('pointerover', over);
    track.addEventListener('pointerout', out);
    root.addEventListener('pointermove', move, { passive: true });
    return () => {
      track.removeEventListener('pointerover', over);
      track.removeEventListener('pointerout', out);
      root.removeEventListener('pointermove', move);
    };
  }, [active, reduced]);

  // Entrance landmark bertahap saat dunia pertama muncul (guided reveal)
  useEffect(() => {
    if (!active) return;
    const els = itemRefs.current.filter(Boolean) as HTMLElement[];
    if (!els.length) return;
    const tl = gsap.fromTo(
      els,
      { autoAlpha: 0, y: 40 },
      {
        autoAlpha: 1, y: 0,
        duration: reduced ? 0 : 0.8,
        stagger: reduced ? 0 : 0.12,
        ease: 'power3.out',
        delay: reduced ? 0 : 0.2,
        clearProps: 'opacity,visibility',
      },
    );
    return () => { tl.kill(); };
  }, [active, reduced]);

  const openProject = useCallback(
    (id: string) => {
      if (modal.isOpen) return;
      const idx = projects.findIndex((p) => p.id === id);
      if (idx < 0) return;
      modal.open(
        <ProjectModal project={projects[idx]} index={idx} onClose={() => modal.close()} />,
      );
    },
    [modal],
  );

  return (
    <section className="scene scene--projects" data-scene="projects" aria-hidden={!active} ref={rootRef}>
      {/* jendela dunia: photo layer di bawah tetap tembus pandang */}
      <div className="world-window" aria-hidden="true" />

      <TerrainBackdrop />

      <div className="project-track" ref={trackRef}>
        {projects.map((p, i) => (
          <ProjectObject
            key={p.id}
            project={p}
            index={i}
            reducedMotion={reduced}
            onSelect={openProject}
            setRef={(el) => { itemRefs.current[i] = el; }}
          />
        ))}
      </div>

      <WorldHUD ref={hudRef} onContinue={() => goNext?.()} />

      {/* jalur keyboard untuk kembali — kecil, bukan navbar */}
      {goBack && (
        <button className="hud-back meta-label" onClick={goBack}>← RETURN TO PORTRAIT</button>
      )}
    </section>
  );
}
