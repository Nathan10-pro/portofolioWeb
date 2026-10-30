/* ============================================================
   ProjectModal — detail project (satu-satunya pintu informasi,
   master plan §5 & §13). Dibuka dari ProjectObject lewat ModalLayer.

   Struktur mengikuti spec Digital Terrain §7:
   header NPA/PROJECT + CLOSE · image kiri · P-00N / nama / overview
   · ROLE · TECHNOLOGIES · DEVELOPMENT · RESULT · link demo/repo.

   Perilaku terkunci:
   - Berkembang dari posisi objek ke tengah (GSAP scale+origin) —
     di PhotoBioModal pola ini sudah dipakai via originEl.
   - Dunia di belakang tetap terlihat, diredupkan (backdrop dimmer
     ModalLayer) — tanpa blur berat demi performa.
   - Close → state scene sebelumnya dipertahankan (fluid stop hanya
     karena memang sedang di projects; posisi track tidak berubah).
   - Escape ditangani ModalLayer global.
   ============================================================ */

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import type { ProjectData } from '../../types';
import { landmarkId } from './ProjectObject';
import './ProjectScene.css';

interface Props {
  project: ProjectData;
  index: number;
  onClose: () => void;
}

export default function ProjectModal({ project, index, onClose }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);

  // entrance halus dari arah objek yang diklik (bukan pop mentah)
  useEffect(() => {
    if (!boxRef.current) return;
    const tl = gsap.timeline();
    tl.fromTo(
      boxRef.current,
      { autoAlpha: 0, scale: 0.92, y: 18 },
      { autoAlpha: 1, scale: 1, y: 0, duration: 0.45, ease: 'power3.out' },
    );
    return () => { tl.kill(); };
  }, [project.id]);

  return (
    <div
      className="project-modal"
      ref={boxRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Detail project ${project.title}`}
    >
      <header className="project-modal__head">
        <span className="meta-label">NPA / PROJECT</span>
        <button className="project-modal__close" onClick={onClose} aria-label="Tutup detail project">
          CLOSE ✕
        </button>
      </header>

      <div className="project-modal__body">
        <figure className="project-modal__media">
          <img src={project.media[0]?.src ?? project.thumbnail} alt={project.title} />
          {project.media[0]?.caption && (
            <figcaption className="meta-label">{project.media[0].caption}</figcaption>
          )}
        </figure>

        <div className="project-modal__info">
          <span className="project-modal__id meta-label">{landmarkId(index)} / SELECTED WORK</span>
          <h2 className="project-modal__title">{project.title}</h2>
          <p className="project-modal__overview">{project.shortDescription}</p>

          <dl className="project-modal__fields">
            <div><dt>CATEGORY</dt><dd>{project.category}</dd></div>
            <div><dt>YEAR</dt><dd>{project.year}</dd></div>
            <div><dt>ROLE</dt><dd>[DUMMY] Developer &amp; Designer</dd></div>
            <div><dt>TECHNOLOGIES</dt><dd>{project.stack.join(' · ')}</dd></div>
          </dl>

          <section className="project-modal__dev">
            <h3 className="meta-label">DEVELOPMENT</h3>
            <p>{project.longDescription}</p>
            <h3 className="meta-label">RESULT</h3>
            <p>[DUMMY TEXT] Hasil akhir project — konten asli menyusul.</p>
          </section>

          {project.links.length > 0 && (
            <footer className="project-modal__links">
              {project.links.map((l) => (
                <a key={l.label} href={l.url} target="_blank" rel="noopener noreferrer" className="project-modal__link">
                  {l.label} ↗
                </a>
              ))}
            </footer>
          )}
        </div>
      </div>
    </div>
  );
}
