/* ============================================================
   PHOTO CANVAS — plane WebGL dua tekstur + fluid mask shader.

   §2 larangan desain: TIDAK ada distorsi geometri. Kedua tekstur
   disample dengan UV yang sama; fluid hanya mengubah mask warna.

   Fallback (§10): bila WebGL tidak tersedia, scene merender <img>
   B&W biasa (fallback DOM ada di PhotoScene). Shader error → onReady
   tidak dipanggil & PhotoScene tetap menampilkan fallback.

   Fluid berhenti total ketika `active=false` (§10): RAF dihentikan,
   field disuspend, pointer dilepas.
   ============================================================ */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { FluidField, DEFAULT_FLUID_CONFIG } from '../../systems/fluid/field';
import { PHOTO_FRAGMENT_SHADER, PHOTO_VERTEX_SHADER } from './photoShaders';

interface Props {
  bwSrc: string;
  colorSrc: string;
  /** Photo aktif (fluid hidup) atau tidak (fluid mati total). */
  active: boolean;
  /** Modal terbuka → pause input & render loop hemat GPU, state dijaga. */
  paused?: boolean;
  reducedMotion: boolean;
  onReady?: () => void;
  /** Klik pada area foto → PhotoBioModal (diaktifkan Tahap selanjutnya). */
  onPhotoClick?: () => void;
}

export default function PhotoCanvas({ bwSrc, colorSrc, active, paused = false, reducedMotion, onReady, onPhotoClick }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  const pausedRef = useRef(paused);
  const fieldRef = useRef<FluidField | null>(null);
  activeRef.current = active;
  pausedRef.current = paused;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ---- Renderer / scene / camera --------------------------------------
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    // §10: batasi DPR
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

    // ---- Tekstur ----------------------------------------------------------
    const loader = new THREE.TextureLoader();
    let disposed = false;
    const texOpts = (t: THREE.Texture) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.generateMipmaps = true;
      return t;
    };

    const uniforms: Record<string, THREE.IUniform> = {
      uBwTex:     { value: null },
      uColorTex:  { value: null },
      uEmitters:  { value: Array.from({ length: DEFAULT_FLUID_CONFIG.maxEmitters }, () => new THREE.Vector4(0, 0, 0, 0)) },
      uTime:      { value: 0 },
      uAspect:    { value: 1 },
      uMaxReveal: { value: reducedMotion ? 0.55 : 0.85 },
      uEdgeSoftness: { value: 0.16 },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: PHOTO_VERTEX_SHADER,
      fragmentShader: PHOTO_FRAGMENT_SHADER,
      uniforms,
    });
    const geometry = new THREE.PlaneGeometry(1, 1);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let readyCount = 0;
    const onLoad = () => {
      if (++readyCount === 2 && !disposed) onReady?.();
    };
    loader.load(bwSrc, (t) => { uniforms.uBwTex.value = texOpts(t); onLoad(); });
    loader.load(colorSrc, (t) => { uniforms.uColorTex.value = texOpts(t); onLoad(); });

    // ---- Layout plane mengikuti rasio foto (tanpa crop) ------------------
    const IMG_W = 600, IMG_H = 750; // rasio aset dummy; diganti dari natural size saat load final
    const layout = () => {
      const vw = mount.clientWidth, vh = mount.clientHeight;
      const availH = vh * 0.78, availW = Math.min(vw * 0.86, 900);
      const scale = Math.min(availW / IMG_W, availH / IMG_H);
      const w = IMG_W * scale, h = IMG_H * scale;
      camera.left = -vw / 2; camera.right = vw / 2;
      camera.top = vh / 2; camera.bottom = -vh / 2;
      camera.updateProjectionMatrix();
      mesh.scale.set(w, h, 1);
      uniforms.uAspect.value = w / h;
      renderer.setSize(vw, vh);
    };
    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(mount);

    // ---- Fluid field + pointer -------------------------------------------
    const field = new FluidField(reducedMotion ? { autoMinDelay: 9, autoMaxDelay: 16 } : {});
    fieldRef.current = field;
    let lastX = 0, lastY = 0;

    const toPlaneUV = (clientX: number, clientY: number) => {
      const rect = mount.getBoundingClientRect();
      const cx = clientX - rect.left - rect.width / 2;
      const cy = clientY - rect.top - rect.height / 2;
      const w = mesh.scale.x, h = mesh.scale.y;
      const u = (cx + w / 2) / w;          // 0..1 pada plane
      const v = 1 - (cy + h / 2) / h;      // flip Y untuk UV shader
      const inside = u >= -0.08 && u <= 1.08 && v >= -0.08 && v <= 1.08;
      return { u, v, inside };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!activeRef.current || pausedRef.current) return;
      const { u, v, inside } = toPlaneUV(e.clientX, e.clientY);
      field.setPointer(u, v, inside, performance.now() / 1000);
      lastX = e.clientX; lastY = e.clientY;
    };
    const onPointerLeave = () => field.setPointer(0.5, 0.5, false, performance.now() / 1000);

    mount.addEventListener('pointermove', onPointerMove);
    mount.addEventListener('pointerleave', onPointerLeave);

    // Klik vs drag sederhana (threshold kecil) → onPhotoClick
    const onClick = (e: MouseEvent) => {
      if (!activeRef.current || pausedRef.current) return;
      if (Math.hypot(e.clientX - lastX, e.clientY - lastY) < 6) {
        const { inside } = toPlaneUV(e.clientX, e.clientY);
        if (inside) onPhotoClick?.();
      }
    };
    mount.addEventListener('click', onClick);

    // ---- Render loop (RAF manual, HANYA saat photo aktif) -----------------
    let raf = 0;
    let prevT = performance.now();
    const buf = new Float32Array(DEFAULT_FLUID_CONFIG.maxEmitters * 4);

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = (now - prevT) / 1000;
      prevT = now;

      if (!activeRef.current) return;           // fluid mati total di luar scene
      if (pausedRef.current) { renderer.render(scene, camera); return; } // modal: freeze, jangan reset

      field.update(dt, now / 1000);
      field.writeUniformBuffer(buf);
      const arr = uniforms.uEmitters.value as THREE.Vector4[];
      for (let i = 0; i < arr.length; i++) {
        const o = i * 4;
        arr[i].set(buf[o], buf[o + 1], buf[o + 2], buf[o + 3]);
      }
      uniforms.uTime.value = now / 1000;
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    // ---- Cleanup penuh resource WebGL (§10) --------------------------------
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      mount.removeEventListener('pointermove', onPointerMove);
      mount.removeEventListener('pointerleave', onPointerLeave);
      mount.removeEventListener('click', onClick);
      field.suspend();
      field.dispose();
      geometry.dispose();
      material.dispose();
      (uniforms.uBwTex.value as THREE.Texture | null)?.dispose();
      (uniforms.uColorTex.value as THREE.Texture | null)?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fluid berhenti total saat meninggalkan Photo Scene (§10):
  // suspend energi pointer; RAF tetap ada tapi tick early-return.
  useEffect(() => {
    if (!active) {
      const f = fieldRef.current;
      f?.suspend();
    }
  }, [active]);

  return <div className="photo-canvas" ref={mountRef} aria-hidden="true" />;
}
