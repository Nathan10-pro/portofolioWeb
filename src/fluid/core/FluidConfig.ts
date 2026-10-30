/**
 * NPA Fluid Engine — Central configuration (Spec v1.0 §10 & §18)
 *
 * Nilai adalah TARGET EKSPERIMEN, bukan konstanta fisika universal.
 * Dissipation disesuaikan dengan fixed timestep 1/60 s.
 * Kelompok parameter: SHAPE · MOTION · RIPPLE/VORTICITY · LIFECYCLE (§10).
 */

export type QualityTier = 'high' | 'medium' | 'low';

export interface FluidConfig {
  /* ── Simulation grid ─────────────────────────────── */
  simResolution: number;   // baseline 256 (§9)
  dyeResolution: number;   // 256 → 512 pada high tier

  /* ── Solver ──────────────────────────────────────── */
  pressureIterations: number; // 20–30 (§10)
  dt: number;                 // fixed timestep 1/60 (§6)
  maxStepsPerFrame: number;   // anti backlog saat FPS turun

  /* ── SHAPE ───────────────────────────────────────── */
  splatRadius: number;        // pointer splat 0.025–0.05 (§10)
  ambientSplatScale: number;  // ambient sedikit lebih besar & lebih lembut

  /* ── MOTION ──────────────────────────────────────── */
  pointerForce: number;       // dikalikan velocity ter-klamp
  maxSpeed: number;           // clamp velocity → gerakan cepat tidak liar (§4)
  velocityDissipation: number;// 0.98–0.995 per step @60Hz
  smoothing: number;          // lerp alpha input→splat target (pointer smoothing)

  /* ── RIPPLE / VORTICITY ──────────────────────────── */
  curlStrength: number;       // RENDAH — cairan lembut, bukan badai (§10)

  /* ── DYE / LIFECYCLE ─────────────────────────────── */
  dyeDissipation: number;     // 0.97–0.995 per step @60Hz
  dyeAmount: number;          // injeksi density per splat
  ambientDyeAmount: number;   // ambient lebih lemah (warna tidak dominan)

  /* ── MASK GENERATOR (§7) ─────────────────────────── */
  maskThreshold: number;      // T 0.35–0.50
  maskFeather: number;        // F 0.08–0.15
  edgeNoise: number;          // organic refinement halus di tepi mask
  edgeFlow: number;           // kecepatan noise tepi mengikuti aliran
  maxReveal: number;          // plafon intensitas reveal (warna tidak dominan)

  /* ── ADAPTIVE / IDLE SLEEP ───────────────────────── */
  adaptive: boolean;
  sleepEpsilon: number;       // di bawah ini → simulation steps dihentikan (§14)
}

export const DEFAULT_FLUID_CONFIG: FluidConfig = {
  simResolution: 256,
  dyeResolution: 256,

  pressureIterations: 22,
  dt: 1 / 60,
  maxStepsPerFrame: 3,

  splatRadius: 0.035,
  ambientSplatScale: 1.35,

  pointerForce: 260,
  maxSpeed: 1.15,
  velocityDissipation: 0.985,
  smoothing: 0.16,

  curlStrength: 0.12,

  dyeDissipation: 0.982,
  dyeAmount: 0.62,
  ambientDyeAmount: 0.34,

  maskThreshold: 0.42,
  maskFeather: 0.12,
  edgeNoise: 0.035,
  edgeFlow: 0.6,
  maxReveal: 0.92,

  adaptive: true,
  sleepEpsilon: 0.0025,
};

/** Preset kualitas per perangkat (§13 device compatibility). */
export function applyQuality(cfg: FluidConfig, tier: QualityTier): FluidConfig {
  switch (tier) {
    case 'high':
      return { ...cfg, simResolution: 256, dyeResolution: 512, pressureIterations: 26 };
    case 'medium':
      return { ...cfg, simResolution: 256, dyeResolution: 256, pressureIterations: 22 };
    case 'low':
      return { ...cfg, simResolution: 128, dyeResolution: 128, pressureIterations: 14, curlStrength: 0 };
  }
}

/** Tier awal berdasarkan heuristik perangkat (hasil akhir via pengujian nyata). */
export function detectTier(): QualityTier {
  if (typeof navigator === 'undefined') return 'medium';
  const mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const cores = navigator.hardwareConcurrency ?? 4;
  if (mobile || cores <= 4) return 'low';
  if (cores >= 8) return 'high';
  return 'medium';
}
