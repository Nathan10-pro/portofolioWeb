/* ============================================================
   PROJECT SCENE — STUB (Tahap 2: Experience Shell)
   Swap lifecycle: di-mount hanya selama scene projects aktif.
   Tahap 6–7 mengisi ProjectWorld (2.5D floating in void),
   ProjectObject, horizontal scroll track, dan ProjectModal.
   ============================================================ */

import { projects } from '../../data/projects';

interface Props {
  active: boolean;
  goNext?: () => void;
  goBack?: () => void;
}

export default function ProjectScene({ active, goNext, goBack }: Props) {
  return (
    <section className="scene scene--projects" data-scene="projects" aria-hidden={!active}>
      <div className="scene__placeholder">
        <span className="meta-label">PROJECTS · 2.5D FLOATING IN VOID [STUB]</span>
        <ul style={{ marginTop: '1.5rem', display: 'grid', gap: '0.4rem' }}>
          {projects.map((p) => (
            <li key={p.id} className="meta-label" style={{ color: 'var(--color-text-secondary)' }}>
              {p.category} — {p.title}
            </li>
          ))}
        </ul>
      </div>

      {active && (
        <div style={{ position: 'absolute', bottom: 'var(--edge-padding)', display: 'flex', gap: '1rem' }}>
          {goBack && <button className="dev-trigger" onClick={goBack}>← PHOTO</button>}
          {goNext && <button className="dev-trigger" onClick={goNext}>→ COLLABORATE</button>}
        </div>
      )}
    </section>
  );
}
