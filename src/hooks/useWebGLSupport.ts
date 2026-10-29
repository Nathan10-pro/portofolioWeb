/* ============================================================
   useWebGLSupport — §10: fallback jika WebGL tidak tersedia.
   Scene yang bergantung pada fluid/3D membaca hook ini dan
   menampilkan versi DOM/CSS dari konten yang sama.
   ============================================================ */

import { useMemo } from 'react';

function detect(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ??
      canvas.getContext('webgl') ??
      canvas.getContext('experimental-webgl');
    return gl instanceof WebGLRenderingContext || gl instanceof WebGL2RenderingContext;
  } catch {
    return false;
  }
}

export function useWebGLSupport(): boolean {
  // Stabil sepanjang sesi; perubahan konteks GPU saat runtime di luar cakupan.
  return useMemo(detect, []);
}
