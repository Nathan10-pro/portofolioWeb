/* ============================================================
   PhotoImage — pembungkus dua layer foto (spec PHOTO v2.0 §7).

   Tanggung jawab:
   - Menyiapkan B&W base + COLOR reveal pada KOORDINAT & UKURAN
     yang sama persis (§3: "Layer 01/02 identik").
   - WebGL tersedia → <FluidReveal/> (mask shader, nol distorsi).
   - Tidak tersedia → fallback CSS mask sederhana (pointer-driven)
     di atas dua <img> identik — spesifikasi §6 "perangkat lemah".
   ============================================================ */

import { useRef } from 'react';
import type { FluidEngine } from '../../fluid/core/FluidEngine';
import FluidReveal from './effects/FluidReveal';
import CssMaskFallback from './CssMaskFallback';

interface Props {
  bwSrc: string;
  colorSrc: string;
  webgl: boolean;
  active: boolean;
  paused?: boolean;
  reducedMotion: boolean;
  onReady?: () => void;
  onPhotoClick?: () => void;
  engineRef: React.MutableRefObject<FluidEngine | null>;
  onContextLost?: () => void;
}

export default function PhotoImage({
  bwSrc, colorSrc, webgl, active, paused, reducedMotion,
  onReady, onPhotoClick, engineRef, onContextLost,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);

  return (
    <div className="photo-image" ref={hostRef}>
      {webgl ? (
        <FluidReveal
          bwSrc={bwSrc}
          colorSrc={colorSrc}
          active={active}
          paused={paused}
          reducedMotion={reducedMotion}
          onReady={onReady}
          onPhotoClick={onPhotoClick}
          engineRef={engineRef}
          onContextLost={onContextLost}
        />
      ) : (
        <CssMaskFallback
          bwSrc={bwSrc}
          colorSrc={colorSrc}
          enabled={active && !paused}
          onReady={onReady}
          onPhotoClick={onPhotoClick}
        />
      )}
    </div>
  );
}
