/**
 * shaders.ts — Kumpulan GLSL Fluid Engine (Spec §6, §12).
 *
 * Prinsip:
 * - Semua pass simulasi memakai vertex shader fullscreen-triangle yang sama.
 * - Shader TIDAK pernah membaca & menulis texture yang sama dalam satu pass
 *   (ping-pong ditangani RenderTargetManager).
 * - Constraint keras (§18): foto tidak boleh terdistorsi geometris —
 *   dye/velocity hanya memengaruhi MASK; composite sampling UV foto murni.
 */

export const baseVertexShader = /* glsl */ `
  precision highp float;
  attribute vec2 aPosition;
  varying vec2 vUv;
  void main() {
    vUv = aPosition * 0.5 + 0.5;
    gl_Position = vec4(aPosition, 0.0, 1.0);
  }
`;

/* ── Common ─────────────────────────────────────────── */

const common = /* glsl */ `
  precision highp float;
  precision highp sampler2D;
  varying vec2 vUv;
  uniform sampler2D uVelocity;
  uniform sampler2D uSource;
  uniform vec2 uTexel;        // 1 / resolution field yang sedang diolah
  uniform float uDt;
  uniform float uDissipation;

  // Hash & value noise 2D (murah, cukup untuk organic edge)
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }
`;

/* ── Pass 1 · Splat (input injection: velocity + dye sekaligus) ── */

export const splatShader = /* glsl */ `
  ${common}
  uniform sampler2D uTarget;       // field yang di-splat
  uniform vec2 uPoint;             // uv pada grid simulasi
  uniform float uRadius;           // radius splat (unit uv grid)
  uniform vec2 uValue;             // nilai injeksi (velocity xy atau dye scalar di .x)
  uniform float uAspect;           // koreksi aspect plane foto → splat tetap bulat

  void main() {
    vec2 p = vUv - uPoint;
    p.x *= uAspect;
    float d = length(p);
    float g = exp(-(d * d) / max(uRadius * uRadius, 1e-6));
    vec4 base = texture2D(uTarget, vUv);
    gl_FragColor = base + vec4(uValue, 0.0, 0.0) * g;
  }
`;

/* ── Pass 2 · Advection (semi-Lagrangian, dissipation per-dt) ── */

export const advectionShader = /* glsl */ `
  ${common}
  uniform vec2 uVelocityScale;     // resolusi grid sumber (untuk step back in texels)

  void main() {
    vec2 vel = texture2D(uVelocity, vUv).xy;
    // trace backward: pos_now - vel * dt (diskretisasi ke texel)
    vec2 coord = vUv - uDt * vel * uTexel * uVelocityScale;
    vec4 src = texture2D(uSource, coord);
    // dissipation stabil terhadap timestep: pow(d, dt*60)
    float decay = pow(max(uDissipation, 0.0), uDt * 60.0);
    gl_FragColor = src * decay;
  }
`;

/* ── Pass 3 · Divergence ── */

export const divergenceShader = /* glsl */ `
  ${common}
  void main() {
    float L = texture2D(uVelocity, vUv - vec2(uTexel.x, 0.0)).x;
    float R = texture2D(uVelocity, vUv + vec2(uTexel.x, 0.0)).x;
    float B = texture2D(uVelocity, vUv - vec2(0.0, uTexel.y)).y;
    float T = texture2D(uVelocity, vUv + vec2(0.0, uTexel.y)).y;
    // tengah dikompensasi agar divergensi ~nol pada aliran seragam
    float div = 0.5 * (R - L + T - B);
    gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
  }
`;

/* ── Pass 4 · Curl (vorticity confinement — opsional, strength rendah) ── */

export const curlShader = /* glsl */ `
  ${common}
  void main() {
    float L = texture2D(uVelocity, vUv - vec2(uTexel.x, 0.0)).y;
    float R = texture2D(uVelocity, vUv + vec2(uTexel.x, 0.0)).y;
    float B = texture2D(uVelocity, vUv - vec2(0.0, uTexel.y)).x;
    float T = texture2D(uVelocity, vUv + vec2(0.0, uTexel.y)).x;
    float vort = R - L - T + B;
    gl_FragColor = vec4(0.5 * vort, 0.0, 0.0, 1.0);
  }
`;

/* ── Pass 5 · Vorticity confinement force ── */

export const vorticityShader = /* glsl */ `
  ${common}
  uniform sampler2D uCurl;
  uniform float uCurlStrength;

  void main() {
    float L = texture2D(uCurl, vUv - vec2(uTexel.x, 0.0)).x;
    float R = texture2D(uCurl, vUv + vec2(uTexel.x, 0.0)).x;
    float B = texture2D(uCurl, vUv - vec2(0.0, uTexel.y)).x;
    float T = texture2D(uCurl, vUv + vec2(0.0, uTexel.y)).x;
    float C = texture2D(uCurl, vUv).x;

    vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
    float len = length(force) + 1e-5;
    force = force / len * uCurlStrength * C;

    vec2 vel = texture2D(uVelocity, vUv).xy;
    gl_FragColor = vec4(vel + force * uDt, 0.0, 1.0);
  }
`;

/* ── Pass 6 · Pressure Jacobi iteration ── */

export const pressureShader = /* glsl */ `
  ${common}
  uniform sampler2D uPressure;
  uniform sampler2D uDivergence;

  void main() {
    float L = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
    float R = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
    float B = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
    float T = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
    float div = texture2D(uDivergence, vUv).x;
    float p = (L + R + B + T - div) * 0.25;
    gl_FragColor = vec4(p, 0.0, 0.0, 1.0);
  }
`;

/* ── Pass 7 · Gradient subtraction (projection) ── */

export const gradientSubtractShader = /* glsl */ `
  ${common}
  uniform sampler2D uPressure;

  void main() {
    float L = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
    float R = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
    float B = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
    float T = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
    vec2 vel = texture2D(uVelocity, vUv).xy;
    vel -= vec2(R - L, T - B);
    gl_FragColor = vec4(vel, 0.0, 1.0);
  }
`;

/* ── Pass 8b · Pressure decay (agar solver tidak menyimpan state basi) ── */

export const clearShader = /* glsl */ `
  ${common}
  uniform sampler2D uField;
  uniform float uClear;

  void main() {
    float v = texture2D(uField, vUv).x;
    gl_FragColor = vec4(v * uClear, 0.0, 0.0, 1.0);
  }
`;

/* ── Pass 9 · Mask generator (§7): density → threshold → feather → organic edge ── */

export const maskShader = /* glsl */ `
  ${common}
  uniform sampler2D uDye;
  uniform float uThreshold;    // T
  uniform float uFeather;      // F
  uniform float uEdgeNoise;    // amplitudo refinement organik tepi
  uniform float uEdgeFlow;     // kecepatan drift noise
  uniform float uTime;
  uniform float uMaxReveal;    // plafon intensitas warna

  void main() {
    float d = texture2D(uDye, vUv).x;

    // Sedikit domain-warp HANYA pada koordinat noise (bukan UV foto):
    // tepi mask menjadi organik tanpa menggeser pixel foto.
    vec2 np = vUv * 7.0;
    float w = noise(np + vec2(uTime * uEdgeFlow, uTime * uEdgeFlow * 0.4)) - 0.5;
    float dn = d + w * uEdgeNoise;

    // M = smoothstep(T - F, T + F, D) — soft feathered edge
    float m = smoothstep(uThreshold - uFeather, uThreshold + uFeather, dn);

    // Gelombang lembut pada batas reveal (ripple, §3B): modulasi kecil
    // hanya di zona tepi (gradien mask tinggi), interior tetap stabil.
    float edgeBand = m * (1.0 - m) * 4.0; // puncak di tepi, 0 di interior/exterior
    float ripple = sin((length(vUv - 0.5) * 42.0) - uTime * 2.2) * 0.06;
    m += edgeBand * ripple * uEdgeNoise * 8.0;

    m = clamp(m, 0.0, 1.0) * uMaxReveal;
    gl_FragColor = vec4(m, 0.0, 0.0, 1.0);
  }
`;

/* ── Pass 10 · Photo compositor (§8) ──
   C_final = (1 - M) * BW + M * Color.
   Sampling kedua foto dengan UV IDENTIK → nol distorsi geometri. */

export const compositeShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uBaseImage;   // foto monochrome
  uniform sampler2D uColorImage;  // foto asli berwarna
  uniform sampler2D uFluidMask;   // hasil mask generator

  void main() {
    vec3 bw = texture2D(uBaseImage, vUv).rgb;
    vec3 color = texture2D(uColorImage, vUv).rgb;
    float m = texture2D(uFluidMask, vUv).x;

    // Sheen gel sangat halus HANYA di pita tepi mask (kesan translucent),
    // tidak menyentuh interior sehingga wajah tetap natural.
    float band = m * (1.0 - m) * 4.0;
    vec3 tint = vec3(0.05, 0.06, 0.08) * band * 0.9;

    vec3 outc = mix(bw, color, m) + tint;
    gl_FragColor = vec4(outc, 1.0);
  }
`;

/* ── Debug: tampilkan dye mentah (checkpoint 04) ── */

export const displayShader = /* glsl */ `
  precision highp float;
  varying vec2 vUv;
  uniform sampler2D uTexture;
  void main() {
    gl_FragColor = texture2D(uTexture, vUv);
  }
`;
