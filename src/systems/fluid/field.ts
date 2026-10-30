/* ============================================================
   FLUID FIELD SYSTEM (Tahap 4) — inti logika "cairan" Photo Scene.

   BUKAN simulasi Navier-Stokes penuh (itu Tahap 5 dengan ping-pong
   FBO). Field ini adalah representasi CPU ringan yang kompatibel:
   - Kumpulan "emitter" organik (maks maxEmitters), masing-masing =
     blob dengan posisi, velocity, radius hidup/susut, fase noise.
   - Pointer → inertia (lerp halus, TIDAK menempel kaku). Kecepatan
     pointer menentukan karakter: lambat = blob kecil, cepat = jejak
     lebih besar/memanjang (karakter ribbon disempurnakan Tahap 5).
   - Autonomous reveal: scheduler menyalakan emitter virtual dengan
     interval bervariasi, terutama horizontal (§4 master plan).
   - Decay: semua energi menghilang perlahan → foto kembali B&W (§2.4D).

   Output: Float32Array [x,y,r,s] * N koordinat UV pada plane foto,
   siap dibaca photo shader via uniform array. Arah dependensi tetap:
   UI → Scene → System → Shader.
   ============================================================ */

export interface FluidConfig {
  /** Maksimal emitter aktif yang bisa dirender shader sekaligus. */
  maxEmitters: number;
  /** Faktor smoothing pointer per detik (inertia). Lebih kecil = lebih liyar. */
  pointerSmoothing: number;
  /** Radius dasar reveal (relatif tinggi plane, 0..1). */
  baseRadius: number;
  /** Penguat: seberapa besar kecepatan pointer memperbesar jejak. */
  speedGain: number;
  /** Laju penyusutan radius per detik ketika tidak diberi energi. */
  decayRate: number;
  /** Interval minimum antar autonomous reveal (detik). */
  autoMinDelay: number;
  /** Interval maksimum antar autonomous reveal (detik). */
  autoMaxDelay: number;
}

export const DEFAULT_FLUID_CONFIG: FluidConfig = {
  maxEmitters: 8,
  pointerSmoothing: 6,
  baseRadius: 0.16,
  speedGain: 0.9,
  decayRate: 1.35,
  autoMinDelay: 5,
  autoMaxDelay: 11,
};

interface Emitter {
  x: number; y: number;      // posisi UV pada plane foto
  vx: number; vy: number;    // velocity (arah "aliran")
  r: number;                 // radius saat ini
  targetR: number;           // radius sasaran sebelum susut
  s: number;                 // intensitas 0..1
  phase: number;             // offset noise tiap emitter (batas organik)
  life: number;              // sisa hidup detik (-1 = selama disuplai)
  source: 'pointer' | 'auto';
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export class FluidField {
  private emitters: Emitter[] = [];
  private cfg: FluidConfig;

  // State pointer (raw + smoothed untuk inertia)
  private px = 0.5; private py = 0.5;
  private sx = 0.5; private sy = 0.5;
  private pvx = 0; private pvy = 0;
  private lastMoveT = -10;
  private insidePhoto = false;
  /** Penguat karakter dari kecepatan pointer px/detik (mode eksternal). */
  private speedBoost = 0;
  // Scheduler autonomous
  private nextAutoAt = 0;
  private rngSeed = 123456789;

  /** true bila scene menyuplai pointer/ambient dari luar (mode eksternal,
   *  dipakai FluidReveal + hooks usePointerPosition/useAmbientReveal). */
  externalPointer = false;

  constructor(cfg: Partial<FluidConfig> = {}) {
    this.cfg = { ...DEFAULT_FLUID_CONFIG, ...cfg };
    this.nextAutoAt = this.rand(this.cfg.autoMinDelay, this.cfg.autoMinDelay + 3);
  }

  /** Suplai manual dari scene (mode eksternal): satu sample pointer. */
  feedPointer(u: number, v: number, speedPx: number, inside: boolean, nowSec: number) {
    this.externalPointer = true;
    if (inside && (!this.insidePhoto || u !== this.px || v !== this.py)) {
      const dt = Math.max(nowSec - this.lastMoveT, 1e-4);
      // Velocity UV/detik + penguat kecepatan px/detik → karakter
      // lambat=blob kecil, cepat=jejak lebih besar (spec §4B).
      const uvSpeedBoost = clamp(speedPx / 900, 0, 1.6);
      this.pvx = this.pvx * 0.7 + ((u - this.px) / dt) * 0.3;
      this.pvy = this.pvy * 0.7 + ((v - this.py) / dt) * 0.3;
      this.speedBoost = this.speedBoost * 0.6 + uvSpeedBoost * 0.4;
      this.lastMoveT = nowSec;
    }
    this.px = u; this.py = v;
    this.insidePhoto = inside;
    if (inside) {
      const speed = Math.hypot(this.pvx, this.pvy) * 0.5 + this.speedBoost * 0.5;
      this.spawnOrFeed(
        u, v, clamp(speed, 0, 2), 'pointer',
        this.pvx, this.pvy,
      );
    } else {
      this.speedBoost *= 0.9;
    }
  }

  /** Suplai manual ambient event dari scene (mode eksternal). */
  feedAmbient(x: number, y: number, dirX: number, dirY: number, strength: number) {
    const e: Emitter = {
      x, y,
      vx: dirX * 0.28, vy: dirY * 0.28, // lebih lambat dari interaksi pointer (§4)
      r: this.cfg.baseRadius * 0.5, targetR: this.cfg.baseRadius * 0.8,
      s: 0.35 * strength + 0.1, phase: Math.random() * 10, life: 2.6 + strength, source: 'auto',
    };
    if (this.emitters.length >= this.cfg.maxEmitters) this.emitters.shift();
    this.emitters.push(e);
  }

  setConfig(patch: Partial<FluidConfig>) {
    this.cfg = { ...this.cfg, ...patch };
  }

  /** Random deterministik ringan (xorshift) agar mudah direproduksi. */
  private rand(min: number, max: number): number {
    this.rngSeed ^= this.rngSeed << 13;
    this.rngSeed ^= this.rngSeed >>> 17;
    this.rngSeed ^= this.rngSeed << 5;
    const r = Math.abs(this.rngSeed % 10000) / 10000;
    return min + (max - min) * r;
  }

  /** Input pointer mentah; koordinat sudah dinormalisasi terhadap plane foto (UV). */
  setPointer(u: number, v: number, inside: boolean, nowSec: number) {
    if (inside && (!this.insidePhoto || u !== this.px || v !== this.py)) {
      const dt = Math.max(nowSec - this.lastMoveT, 1e-4);
      const dx = u - this.px, dy = v - this.py;
      this.pvx = this.pvx * 0.7 + (dx / dt) * 0.3;
      this.pvy = this.pvy * 0.7 + (dy / dt) * 0.3;
      this.lastMoveT = nowSec;
    }
    this.px = u; this.py = v;
    this.insidePhoto = inside;
  }

  /** Fluid berhenti total di luar Photo Scene (§10) — pangkas energi pointer. */
  suspend() {
    this.insidePhoto = false;
    for (const e of this.emitters) if (e.source === 'pointer') e.life = 0;
  }

  private spawnOrFeed(x: number, y: number, speed: number, source: 'pointer' | 'auto', dirX = 0, dirY = 0) {
    // Gabung ke emitter terdekat dengan sumber sama → membentuk jejak, bukan titik baru tiap frame
    let e = this.emitters.find(
      (em) =>
        em.source === source &&
        em.s > 0.05 &&
        Math.hypot(em.x - x, em.y - y) < this.cfg.baseRadius * 0.9,
    );
    if (!e) {
      if (this.emitters.length >= this.cfg.maxEmitters) {
        e = this.emitters.reduce((a, b) => (a.s < b.s ? a : b)); // reuse paling lemah
      } else {
        e = { x, y, vx: 0, vy: 0, r: 0.001, targetR: 0, s: 0, phase: Math.random() * 10, life: -1, source };
        this.emitters.push(e);
      }
    }
    // Inertia: dekati sasaran secara halus, jangan teleport
    e.x += (x - e.x) * 0.35;
    e.y += (y - e.y) * 0.35;
    e.vx = e.vx * 0.6 + dirX * 0.4;
    e.vy = e.vy * 0.6 + dirY * 0.4;

    const boost = clamp(speed * this.cfg.speedGain, 0, 1);
    e.targetR = this.cfg.baseRadius * (0.75 + boost * 0.9);
    e.s = clamp(Math.max(e.s, 0.55 + boost * 0.45), 0, 1);
    if (e.life >= 0) e.life = -1; // disuplai ulang
  }

  /** Satu langkah simulasi. Dipanggil RAF scene — HANYA saat Photo aktif. */
  update(dt: number, nowSec: number) {
    dt = clamp(dt, 0, 0.05);

    // --- Pointer → emitter dengan smoothing eksplisit (inertia)
    const k = 1 - Math.exp(-this.cfg.pointerSmoothing * dt);
    this.sx += (this.px - this.sx) * k;
    this.sy += (this.py - this.sy) * k;

    if (this.insidePhoto && !this.externalPointer) {
      const speed = Math.hypot(this.pvx, this.pvy);
      this.spawnOrFeed(
        this.sx, this.sy, clamp(speed, 0, 2) * 0.5, 'pointer',
        speed > 0.01 ? this.pvx / (speed + 1e-6) : 0,
        speed > 0.01 ? this.pvy / (speed + 1e-6) : 0,
      );
      const vd = Math.exp(-3 * dt); // velocity meluruh bila diam
      this.pvx *= vd; this.pvy *= vd;
    }

    // --- Autonomous reveal internal (§4C): hanya dipakai bila scene
    // TIDAK menyuplai pointer eksternal (`externalPointer=true`, mis.
    // FluidReveal yang punya useAmbientReveal sendiri — spec v2.0 §8).
    if (!this.externalPointer && nowSec >= this.nextAutoAt) {
      const horizontal = Math.random() < 0.8;
      const startX = horizontal ? (Math.random() < 0.5 ? -0.05 : 1.05) : Math.random();
      const startY = horizontal ? clamp(this.rand(0.25, 0.75), 0, 1) : (Math.random() < 0.5 ? -0.05 : 1.05);
      const dirX = horizontal ? (startX < 0 ? 1 : -1) : 0;
      const dirY = horizontal ? this.rand(-0.15, 0.15) : (startY < 0 ? 1 : -1);
      const e: Emitter = {
        x: startX, y: startY,
        vx: dirX * 0.35, vy: dirY * 0.35,
        r: this.cfg.baseRadius * 0.6, targetR: this.cfg.baseRadius * 0.85,
        s: 0.42, phase: Math.random() * 10, life: this.rand(2.2, 3.6), source: 'auto',
      };
      if (this.emitters.length >= this.cfg.maxEmitters) this.emitters.shift();
      this.emitters.push(e);
      this.nextAutoAt = nowSec + this.rand(this.cfg.autoMinDelay, this.cfg.autoMaxDelay);
    }

    // --- Integrasi & decay
    for (let i = this.emitters.length - 1; i >= 0; i--) {
      const e = this.emitters[i];

      e.x = clamp(e.x + e.vx * dt * 0.35, -0.1, 1.1);
      e.y = clamp(e.y + e.vy * dt * 0.35, -0.1, 1.1);
      const drag = Math.exp(-1.4 * dt);
      e.vx *= drag; e.vy *= drag;

      // Pointer keluar area → hitungan mundur singkat lalu susut (return-to-B&W halus)
      if (e.life < 0 && e.source === 'pointer' && !this.insidePhoto) e.life = 1.2;
      // Mode eksternal: pointer statis > ~0.6s diperlakukan "keluar"
      // → STATE 05 Return (mask memudar, tidak langsung hilang).
      if (e.life < 0 && e.source === 'pointer' && this.externalPointer && nowSec - this.lastMoveT > 0.6) e.life = 1.2;
      if (e.life > 0) { e.life -= dt; if (e.life <= 0) e.targetR = 0; }

      if (e.r < e.targetR) e.r += (e.targetR - e.r) * (1 - Math.exp(-5 * dt));
      else e.r -= this.cfg.decayRate * e.r * dt * 1.1;

      const fade = e.targetR > 0.001 ? 1 : 0;
      e.s += (fade * (e.life < 0 ? 1 : clamp(e.life, 0, 1)) - e.s) * (1 - Math.exp(-(e.s > 0.2 ? 1.6 : 3) * dt));

      if (e.r <= 0.004 && e.s <= 0.02) this.emitters.splice(i, 1);
    }
  }

  /** Isi buffer uniform shader: [x,y,r,strength] * maxEmitters. Return jumlah aktif. */
  writeUniformBuffer(out: Float32Array) {
    out.fill(0);
    const n = Math.min(this.emitters.length, this.cfg.maxEmitters);
    for (let i = 0; i < n; i++) {
      const e = this.emitters[i];
      const o = i * 4;
      out[o] = e.x;
      out[o + 1] = e.y;
      out[o + 2] = e.r;
      out[o + 3] = e.s;
    }
    return n;
  }

  get activeEnergy(): number {
    return this.emitters.reduce((a, e) => a + e.s * e.r, 0);
  }

  dispose() {
    this.emitters.length = 0;
  }
}
