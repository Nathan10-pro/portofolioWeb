/* ============================================================
   LOADING CONFIG — Tahap 3 (Minimalist Cinematic Intro)
   Sumber: Loading Screen Design Spec v1.0 (keputusan terkunci)
   - Monogram: NPA (typography direction A), warna #FFFFFF
   - Background: #080808 · Secondary text: #8A8A8A (token)
   - Opening: opacity + scale (+blur halus yang menghilang)
   - Exit: expanding mask reveal via clip-path (circle dari tengah)
   Durasi = target desain, bukan waktu tunggu wajib: bila aset
   siap lebih cepat, fase tidak diperlambat artifisial.
   ============================================================ */

export const LOADING_CONFIG = {
  /** Minimum durasi intro agar identitas sempat terbaca (ms).
      Progress tetap nyata; hanya transisi exit yang menunggu
      batas ini jika loading keburu selesai. */
  minIntroMs: 2200,

  /** Fallback anti loading tanpa batas (spec §"hindari loading tanpa batas").
      Setelah timeout, progress dipaksa selesai dengan status ALMOST READY→READY. */
  loadTimeoutMs: 15000,

  /** Fase entrance monogram (Phase 01–02). */
  entrance: {
    bgFadeIn: 0.3,        // 0–300ms : background hitam
    logoDuration: 0.7,    // 300–1000ms : opacity 0→1, scale .92→1, blur 6px→0
    logoDelay: 0.3,
    logoScaleFrom: 0.92,
    logoBlurFrom: 6,      // px — subtil, hilang penuh di akhir
    subtitleDelay: 1.05,  // subtitle muncul SETELAH logo settle
    subtitleDuration: 0.5,
    metaDuration: 0.5,    // info sudut (IDENTITY/STYLE/TRANSITION & top row)
    staggerMeta: 0.08,
  },

  /** Phase 04 — exit + mask reveal. */
  exit: {
    fadeDuration: 0.4,    // monogram & indikator memudar bersamaan (300–500ms)
    maskDuration: 1.0,    // mask reveal 800–1200ms
    maskEase: 'power2.inOut',
    photoFadeIn: 0.9,     // foto muncul perlahan dari hitam selama mask terbuka
  },

  /** Pemetaan progress → status (persentase berasal dari preloader nyata). */
  statusMap: [
    { until: 25, label: 'INITIALIZING' },
    { until: 50, label: 'LOADING ASSETS' },
    { until: 75, label: 'PREPARING EXPERIENCE' },
    { until: 99, label: 'ALMOST READY' },
    { until: 100, label: 'EXPERIENCE READY' },
  ] as const,
} as const;

export function statusForProgress(p: number): string {
  const clamped = Math.max(0, Math.min(100, Math.round(p)));
  for (const s of LOADING_CONFIG.statusMap) {
    if (clamped <= s.until) return s.label;
  }
  return 'EXPERIENCE READY';
}
