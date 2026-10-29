/* ============================================================
   EXPERIENCE CONTRACTS (§8) — kontrak seragam untuk semua scene.

   Strategi transisi (keputusan diskusi Tahap 2, user #1–#3):
   - Overlay stack : Photo & Collaborate selalu ter-mount; navigasi
     hanya menaikkan/menurunkan layer opacity+visibility. State scene
     (fluid, posisi parallax, karakter) TIDAK PERNAH di-reset →
     memenuhi aturan §13 "modal/scene mempertahankan state".
   - Swap lifecycle: Loading di-mount/unmount karena sekali lewat.

   Lifecycle GSAP yang diimplementasikan tiap scene stub:
     enter() → dipanggil saat scene menjadi aktif (reveal)
     exit()  → dipanggil saat scene ditinggalkan (conceal)
   Scene boleh mengabaikan keduanya bila memilih CSS-driven transition
   (lihat `transition` field).
   ============================================================ */

import type { SceneId } from '../../types';

export interface SceneContract {
  id: SceneId;
  /** true = tetap mounted sebagai layer (overlay), false = swap in/out */
  persistent: boolean;
  /** 'gsap' → Experience Shell memanggil enter()/exit();
      'css'  → transisi didelegasikan ke kelas data-scene + CSS. */
  transition: 'gsap' | 'css';
  /** Opsional: timeline/handler reveal dari DOM scene. */
  enter?: (el: HTMLElement) => void;
  /** Opsional: handler conceal. Boleh mengembalikan thenable/promise
      agar Shell menunggu animasi selesai sebelum menyalakan scene baru. */
  exit?: (el: HTMLElement) => void | PromiseLike<void>;
}

export interface SceneRegistryEntry extends SceneContract {
  label: string; // label debug/dev — TIDAK dirender sebagai UI (user #4: tanpa indicator)
}
