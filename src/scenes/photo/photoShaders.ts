/* ============================================================
   photoShaders.ts — sumber GLSL untuk PhotoCanvas.
   Fragment = fluidMask.glsl (ditempatkan di src/shaders/photo/
   sebagai referensi; di-inline sebagai string agar Vite tidak
   butuh plugin .glsl). Vertex trivial: pass-through UV.
   Prinsip terkunci: TIDAK ada distorsi geometri — sampling UV
   identik untuk B&W dan COLOR; fluid hanya mask warna.
   ============================================================ */

export const PHOTO_VERTEX_SHADER = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const PHOTO_FRAGMENT_SHADER = /* glsl */ `
#define MAX_EMITTERS 8

uniform sampler2D uBwTex;
uniform sampler2D uColorTex;
uniform vec4 uEmitters[MAX_EMITTERS]; // xy=UV plane, z=radius, w=strength
uniform float uTime;
uniform float uAspect;        // width/height plane
uniform float uMaxReveal;     // plafon intensitas warna
uniform float uEdgeSoftness;  // ketebalan soft edge mask

varying vec2 vUv;

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float wobble(vec2 p, float seed) {
  return 0.035 * sin(p.x * 9.0 + uTime * 1.3 + seed * 17.0)
       + 0.025 * sin(p.y * 11.0 - uTime * 0.9 + seed * 7.0)
       + 0.018 * sin((p.x + p.y) * 14.0 + uTime * 1.7 + seed * 23.0);
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
