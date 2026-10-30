/* ============================================================
   FluidReveal — WebGL renderer untuk Photo Scene (spec v2.0 §7).

   Tanggung jawab:
   - Plane ortografik dua tekstur (B&W base + COLOR) dengan UV
     sampling IDENTIK → geometri foto tidak pernah berubah (§8).
   - Mask fluid dihitung di shader; posisi emitter dari FluidField.
   - Input pointer & ambient disuplai scene lewat hooks
     (usePointerPosition / useAmbientReveal) → mode eksternal field.

   Aturan teknis (§9 spec PHOTO):
   - requestAnimationFrame manual, HANYA saat `active`.
   - Tab tidak aktif → render berhenti (visibilitychange).
   - DPR dibatasi ≤ 2; reduced motion → reveal lebih lemah.
   - Cleanup penuh resource WebGL saat unmount.
   ============================================================ */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { FluidField, DEFAULT_FLUID_CONFIG } from '../../../systems/fluid/field';
import { FLUID_FRAGMENT_SHADER, FLUID_VERTEX_SHADER } from './FluidShader';

interface Props {
  bwSrc: string;
  colorSrc: string;
  active: boolean;
  paused?: boolean;
  reducedMotion: boolean;
  onReady?: () => void;
  onPhotoClick?: () => void;
  /** Ref ke objek field agar scene bisa feed pointer/ambient (dibuat oleh useFluidReveal). */
  fieldRef: React.MutableRefObject<FluidField | null>;
}

export default function FluidReveal({
  bwSrc, colorSrc, active, paused = false, reducedMotion,
  onReady, onPhotoClick, fieldRef,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  const pausedRef = useRef(paused);
  const hiddenRef = useRef(false);
  activeRef.current = active;
  pausedRef.current = paused;

  // Field dimiliki scene (useFluidReveal) — FluidReveal hanya merender.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const renderer = new THREE.WebGLRenderer({
      antialias: true, alpha: false, powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); // §9 resolusi menyesuaikan
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    camera.position.z = 1;

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
      uBwTex: { value: null },
      uColorTex: { value: null },
      uEmitters: { value: Array.from({ length: DEFAULT_FLUID_CONFIG.maxEmitters }, () => new THREE.Vector4(0, 0, 0, 0)) },
      uTime: { value: 0 },
      uAspect: { value: 1 },
      uMaxReveal: { value: reducedMotion ? 0.55 : 0.85 },
      uEdgeSoftness: { value: 0.16 },
      uRipple: { value: reducedMotion ? 0.4 : 1 },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: FLUID_VERTEX_SHADER,
      fragmentShader: FLUID_FRAGMENT_SHADER,
      uniforms,
    });
    const geometry = new THREE.PlaneGeometry(1, 1);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    let readyCount = 0;
    const onLoad = () => { if (++readyCount === 2 && !disposed) onReady?.(); };
    loader.load(bwSrc, (t) => { uniforms.uBwTex.value = texOpts(t); onLoad(); });
    loader.load(colorSrc, (t) => { uniforms.uColorTex.value = texOpts(t); onLoad(); });

    // ---- Layout plane mengikuti rasio foto asli, TANPA crop (§2) --------
    let imgW = 600, imgH = 750;
    const layout = () => {
      const vw = mount.clientWidth, vh = mount.clientHeight;
      // Proporsi v2.0 §3: width ~34–42vw, max 520px, centered.
      const targetW = Math.min(vw * 0.42, 520);
      const availH = vh * 0.72;
      let w = targetW, h = (w * imgH) / imgW;
      if (h > availH) { h = availH; w = (h * imgW) / imgH; }
      camera.left = -vw / 2; camera.right = vw / 2;
      camera.top = vh / 2; camera.bottom = -vh / 2;
      camera.updateProjectionMatrix();
      mesh.scale.set(w, h, 1);
      uniforms.uAspect.value = w / h;
      renderer.setSize(vw, vh);
    };
    // Rasio ikut aset asli begitu B&W ter-load (dummy 4:5, final bebas).
    loader.load(bwSrc, (t) => {
      imgW = t.image.width; imgH = t.image.height; layout();
    });
    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(mount);

    // Konversi koordinat layar → UV plane (dipakai scene via ref ini).
    (mount as HTMLElement & { __toPlaneUV?: (cx: number, cy: number) => { u: number; v: number; inside: boolean } }).__toPlaneUV =
      (clientX: number, clientY: number) => {
        const rect = mount.getBoundingClientRect();
        const cx = clientX - rect.left - rect.width / 2;
        const cy = clientY - rect.top - rect.height / 2;
        const w = mesh.scale.x, h = mesh.scale.y;
        const u = (cx + w / 2) / w;
        const v = 1 - (cy + h / 2) / h;
        const inside = u >= -0.08 && u <= 1.08 && v >= -0.08 && v <= 1.08;
        return { u, v, inside };
      };

    // Klik vs drag threshold kecil → PhotoBioModal
    let lastX = 0, lastY = 0;
    const onDown = (e: PointerEvent) => { lastX = e.clientX; lastY = e.clientY; };
    const onClick = (e: MouseEvent) => {
      if (!activeRef.current || pausedRef.current) return;
      if (Math.hypot(e.clientX - lastX, e.clientY - lastY) < 6) {
        const toUV = (mount as HTMLElement & { __toPlaneUV?: (x: number, y: number) => { inside: boolean } }).__toPlaneUV;
        if (toUV?.(e.clientX, e.clientY).inside) onPhotoClick?.();
      }
    };
    mount.addEventListener('pointerdown', onDown, { passive: true });
    mount.addEventListener('click', onClick);

    // ---- Render loop ------------------------------------------------------
    let raf = 0;
    let prevT = performance.now();
    const buf = new Float32Array(DEFAULT_FLUID_CONFIG.maxEmitters * 4);

    const onVisibility = () => { hiddenRef.current = document.hidden; }; // §9.4
    document.addEventListener('visibilitychange', onVisibility);

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = (now - prevT) / 1000;
      prevT = now;

      if (!activeRef.current || hiddenRef.current) return; // §9.2/§10: shader idle di luar scene/tab
      if (pausedRef.current) { renderer.render(scene, camera); return; } // modal: freeze tanpa reset

      const field = fieldRef.current;
      if (field) {
        field.update(dt, now / 1000);
        field.writeUniformBuffer(buf);
        const arr = uniforms.uEmitters.value as THREE.Vector4[];
        for (let i = 0; i < arr.length; i++) {
          const o = i * 4;
          arr[i].set(buf[o], buf[o + 1], buf[o + 2], buf[o + 3]);
        }
      }
      uniforms.uTime.value = now / 1000;
      renderer.render(scene, camera);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      mount.removeEventListener('pointerdown', onDown);
      mount.removeEventListener('click', onClick);
      geometry.dispose();
      material.dispose();
      (uniforms.uBwTex.value as THREE.Texture | null)?.dispose();
      (uniforms.uColorTex.value as THREE.Texture | null)?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="fluid-reveal" ref={mountRef} aria-hidden="true" />;
}
