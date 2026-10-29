/* ============================================================
   MODAL LAYER (Tahap 2) — portal global untuk semua modal.

   Kontrak §13: modal TIDAK merestart scene di belakangnya.
   Karena itu modal dirender di luar tree scene (portal ke body)
   dan mengunci scroll lewat useBodyScrollLock.

   API kecil berbasis daftar: scene mendaftarkan konten modalnya
   sendiri di Tahap 4/7/9. Untuk sekarang layer ini kosong tapi
   sudah ter-wire (diuji dengan modal demo via window.__demoModal).
   ============================================================ */

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import gsap from 'gsap';
import { useBodyScrollLock } from './hooks/useBodyScrollLock';
import { useReducedMotion } from './hooks/useReducedMotion';

interface ModalApi {
  open: (content: ReactNode) => void;
  close: () => void;
  isOpen: boolean;
}

const Ctx = createContext<ModalApi>({ open: () => {}, close: () => {}, isOpen: false });
export const useModal = () => useContext(Ctx);

export default function ModalLayer() {
  const [content, setContent] = useState<ReactNode>(null);
  const [panelRef, setPanelRef] = useState<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  const open = useCallback((c: ReactNode) => setContent(c), []);
  const close = useCallback(() => setContent(null), []);
  const api: ModalApi = { open, close, isOpen: content !== null };

  // Animasi enter/exit panel (scale+fade halus, origin terhubung secara visual
  // ke area pemicu nanti — tiap modal bisa override transformOrigin).
  useEffect(() => {
    if (!panelRef) return;
    const dur = reduced ? 0 : 0.45;
    gsap.to(panelRef, { autoAlpha: 1, scale: 1, duration: dur, ease: 'power3.out' });
  }, [panelRef, content, reduced]);

  useBodyScrollLock(api.isOpen);

  // Debug hook agar Shell bisa diuji sebelum modal asli dibuat (dihapus di Tahap 4).
  useEffect(() => {
    (window as unknown as { __demoModal?: ModalApi }).__demoModal = api;
    return () => {
      delete (window as unknown as { __demoModal?: ModalApi }).__demoModal;
    };
  });

  return (
    <Ctx.Provider value={api}>
      {content !== null &&
        createPortal(
          <div className="modal-root" onClick={close}>
            <div className="modal-backdrop" />
            <div
              className="modal-panel"
              role="dialog"
              aria-modal="true"
              ref={(el) => {
                if (el) gsap.set(el, { autoAlpha: 0, scale: 0.96 });
                setPanelRef(el);
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {content}
            </div>
          </div>,
          document.body,
        )}
    </Ctx.Provider>
  );
}
