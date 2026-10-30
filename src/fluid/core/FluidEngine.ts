/**
 * FluidEngine — orkestrator penuh pipeline Stable Fluids 2D (§13, §18).
 *
 * Pipeline per simulation step (§6):
 *   1 Splat velocity+dye → 2 Velocity advection → 3 Curl+Vorticity (opsional)
 *   → 4 Divergence → 5 Pressure Jacobi (N iterasi) → 6 Gradient subtract
 *   → 7 Dye advection → 8 Mask generator → 9 Composite foto.
 *
 * Siklus hidup (§13 & aturan master plan):
 * - start()/stop() dipanggil scene sesuai visibility Photo.
 * - Fixed timestep + accumulator, dibatasi maxStepsPerFrame (anti backlog).
 * - Idle sleep: tidak ada dye/velocity/input → steps dihentikan.
 * - Context loss: render dijeda, status dilaporkan ke React (fallback UI).
 * - dispose(): seluruh GPU resource & listener dibersihkan.
 *
 * Constraint keras: geometri plane foto TIDAK PERNAH berubah; dye hanya
 * menjadi mask warna (composite sampling UV identik).
 */
import * as THREE from 'three';
import { DEFAULT_FLUID_CONFIG, applyQuality, detectTier } from './FluidConfig';
import type { FluidConfig, QualityTier } from './FluidConfig';
import { probeCapabilities } from '../utils/capabilities';
import type { GpuCapabilities } from '../utils/capabilities';
import { RenderTargetManager } from './RenderTargetManager';
import {
  baseVertexShader,
  splatShader,
  advectionShader,
  divergenceShader,
  curlShader,
  vorticityShader,
  pressureShader,
  gradientSubtractShader,
  clearShader,
  maskShader,
  compositeShader,
} from '../shaders/shaders';

export interface FluidInputSample {
  /** uv relatif terhadap PLANE FOTO (0..1), bukan window (§11). */
  u: number;
  v: number;
  /** velocity dalam uv/detik (sudah dikonversi scene). */
  du: number;
  dv: number;
  /** 0..1 — kekuatan injeksi dye (tap vs drag vs ambient). */
  intensity: number;
  kind: 'pointer' | 'ambient';
}

export type EngineStatus = 'ok' | 'context-lost';

interface Pass {
  material: THREE.ShaderMaterial;
  mesh: THREE.Mesh;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export class FluidEngine {
  readonly config: FluidConfig;
  private renderer: THREE.WebGLRenderer;
  private caps: GpuCapabilities;
  private rtMan: RenderTargetManager;
  private quadScene = new THREE.Scene();
  private quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private passes = new Map<string, Pass>();

  /** Plane foto yang di-composite ke canvas utama. */
  private photoMesh!: THREE.Mesh;
  private photoMat!: THREE.ShaderMaterial;

  // state loop
  private raf = 0;
  private running = false;
  private paused = false;
  private lastTime = 0;
  private accumulator = 0;
  private timeSec = 0;
  private activityEnergy = 0; // untuk idle-sleep

  // input smoothing (§4: P_smooth += α(P_target − P_current))
  private smoothed = { u: 0.5, v: 0.5, du: 0, dv: 0 };
  private pendingSplats: FluidInputSample[] = [];

  // aspect plane foto (lebar/tinggi) — splat dibuat bulat secara visual
  private planeAspect = 3 / 4;

  status: EngineStatus = 'ok';
  onStatusChange?: (s: EngineStatus) => void;

  constructor(canvas: HTMLCanvasElement, opts?: { tier?: QualityTier; overrides?: Partial<FluidConfig> }) {
    this.config = { ...DEFAULT_FLUID_CONFIG, ...(opts?.overrides ?? {}) };
    const tier = opts?.tier ?? detectTier();
    Object.assign(this.config, applyQuality(this.config, tier));

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.renderer.autoClear = false;
    this.caps = probeCapabilities(this.renderer);
    this.rtMan = new RenderTargetManager(this.caps, this.config.simResolution, this.config.dyeResolution);

    this.buildPasses();
    this.buildPhotoPlane();
    this.bindContextLoss();
  }

  /* ── Setup ─────────────────────────────────────────── */

  private makePass(name: string, fragment: string, uniforms: Record<string, THREE.IUniform>): Pass {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('aPosition', new THREE.BufferAttribute(new Float32Array([-1, -1, 3, -1, -1, 3]), 2));
    const material = new THREE.ShaderMaterial({
      vertexShader: baseVertexShader,
      fragmentShader: fragment,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    this.quadScene.add(mesh);
    mesh.visible = false;
    const pass = { material, mesh };
    this.passes.set(name, pass);
    return pass;
  }

  private tex(t: THREE.Texture | null): THREE.IUniform {
    return { value: t ?? null };
  }

  private buildPasses() {
    const simTexel = new THREE.Vector2(1 / this.config.simResolution, 1 / this.config.simResolution);
    const dyeTexel = new THREE.Vector2(1 / this.config.dyeResolution, 1 / this.config.dyeResolution);

    this.makePass('splatVelocity', splatShader, {
      uTarget: this.tex(null), uPoint: { value: new THREE.Vector2() }, uRadius: { value: 0.05 },
      uValue: { value: new THREE.Vector2() }, uAspect: { value: 1 },
      uVelocity: this.tex(null), uSource: this.tex(null),
      uTexel: { value: simTexel.clone() }, uDt: { value: 0 }, uDissipation: { value: 1 },
    });
    this.makePass('splatDye', splatShader, {
      uTarget: this.tex(null), uPoint: { value: new THREE.Vector2() }, uRadius: { value: 0.05 },
      uValue: { value: new THREE.Vector2() }, uAspect: { value: 1 },
      uVelocity: this.tex(null), uSource: this.tex(null),
      uTexel: { value: dyeTexel.clone() }, uDt: { value: 0 }, uDissipation: { value: 1 },
    });
    this.makePass('advectVelocity', advectionShader, {
      uVelocity: this.tex(this.rtMan.velocity.read.texture), uSource: this.tex(this.rtMan.velocity.read.texture),
      uTexel: { value: simTexel.clone() }, uDt: { value: this.config.dt },
      uDissipation: { value: this.config.velocityDissipation },
      uVelocityScale: { value: new THREE.Vector2(1, 1) },
    });
    this.makePass('divergence', divergenceShader, {
      uVelocity: this.tex(this.rtMan.velocity.read.texture), uSource: this.tex(null),
      uTexel: { value: simTexel.clone() }, uDt: { value: 0 }, uDissipation: { value: 1 },
    });
    this.makePass('curl', curlShader, {
      uVelocity: this.tex(this.rtMan.velocity.read.texture), uSource: this.tex(null),
      uTexel: { value: simTexel.clone() }, uDt: { value: 0 }, uDissipation: { value: 1 },
    });
    this.makePass('vorticity', vorticityShader, {
      uVelocity: this.tex(this.rtMan.velocity.read.texture), uSource: this.tex(null),
      uCurl: this.tex(this.rtMan.curl.texture), uCurlStrength: { value: this.config.curlStrength },
      uTexel: { value: simTexel.clone() }, uDt: { value: this.config.dt }, uDissipation: { value: 1 },
    });
    this.makePass('pressure', pressureShader, {
      uVelocity: this.tex(this.rtMan.velocity.read.texture), uSource: this.tex(null),
      uPressure: this.tex(this.rtMan.pressure.read.texture), uDivergence: this.tex(this.rtMan.divergence.texture),
      uTexel: { value: simTexel.clone() }, uDt: { value: 0 }, uDissipation: { value: 1 },
    });
    this.makePass('gradientSubtract', gradientSubtractShader, {
      uVelocity: this.tex(this.rtMan.velocity.read.texture), uSource: this.tex(null),
      uPressure: this.tex(this.rtMan.pressure.read.texture),
      uTexel: { value: simTexel.clone() }, uDt: { value: 0 }, uDissipation: { value: 1 },
    });
    this.makePass('clearPressure', clearShader, {
      uField: this.tex(this.rtMan.pressure.read.texture), uClear: { value: 0.8 },
      uVelocity: this.tex(null), uSource: this.tex(null),
      uTexel: { value: simTexel.clone() }, uDt: { value: 0 }, uDissipation: { value: 1 },
    });
    this.makePass('advectDye', advectionShader, {
      uVelocity: this.tex(this.rtMan.velocity.read.texture), uSource: this.tex(this.rtMan.dye.read.texture),
      uTexel: { value: dyeTexel.clone() }, uDt: { value: this.config.dt },
      uDissipation: { value: this.config.dyeDissipation },
      uVelocityScale: { value: new THREE.Vector2(1, 1) },
    });
    this.makePass('mask', maskShader, {
      uDye: this.tex(this.rtMan.dye.read.texture),
      uThreshold: { value: this.config.maskThreshold }, uFeather: { value: this.config.maskFeather },
      uEdgeNoise: { value: this.config.edgeNoise }, uEdgeFlow: { value: this.config.edgeFlow },
      uTime: { value: 0 }, uMaxReveal: { value: this.config.maxReveal },
      uVelocity: this.tex(null), uSource: this.tex(null),
      uTexel: { value: dyeTexel.clone() }, uDt: { value: 0 }, uDissipation: { value: 1 },
    });
  }

  /** Plane foto: ortho camera menyesuaikan aspect agar rasio aset terjaga. */
  private buildPhotoPlane() {
    this.photoMat = new THREE.ShaderMaterial({
      vertexShader: `
        precision highp float;
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: compositeShader,
      uniforms: {
        uBaseImage: { value: null },
        uColorImage: { value: null },
        uFluidMask: { value: this.rtMan.mask.texture },
      },
      depthTest: false,
    });
    this.photoMesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), this.photoMat);
    this.photoMesh.frustumCulled = false;
  }

  private bindContextLoss() {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.status = 'context-lost';
      this.stop();
      this.onStatusChange?.('context-lost');
    });
    canvas.addEventListener('webglcontextrestored', () => {
      // V1: engine dibangun ulang oleh React (bukan hot-resume) — cukup stabil.
      this.onStatusChange?.('ok');
    });
  }

  /* ── Public API (dipakai FluidReveal.tsx) ──────────── */

  setPhotos(base: THREE.Texture, color: THREE.Texture) {
    this.photoMat.uniforms.uBaseImage.value = base;
    this.photoMat.uniforms.uColorImage.value = color;
  }

  /** Aspek plane foto (w/h) — menjaga splat tetap membulat secara visual. */
  setPlaneAspect(aspect: number) {
    this.planeAspect = aspect;
  }

  /** Mengirim satu sample input (hasil konversi koordinat scene). */
  enqueue(s: FluidInputSample) {
    if (!this.running || this.paused) return;
    // velocity clamp (§4) — gerakan cepat tidak membuat mask liar
    const mag = Math.hypot(s.du, s.dv);
    const k = mag > this.config.maxSpeed ? this.config.maxSpeed / mag : 1;
    this.pendingSplats.push({ ...s, du: s.du * k, dv: s.dv * k });
    this.activityEnergy = 1; // bangunkan dari idle-sleep
  }

  resize(cssW: number, cssH: number, dpr: number) {
    const d = Math.min(dpr, 2); // DPR dibatasi (§10)
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(Math.floor(cssW * d), Math.floor(cssH * d), false);
    // ortho: tinggi dunia = 1, lebar = aspect viewport → letterbox simetris
    const aspect = Math.max(cssW / Math.max(cssH, 1), 0.0001);
    this.quadCam.left = -aspect / 2; this.quadCam.right = aspect / 2;
    this.quadCam.top = 0.5; this.quadCam.bottom = -0.5;
    this.quadCam.updateProjectionMatrix();
    // center-fit plane foto: tinggi ≤ 1, lebar = tinggi × aspek foto
    const h = aspect > this.planeAspect ? 1 : aspect / this.planeAspect;
    this.photoMesh.scale.set(h * this.planeAspect, h, 1);
    if (!this.quadScene.children.includes(this.photoMesh)) this.quadScene.add(this.photoMesh);
    this.photoMesh.visible = true;
  }

  /** Aspek plane saat ini (dipakai konversi koordinat scene). */
  planeAspectValue() { return this.planeAspect; }

  /** Status freeze untuk input baru (modal terbuka). */
  pausedForInput() { return this.paused; }

  start() {
    if (this.running || this.status === 'context-lost') return;
    this.running = true;
    this.lastTime = performance.now();
    const loop = (now: number) => {
      if (!this.running) return;
      this.frame(now);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  /** Freeze tanpa reset state (modal terbuka — §13 modal mempertahankan scene). */
  setPaused(p: boolean) {
    this.paused = p;
  }

  isSleeping() {
    return this.activityEnergy < this.config.sleepEpsilon && this.pendingSplats.length === 0;
  }

  dispose() {
    this.stop();
    for (const p of this.passes.values()) {
      p.material.dispose();
      p.mesh.geometry.dispose();
    }
    this.passes.clear();
    this.photoMat.dispose();
    this.photoMesh.geometry.dispose();
    this.rtMan.dispose();
    this.renderer.dispose();
  }

  /* ── Loop internals ────────────────────────────────── */

  private frame(now: number) {
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    dt = clamp(dt, 0, 0.1); // tab-switch / lag spike protection
    this.timeSec += dt;

    if (!this.paused) {
      // fixed timestep + accumulator, dibatasi (§6)
      this.accumulator += dt;
      let steps = 0;
      while (this.accumulator >= this.config.dt && steps < this.config.maxStepsPerFrame) {
        if (!this.isSleeping()) this.simulateStep(this.config.dt);
        this.accumulator -= this.config.dt;
        steps++;
      }
      if (steps === this.config.maxStepsPerFrame) this.accumulator = 0; // buang backlog
      this.applyPendingSplats();
      this.pendingSplats.length = 0;
      // peluruhan energi aktivitas → idle sleep setelah ~2 detik sepi
      this.activityEnergy *= Math.pow(0.35, dt);
    }

    this.renderComposite();
  }

  /** Konsumsi sample input → splat velocity + dye dengan smoothing pointer. */
  private applyPendingSplats() {
    for (const s of this.pendingSplats) {
      if (s.kind === 'pointer') {
        this.smoothed.u += (s.u - this.smoothed.u) * this.config.smoothing;
        this.smoothed.v += (s.v - this.smoothed.v) * this.config.smoothing;
        this.smoothed.du = s.du;
        this.smoothed.dv = s.dv;
      }
      const radius =
        this.config.splatRadius * (s.kind === 'ambient' ? this.config.ambientSplatScale : 1);
      const dyeAmt = (s.kind === 'ambient' ? this.config.ambientDyeAmount : this.config.dyeAmount) * s.intensity;

      // Force dorongan searah gerak (velocity uv/detik → skala dunia simulasi)
      const fx = s.du * this.config.pointerForce * s.intensity * 0.004;
      const fy = s.dv * this.config.pointerForce * s.intensity * 0.004;
      this.splat('splatVelocity', this.rtMan.velocity, new THREE.Vector2(fx, fy), s.u, s.v, radius, this.planeAspect);
      this.splat('splatDye', this.rtMan.dye, new THREE.Vector2(clamp(dyeAmt, 0, 1), 0), s.u, s.v, radius, this.planeAspect);
    }
  }

  private splat(passName: string, fbo: { read: THREE.WebGLRenderTarget; write: THREE.WebGLRenderTarget; swap(): void }, value: THREE.Vector2, u: number, v: number, radius: number, aspect: number) {
    const p = this.passes.get(passName)!;
    const U = p.material.uniforms;
    U.uTarget.value = fbo.read.texture;
    U.uPoint.value.set(u, v);
    U.uRadius.value = radius;
    U.uValue.value.copy(value);
    U.uAspect.value = aspect;
    this.blit(p, fbo.write);
    fbo.swap();
  }

  private simulateStep(dt: number) {
    const cfg = this.config;
    const vel = this.rtMan.velocity;
    const dye = this.rtMan.dye;
    const pre = this.rtMan.pressure;

    // 2 · Velocity advection
    let p = this.passes.get('advectVelocity')!;
    p.material.uniforms.uVelocity.value = vel.read.texture;
    p.material.uniforms.uSource.value = vel.read.texture;
    p.material.uniforms.uDt.value = dt;
    this.blit(p, vel.write); vel.swap();

    // 3 · Curl + vorticity confinement (kekuatan rendah)
    if (cfg.curlStrength > 0) {
      p = this.passes.get('curl')!;
      p.material.uniforms.uVelocity.value = vel.read.texture;
      this.blit(p, this.rtMan.curl);

      p = this.passes.get('vorticity')!;
      p.material.uniforms.uVelocity.value = vel.read.texture;
      p.material.uniforms.uCurl.value = this.rtMan.curl.texture;
      p.material.uniforms.uCurlStrength.value = cfg.curlStrength;
      p.material.uniforms.uDt.value = dt;
      this.blit(p, vel.write); vel.swap();
    }

    // 4 · Divergence
    p = this.passes.get('divergence')!;
    p.material.uniforms.uVelocity.value = vel.read.texture;
    this.blit(p, this.rtMan.divergence);

    // 4b · Pressure decay sebelum iterasi
    p = this.passes.get('clearPressure')!;
    p.material.uniforms.uField.value = pre.read.texture;
    this.blit(p, pre.write); pre.swap();

    // 5 · Pressure Jacobi iterations
    p = this.passes.get('pressure')!;
    for (let i = 0; i < cfg.pressureIterations; i++) {
      p.material.uniforms.uPressure.value = pre.read.texture;
      p.material.uniforms.uDivergence.value = this.rtMan.divergence.texture;
      this.blit(p, pre.write); pre.swap();
    }

    // 6 · Projection (gradient subtraction)
    p = this.passes.get('gradientSubtract')!;
    p.material.uniforms.uVelocity.value = vel.read.texture;
    p.material.uniforms.uPressure.value = pre.read.texture;
    this.blit(p, vel.write); vel.swap();

    // 7 · Dye advection (+ dissipation bawaan)
    p = this.passes.get('advectDye')!;
    p.material.uniforms.uVelocity.value = vel.read.texture;
    p.material.uniforms.uSource.value = dye.read.texture;
    p.material.uniforms.uDt.value = dt;
    this.blit(p, dye.write); dye.swap();

    // 8 · Mask generation
    p = this.passes.get('mask')!;
    p.material.uniforms.uDye.value = dye.read.texture;
    p.material.uniforms.uTime.value = this.timeSec;
    this.blit(p, this.rtMan.mask);
  }

  /** Render pass kecil ke target FBO. */
  private blit(pass: Pass, target: THREE.WebGLRenderTarget) {
    pass.mesh.visible = true;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.quadScene, this.quadCam);
    this.renderer.setRenderTarget(null);
    pass.mesh.visible = false;
  }

  /** Frame akhir: foto BW+Color dibuka mask fluid → layar. */
  private renderComposite() {
    this.renderer.setRenderTarget(null);
    this.renderer.clear(true, false, false);
    this.renderer.render(this.quadScene, this.quadCam);
  }
}
