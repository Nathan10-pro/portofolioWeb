/* ============================================================
   COLLABORATE SCENE — STUB (Tahap 2: Experience Shell)
   Persistent overlay layer: karakter 3D akan terus "hidup"
   meski user kembali ke scene lain (§13: bukan akhir statis).
   Tahap 8–9 mengisi Character (.glb), SocialObjects, ContactModal.
   ============================================================ */

import { collaborate } from '../../data/social';

interface Props {
  active: boolean;
  goBack?: () => void;
}

export default function CollaborateScene({ active, goBack }: Props) {
  return (
    <section className="scene scene--collaborate" data-scene="collaborate" aria-hidden={!active}>
      <div className="scene__placeholder">
        <span className="meta-label">COLLABORATE · SPACESUIT CHARACTER [STUB]</span>
      </div>

      <h2 className="collaborate-headline">{collaborate.headline}</h2>

      {active && goBack && (
        <button className="dev-trigger" style={{ top: 'var(--edge-padding)', bottom: 'auto' }} onClick={goBack}>
          ← PROJECTS
        </button>
      )}
    </section>
  );
}
