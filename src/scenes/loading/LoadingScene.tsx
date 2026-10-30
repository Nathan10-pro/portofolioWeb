/* ============================================================
   LOADING SCENE — wrapper swap lifecycle (Tahap 3: FINAL).
   Implementasi visual & timeline ada di ./LoadingScreen.tsx.
   Scene ini hanya menjaga kontrak Shell: mounted saat aktif,
   memanggil onDone() setelah mask reveal selesai → Photo aktif.
   Karena swap lifecycle, ia TIDAK pernah muncul lagi ketika
   pengguna berpindah antar bagian (aturan spec §05).
   ============================================================ */

import LoadingScreen from './LoadingScreen';

interface Props {
  active: boolean;
  /** Dipanggil scene ketika transisi exit-nya selesai (Shell → photo). */
  onDone?: () => void;
}

export default function LoadingScene({ active, onDone }: Props) {
  if (!active || !onDone) return null;
  return <LoadingScreen onDone={onDone} />;
}
