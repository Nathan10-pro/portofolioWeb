/**
 * capabilities.ts — Pemeriksaan dukungan GPU sebelum memilih format texture.
 * Spec §5 & §14: float texture support + framebuffer completeness test nyata.
 */
import * as THREE from 'three';

export interface GpuCapabilities {
  /** Bisa menulis render target half-float. */
  colorBufferFloat: boolean;
  /** Linear filtering pada half-float tersedia. */
  linearHalfFloat: boolean;
  /** Format internal velocity yang aman dipakai. */
  velocityFormat: number;
  /** Format internal scalar (dye/pressure/divergence). */
  scalarFormat: number;
  /** Type untuk format di atas. */
  texType: number;
}

/** Deteksi kemampuan dengan tes framebuffer kecil, bukan hanya cek ekstensi. */
export function probeCapabilities(renderer: THREE.WebGLRenderer): GpuCapabilities {
  const gl = renderer.getContext();
  const isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
  const halfExt = isWebGL2 || !!gl.getExtension('OES_texture_half_float');
  const linearHalf = isWebGL2 || !!gl.getExtension('OES_texture_half_float_linear');

  let colorBufferFloat = false;
  try {
    const rt = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType });
    renderer.setRenderTarget(rt);
    renderer.clear(true, true, false);
    const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    colorBufferFloat = status === gl.FRAMEBUFFER_COMPLETE;
    renderer.setRenderTarget(null);
    rt.dispose();
  } catch {
    colorBufferFloat = false;
  }

  if (colorBufferFloat && halfExt) {
    return {
      colorBufferFloat: true,
      linearHalfFloat: linearHalf,
      velocityFormat: THREE.RGFormat,
      scalarFormat: THREE.RedFormat,
      texType: THREE.HalfFloatType,
    };
  }

  // Fallback penuh RGBA8 — kualitas berkurang tapi halaman tetap hidup (§13 stability)
  return {
    colorBufferFloat: false,
    linearHalfFloat: false,
    velocityFormat: THREE.RGBAFormat,
    scalarFormat: THREE.RGBAFormat,
    texType: THREE.UnsignedByteType,
  };
}
