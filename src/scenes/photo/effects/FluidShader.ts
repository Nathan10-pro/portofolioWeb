/* ============================================================
   FluidShader.ts — sumber GLSL untuk FluidReveal.
   Referensi file .glsl: src/shaders/photo/fluidMask.glsl.
   Prinsip terkunci (§8): yang berubah HANYA mask reveal; geometri
   foto tidak pernah bergerak → nol distorsi.
   ============================================================ */

export const FLUID_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const FLUID_FRAGMENT_SHADER = /* glsl */ `
#define MAX_EMITTERS 8

uniform sampler2D uBwTex;
uniform sampler2D uColorTex;
uniform vec4 uEmitters[MAX_EMITTERS]; // xy=UV plane, z=radius, w=strength
uniform float uTime;
uniform float uAspect;        // width/height plane
uniform float uMaxReveal;     // plafon intensitas warna
uniform float uEdgeSoftness;  // feather lembut (§5 soft edge)
uniform float uRipple;        // amplitudo ripple tepi (hybrid §4)

varying vec2 vUv;

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// Organic shape + ripple movement (spec v2.0 §4 Hybrid fluid):
// organic menentukan bentuk utama, ripple memberi gelombang lembut
// pada BATAS mask — bukan refraksi pada foto.
float wobble(vec2 p, float seed) {
  return uRipple * (
       0.035 * sin(p.x * 9.0  + uTime * 1.3 + seed * 17.0)
     + 0.025 * sin(p.y * 11.0 - uTime * 0.9 + seed * 7.0)
     + 0.018 * sin((p.x + p.y) * 14.0 + uTime * 1.7 + seed * 23.0)
  );
}

void main() {
  // Sampling IDENTIK kedua layer → tidak ada face warping/liquify.
  vec3 bw    = texture2D(uBwTex, vUv).rgb;
  vec3 color = texture2D(uColorTex, vUv).rgb;

  float mask = 0.0;
  for (int i = 0; i < MAX_EMITTERS; i++) {
    vec4 em = uEmitters[i];
    if (em.w <= 0.001) continue;

    vec2 d = vUv - em.xy;
    d.x *= uAspect;                    // blob tetap bundar walau plane portrait
    float dist = length(d);

    float seed = float(i) * 0.37 + em.z * 3.0;
    float rEff = em.z + wobble(vUv * 2.0 + seed, seed) * (0.6 + 0.4 * em.w);

    float m = smoothstep(rEff, rEff - uEdgeSoftness, dist) * em.w;
    mask = smin(mask, m, 0.12);        // union lembut → cairan menyatu
  }

  mask = clamp(mask, 0.0, 1.0) * uMaxReveal;

  // Sheen translucent sangat subtle di inti mask (kesan gel, bukan filter)
  float sheen = smoothstep(0.55, 1.0, mask) * 0.05;

  gl_FragColor = vec4(mix(bw, color, mask) + sheen, 1.0);
}
`;
