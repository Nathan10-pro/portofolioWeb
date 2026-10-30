/* ============================================================
   CssMaskFallback — fallback non-WebGL (spec PHOTO v2.0 §6).

   Dua <img> identik ditumpuk; layer COLOR diberi radial-gradient
   mask yang mengikuti pointer dengan transisi CSS halus. Ini BUKAN
   fluid penuh — hanya reveal sederhana agar pengalaman tetap ada
   di perangkat tanpa WebGL / GPU lemah. Tidak ada distorsi geometri.
   ============================================================ */

import { useEffect, useRef } from 'react';
import './FluidReveal.css';

interface Props {
  bwSrc: string;
  colorSrc: string;
  enabled: boolean;
  onReady?: () => void;
  onPhotoClick?: () => void;
}

export default function CssMaskFallback({ bwSrc, colorSrc, enabled, onReady, onPhotoClick }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const colorRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const imgs = Array.from(wrap.querySelectorAll('img'));
    const onEach = () => { if (imgs.every((i) => i.complete && i.naturalWidth > 0)) onReady?.(); };
    imgs.forEach((i) => { i.addEventListener('load', onEach); i.addEventListener('error', onEach); });
    onEach();

    let lastX = 0, lastY = 0;
    const move = (e: PointerEvent) => {
      if (!enabled || !colorRef.current) return;
      const rect = wrap.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      colorRef.current.style.setProperty('--mx', `${x}%`);
      colorRef.current.style.setProperty('--my', `${y}%`);
      colorRef.current.classList.add('is-revealing');
    };
    const leave = () => colorRef.current?.classList.remove('is-revealing');
    const down = (e: PointerEvent) => { lastX = e.clientX; lastY = e.clientY; };
    const click = (e: MouseEvent) => {
      if (Math.hypot(e.clientX - lastX, e.clientY - lastY) < 6) onPhotoClick?.();
    };

    wrap.addEventListener('pointermove', move, { passive: true });
    wrap.addEventListener('pointerleave', leave);
    wrap.addEventListener('pointerdown', down, { passive: true });
    wrap.addEventListener('click', click);
    return () => {
      wrap.removeEventListener('pointermove', move);
      wrap.removeEventListener('pointerleave', leave);
      wrap.removeEventListener('pointerdown', down);
      wrap.removeEventListener('click', click);
      imgs.forEach((i) => { i.removeEventListener('load', onEach); i.removeEventListener('error', onEach); });
    };
  }, [enabled, onReady, onPhotoClick]);

  return (
    <div className="css-mask-fallback" ref={wrapRef}>
      <img src={bwSrc} alt="" draggable={false} />
      <img
        ref={colorRef}
        className="css-mask-fallback__color"
        src={colorSrc}
        alt=""
        draggable={false}
      />
    </div>
  );
}
