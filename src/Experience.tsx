/* ============================================================
   EXPERIENCE SHELL (Tahap 2) — orkestrator state machine scene.

   - Store scene: loading | photo | projects | collaborate.
   - Persistent scenes (photo, collaborate) SELALU mounted sebagai
     layer; kelayakan tampil diatur lewat data-active → CSS
     opacity/visibility/pointer-events. State internal mereka tidak
     pernah di-reset oleh navigasi (§13).
   - Swap scenes (loading, projects) hanya mounted saat aktif.
   - Transisi pakai GSAP (fade cross-dissolve, hormati
     prefers-reduced-motion → durasi 0).
   - Tidak ada progress indicator / navbar (keputusan user #4).
   ============================================================ */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ComponentType } from 'react';
import gsap from 'gsap';

import type { SceneId } from './types';
import { useReducedMotion } from './hooks/useReducedMotion';
import { createExperienceStore, useExperienceScene } from './systems/experience/store';
import { SCENE_REGISTRY } from './systems/experience/registry';

import LoadingScene from './scenes/loading/LoadingScene';
import PhotoScene from './scenes/photo/PhotoScene';
import ProjectScene from './scenes/project/ProjectScene';
import CollaborateScene from './scenes/collaborate/CollaborateScene';
import ModalLayer from './ModalLayer';

const COMPONENTS: Record<SceneId, ComponentType<Record<string, unknown>>> = {
  loading: LoadingScene as ComponentType,
  photo: PhotoScene as ComponentType,
  projects: ProjectScene as ComponentType,
  collaborate: CollaborateScene as ComponentType,
};

export default function Experience() {
  const store = useMemo(() => createExperienceStore('loading'), []);
  const [scene, go] = useExperienceScene(store);
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  /** Layer DOM per-scene, diisi via ref callback untuk transisi GSAP. */
  const layers = useRef(new Map<SceneId, HTMLElement | null>());
  /** Loading selesai (mask reveal penuh) → photo layer boleh interaktif. */
  const [loadingDone, setLoadingDone] = useState(false);

  // Boot timestamp utk LoadingScreen (min intro tanpa perlambat artifisial).
  useEffect(() => {
    (window as Window & { __npaBootTs?: number }).__npaBootTs ??= performance.now();
  }, []);

  // Simpan referensi DOM tiap scene aktif
  const setLayer = useCallback(
    (id: SceneId) => (el: HTMLDivElement | null) => { layers.current.set(id, el); },
    [],
  );

  // Cross-dissolve sederhana setiap kali scene berubah.
  // KHUSUS loading→photo: JANGAN meng-fade photo layer — ia dibiarkan
  // terlihat di belakang loading screen agar mask reveal (clip-path
  // circle pada loading-screen) membuka foto dari tengah secara
  // sinematik. onDone LoadingScreen tetap memanggil go('photo') untuk
  // menandai Photo aktif + meng-unmount loading (swap lifecycle).
  const prev = useRef<SceneId>('loading');
  useEffect(() => {
    const from = layers.current.get(prev.current);
    const to = layers.current.get(scene);
    const isCinematicEntry = prev.current === 'loading' && scene === 'photo';
    prev.current = scene;
    if (!to || (from === to && !isCinematicEntry)) return;

    const dur = reduced ? 0 : 0.6;
    if (from && !isCinematicEntry) {
      gsap.to(from, { autoAlpha: 0, duration: dur, ease: 'power2.inOut' });
    }
    if (isCinematicEntry) {
      // Photo sudah visible sejak awal (sebagian tertutup loading screen);
      // cukup pastikan state-nya penuh saat loading selesai.
      gsap.set(to, { clearProps: 'opacity,visibility' });
      return;
    }
    gsap.fromTo(
      to,
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: dur, ease: 'power2.inOut', clearProps: 'visibility' },
    );
  }, [scene, reduced]);

  // Urutan canonical dari registry — trigger sementara berupa tombol dev
  // di dalam stub scene (trigger final didiskusikan per scene, user #9).
  const nextOf = (s: SceneId): SceneId | undefined => {
    const i = SCENE_REGISTRY.findIndex((r) => r.id === s);
    return SCENE_REGISTRY[i + 1]?.id;
  };
  const prevOf = (s: SceneId): SceneId | undefined => {
    const i = SCENE_REGISTRY.findIndex((r) => r.id === s);
    return SCENE_REGISTRY[i - 1]?.id;
  };

  const persistent = SCENE_REGISTRY.filter((r) => r.persistent);
  const swapActive = SCENE_REGISTRY.find((r) => !r.persistent && r.id === scene);

  return (
    <div className="experience" ref={rootRef} data-scene={scene} data-loading-done={loadingDone}>
      {/* Overlay stack: selalu mounted, state dipertahankan */}
      {persistent.map(({ id }) => {
        const Cmp = COMPONENTS[id];
        // Photo layer dibuat visible SEJAK AWAL selama fase loading
        // (data-reveal-under-loading) sehingga mask reveal membuka foto
        // dari tengah. Interaksi baru aktif setelah loadingDone (§04.5).
        const photoUnderLoading = id === 'photo' && !loadingDone;
        const active = scene === id;
        return (
          <div
            key={id}
            className="scene-layer"
            data-scene-id={id}
            data-active={active || photoUnderLoading}
            data-interactive={active && (id !== 'photo' || loadingDone)}
            data-reveal-under-loading={photoUnderLoading || undefined}
            ref={setLayer(id)}
          >
            <Cmp
              active={active}
              goNext={id === 'photo' ? () => nextOf(id) && go(nextOf(id)!) : undefined}
              goBack={id === 'collaborate' ? () => prevOf(id) && go(prevOf(id)!) : undefined}
            />
          </div>
        );
      })}

      {/* Swap stack: hanya mounted saat aktif */}
      {swapActive && (
        <div className="scene-layer scene-layer--top" data-scene-id={swapActive.id} data-active ref={setLayer(swapActive.id)}>
          {swapActive.id === 'loading' ? (
            <LoadingScene
              active
              onDone={() => {
                setLoadingDone(true);
                go('photo');
              }}
            />
          ) : (
            <ProjectScene
              active
              goNext={() => nextOf('projects') && go(nextOf('projects')!)}
              goBack={() => prevOf('projects') && go(prevOf('projects')!)}
            />
          )}
        </div>
      )}

      {/* Layer modal global — siap dipakai PhotoBioModal/ProjectModal/ContactModal */}
      <ModalLayer />
    </div>
  );
}
