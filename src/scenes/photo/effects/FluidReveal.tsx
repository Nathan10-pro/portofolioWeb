/* ============================================================
   FluidReveal — WebGL renderer Photo Scene (Fluid Engine v1.0).

   Sekarang hanya "shell" React (§13): membuat FluidEngine,
   memuat dua tekstur foto, meneruskan lifecycle (active/paused/
   visibility), dan mengekspos konversi koordinat layar→UV plane
   (`__toPlaneUV`) untuk dipakai scene. Seluruh simulasi Stable
   Fluids 2D hidup di src/fluid/core/FluidEngine.ts.

   Aturan teknis yang dipertahankan:
   - rAF manual; render berhenti saat tab tidak aktif / scene nonaktif.
   - DPR dibatasi ≤ 2 (di dalam engine.resize).
   - Modal terbuka → setPaused (freeze TANPA reset state §13 master plan).
   - Cleanup penuh GPU resource saat unmount.
   - Context loss → fallback CSS mask mengambil alih.
   ============================================================ */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { FluidEngine } from '../../../fluid/core/FluidEngine';
import type { FluidInputSample, EngineStatus } from '../../../fluid/core/FluidEngine';

export type { FluidInputSample };

interface Props {
  bwSrc: string;
  colorSrc: string;
  active: boolean;
  paused?: boolean;
  reducedMotion: boolean;
  onReady?: () => void;
  onPhotoClick?: () => void;
  /** Engine diekspos ke scene untuk enqueue input pointer/ambient. */
  engineRef: React.MutableRefObject<FluidEngine | null>;
  onContextLost?: () => void;
}

export default function FluidReveal({
  bwSrc, colorSrc, active, paused = false, reducedMotion,
  onReady, onPhotoClick, engineRef, onContextLost,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  const pausedRef = useRef(paused);
  activeRef.current = active;
  pausedRef.current = paused;

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    mount.appendChild(canvas);

    let disposed = false;
    let readyCount = 0;
    const onLoad = () => { if (++readyCount === 2 && !disposed) onReady?.(); };

    // ---- Engine ----------------------------------------------------------
    const overrides: Record<string, number> = {};
    if (reducedMotion) {
      overrides.maxReveal = 0.55;     // warna tidak dominan + gerakan lebih tenang
      overrides.edgeNoise = 0.02;
      overrides.curlStrength = 0.04;
      overrides.dyeAmount = 0.45;
    }
    const engine = new FluidEngine(canvas, { overrides });
    engineRef.current = engine;
    engine.onStatusChange = (s: EngineStatus) => {
      if (s === 'context-lost') onContextLost?.();
    };

    // Tekstur B&W & COLOR dari aset yang sama → UV identik, nol distorsi.
    const loader = new THREE.TextureLoader();
    const texOpts = (t: THREE.Texture) => {
      t.colorSpace = THREE.SRGBColorSpace;
      t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
      t.minFilter = THREE.LinearMipmapLinearFilter;
      t.generateMipmaps = true;
      return t;
    };
    let baseTex: THREE.Texture | null = null;
    let colorTex: THREE.Texture | null = null;
    loader.load(bwSrc, (t) => { baseTex = texOpts(t); engine.setPhotos(baseTex, colorTex ?? baseTex!); onLoad(); });
    loader.load(colorSrc, (t) => { colorTex = texOpts(t); if (baseTex) engine.setPhotos(baseTex, colorTex); onLoad(); });

    // ---- Layout & aspect --------------------------------------------------
    const layout = () => {
      const vw = mount.clientWidth, vh = mount.clientHeight;
      if (vw < 2 || vh < 2) return;
      const img = baseTex?.image as HTMLImageElement | undefined;
      const aspect = img && img.height ? img.width / img.height : 0.8; // dummy 4:5
      engine.setPlaneAspect(aspect);
      engine.resize(vw, vh, window.devicePixelRatio || 1);
    };
    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(mount);

    // Konversi koordinat layar → uv PLANE FOTO (bukan window — spec §11).
    (mount as HTMLElement & { __toPlaneUV?: (cx: number, cy: number) => { u: number; v: number; inside: boolean } }).__toPlaneUV =
      (clientX: number, clientY: number) => {
        const rect = mount.getBoundingClientRect();
        const vw = rect.width, vh = rect.height;
        const worldAspect = Math.max(vw / Math.max(vh, 1), 0.0001);
        const pa = engine.planeAspectValue();
        // tinggi plane dunia = h (lihat engine.resize), lebar = h*pa
        const h = worldAspect > pa ? 1 : worldAspect / pa;
        const planeWorldW = h * pa;
        const planeWorldH = h;
        const px = ((clientX - rect.left) / vw - 0.5) * worldAspect; // x dunia
        const py = (0.5 - (clientY - rect.top) / vh) * 1;            // y dunia (tinggi=1)
        const u = px / planeWorldW + 0.5;
        const v = py / planeWorldH + 0.5;
        const inside = u >= -0.06 && u <= 1.06 && v >= -0.06 && v <= 1.06;
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

    // ---- Lifecycle loop ---------------------------------------------------
    const hiddenRef = { current: document.hidden };
    const onVisibility = () => { hiddenRef.current = document.hidden; };
    document.addEventListener('visibilitychange', onVisibility);

    const syncRun = () => {
      const shouldRun = activeRef.current && !hiddenRef.current;
      if (shouldRun) engine.start(); else engine.stop();
    };
    syncRun();
    // jeda ringan untuk perubahan active/hidden (React effect di bawah mengawasi active)
    const iv = setInterval(syncRun, 400);

    return () => {
      disposed = true;
      clearInterval(iv);
      ro.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      mount.removeEventListener('pointerdown', onDown);
      mount.removeEventListener('click', onClick);
      engine.dispose();
      baseTex?.dispose();
      colorTex?.dispose();
      engineRef.current = null;
      canvas.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // paused (modal) → freeze engine tanpa reset
  useEffect(() => { engineRef.current?.setPaused(paused); }, [paused, engineRef]);
  // active berubah → start/stop segera (tanpa menunggu interval)
  useEffect(() => {
    const e = engineRef.current;
    if (!e) return;
    if (active && !document.hidden) e.start(); else e.stop();
  }, [active, engineRef]);

  return <div className="fluid-reveal" ref={mountRef} aria-hidden="true" />;
}
