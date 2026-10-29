/* ============================================================
   useBodyScrollLock — §4/§6: scroll halaman dikunci selama modal
   terbuka, dan state scene tidak di-reset ketika modal ditutup.
   Implementasi minimal: toggle kelas `modal-open` (lihat global.css).
   Count-based agar dua modal bertumpuk tidak saling melepas lock.
   ============================================================ */

import { useEffect } from 'react';

let lockCount = 0;

export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    lockCount += 1;
    document.body.classList.add('modal-open');
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) document.body.classList.remove('modal-open');
    };
  }, [active]);
}
