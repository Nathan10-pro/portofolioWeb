/* ============================================================
   PHOTO BIO MODAL (§4 spec) — konten editorial:
   1. Identitas  2. Summary  3. Biography  4. Education/Focus
   Isi = placeholder dari data/profile.ts (jangan mengarang).

   Perilaku terkunci:
   - Muncul "terhubung" dengan foto: transform-origin diset ke
     posisi foto via prop originRef (GSAP scale/fade dari arah itu).
   - Background meredup (dimmer ModalLayer), scroll dikunci.
   - Close → kembali ke keadaan photo sebelumnya; scene TIDAK reset
     (fluid dibekukan via paused, bukan dihancurkan).
   - Mobile: hampir fullscreen (CSS .modal-panel @media ≤767px).
   ============================================================ */

import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { profile } from '../../data/profile';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface Props {
  onClose: () => void;
  /** Elemen pemicu (area foto) — untuk transformOrigin transisi masuk. */
  originEl?: HTMLElement | null;
}

export default function PhotoBioModal({ onClose, originEl }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // Transisi masuk yang terhubung secara visual ke area foto:
  // hitung arah origin relatif viewport lalu animate dari skala kecil.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    let ox = '50% 50%', oy = '50% 50%';
    if (originEl) {
      const r = originEl.getBoundingClientRect();
      ox = `${r.left + r.width / 2}px`;
      oy = `${r.top + r.height / 2}px`;
    }
    const dur = reduced ? 0 : 0.5;
    gsap.fromTo(
      el,
      { autoAlpha: 0, scale: 0.92, transformOrigin: `${ox} ${oy}` },
      { autoAlpha: 1, scale: 1, duration: dur, ease: 'power3.out', clearProps: 'transformOrigin' },
    );
  }, [originEl, reduced]);

  return (
    <div className="photo-bio-modal" ref={contentRef}>
      <header className="photo-bio-modal__head">
        <div>
          <h2 className="photo-bio-modal__name">{profile.name}</h2>
          <p className="meta-label">{profile.role} · {profile.major}</p>
        </div>
        <button className="photo-bio-modal__close" onClick={onClose} aria-label="Tutup bio">
          CLOSE ✕
        </button>
      </header>

      <section className="photo-bio-modal__body">
        <div className="bio-block">
          <span className="meta-label">SUMMARY</span>
          <p>{profile.bio.summary}</p>
        </div>
        <div className="bio-block">
          <span className="meta-label">BIOGRAPHY</span>
          <p>{profile.bio.biography}</p>
        </div>
        <div className="bio-block">
          <span className="meta-label">EDUCATION / FOCUS</span>
          <p>{profile.bio.education}</p>
          <ul className="bio-focus">
            {profile.bio.focus.map((f) => <li key={f}>{f}</li>)}
          </ul>
        </div>
      </section>

      <img className="photo-bio-modal__sig" src={profile.assets.signature} alt="" aria-hidden="true" />
    </div>
  );
}
