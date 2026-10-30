/* ============================================================
   PHOTO SHADER — monochrome-to-color fluid mask (Tahap 4 v1)

   Prinsip yang dikunci (§2 spec PHOTO + akumulasi aturan user):
   - TIDAK ada face warping / liquify / distorsi geometri.
     UV sampling kedua tekstur SELALU identik → bentuk foto utuh.
   - Fluid HANYA menentukan mask: berapa banyak warna asli
     (uColorTex) yang ter-blend di atas base B&W (uBwTex).
   - Tepi mask organik (noise wobble) + soft edge (smoothstep),
     bukan lingkaran radial CSS.
   - Intensitas global dibatasi (uMaxReveal) → warna tidak dominan.

   Mask = union halus dari emitter field (uEmitters: x,y,r,s per slot).
   Tahap 5 akan mengganti input field dengan density texture hasil
   simulasi ping-pong; interface shader dibuat kompatibel.
   ============================================================ */

#define MAX_EMITTERS 8

uniform sampler2D uBwTex;      // Layer 01 — base monochrome
uniform sampler2D uColorTex;   // Layer 02 — foto berwarna, koordinat sama
uniform vec4 uEmitters[MAX_EMITTERS]; // xy = UV plane, z = radius, w = strength
uniform float uTime;           // detik — untuk noise organik
uniform float uAspect;         // width/height plane (koreksi bentuk blob)
uniform float uMaxReveal;      // plafon intensitas warna (0..1)
uniform float uEdgeSoftness;   // ketebalan transisi tepi mask

varying vec2 vUv;

/** Union "cair": smooth-max antar blob supaya menyatu seperti gel. */
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

/** Wobble murah dua frekuensi → batas tidak simetris sempurna. */
float wobble(vec2 p, float seed) {
  return 0.035 * sin(p.x * 9.0 + uTime * 1.3 + seed * 17.0)
       + 0.025 * sin(p.y * 11.0 - uTime * 0.9 + seed * 7.0)
       + 0.018 * sin((p.x + p.y) * 14.0 + uTime * 1.7 + seed * 23.0);
}

void main() {
  // Sampling IDENTIK untuk kedua layer — tidak ada offset UV apa pun.
  vec3 bw    = texture2D(uBwTex, vUv).rgb;
  vec3 color = texture2D(uColorTex, vUv).rgb;

  vec2 uv = vUv;
  float mask = 0.0;

  for (int i = 0; i < MAX_EMITTERS; i++) {
    vec4 em = uEmitters[i];
    if (em.w <= 0.001) continue;

    // Koreksi aspect agar blob tidak lonjong mengikuti rasio foto
    vec2 d = uv - em.xy;
    d.x *= uAspect;

    // Jarak radial dinormalisasi tinggi-plane
    float dist = length(d);

    // Radius efektif bergelombang organik (bukan lingkaran kaku)
    float seed = float(i) * 0.37 + em.z * 3.0;
    float rEff = em.z + wobble(uv * 2.0 + seed, seed) * (0.6 + 0.4 * em.w);

    // Blob → kontribusi mask dengan soft edge
    float m = smoothstep(rEff, rEff - uEdgeSoftness, dist) * em.w;
    mask = smin(mask, m, 0.12); // union lembut antar blob (kesan cairan menyatu)
  }

  mask = clamp(mask, 0.0, 1.0) * uMaxReveal;

  // Sedikit "gel sheen" translucent: brightening halus di inti mask,
  // sangat subtle supaya tidak terasa seperti filter.
  float sheen = smoothstep(0.55, 1.0, mask) * 0.05;

  vec3 outc = mix(bw, color, mask) + sheen;

  gl_FragColor = vec4(outc, 1.0);
}
