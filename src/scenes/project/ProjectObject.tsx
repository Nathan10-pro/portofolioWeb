/* ============================================================
   ProjectObject — satu landmark karya di dalam Digital Terrain.

   Anatomy (spec §3): Display Object (thumbnail) · Identifier P-00N
   · Title (muncul saat hover/select) · Category Marker · Interaction
   Area lebih luas daripada visual objek.

   Treatment per kategori (master plan §5 — mengatur treatment,
   bukan penilaian kualitas):
   - MAIN        → paling besar, depth paling kuat, glow hairline.
   - SIDE        → sedang, tenang (opacity frame lebih rendah).
   - EXPERIMENT  → penempatan eksperimental: rotasi/offset lebih
                   berani, skala kecil, kadang "terpotong" komposisi.

   Aturan: warna ASLI thumbnail dipertahankan (monochrome world +
   color-as-content); dunia di sekitarnya yang grayscale.
   Hover: scale kecil + title reveal — subtil, bukan tombol game.
   Klik: memanggil onSelect(id) → ProjectModal (satu-satunya pintu
   detail, §13).
   ============================================================ */

import { memo } from 'react';
import type { ProjectData } from '../../types';

interface Props {
  project: ProjectData;
  index: number;
  reducedMotion: boolean;
  onSelect: (id: string) => void;
  setRef: (el: HTMLElement | null) => void;
}

/** Nomor landmark: P-001 … berdasarkan urutan data (konstan). */
export function landmarkId(index: number): string {
  return `P-${String(index + 1).padStart(3, '0')}`;
}

function ProjectObject({ project, index, reducedMotion, onSelect, setRef }: Props) {
  const { layout, category } = project;

  return (
    <article
      ref={setRef}
      className={`project-object project-object--${category.toLowerCase()}`}
      style={{
        left: `${layout.x}px`,
        top: `calc(50% + ${layout.y}px)`,
        ['--base-rot' as string]: `${layout.rotation}deg`,
        ['--obj-scale' as string]: String(layout.scale),
        ['--depth' as string]: String(layout.depth),
      }}
      data-depth={layout.depth}
      data-rot={layout.rotation}
      data-base-y={0}
      data-id={project.id}
      aria-hidden="false"
    >
      {/* Interaction area lebih luas dari visual (§3 anatomy no.5) */}
      <button
        type="button"
        className="project-object__hit"
        onClick={() => onSelect(project.id)}
        aria-label={`${landmarkId(index)} — ${project.title}. Buka detail project.`}
      >
        <div className={`project-display project-display--${category.toLowerCase()}`}>
          <img
            src={project.thumbnail}
            alt=""
            loading="lazy"
            draggable={false}
          />
          {/* vignette monochrome tipis di tepi frame agar menyatu dunia */}
          <span className="project-display__edge" aria-hidden="true" />
        </div>

        <div className="project-meta">
          <span className="project-meta__id">{landmarkId(index)}</span>
          <span className="project-meta__title">{project.title}</span>
          <span className={`project-meta__cat project-meta__cat--${category.toLowerCase()}`}>
            {category} · {project.year}
          </span>
        </div>
      </button>

      {/* float idle sangat halus — tujuan: objek terasa mengambang (§5).
          Dimatikan penuh pada reduced motion. */}
      {!reducedMotion && <span className="project-object__float" aria-hidden="true" />}
    </article>
  );
}

export default memo(ProjectObject);
