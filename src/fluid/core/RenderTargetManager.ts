/**
 * RenderTargetManager — ping-pong buffers (§5).
 *
 * GPU tidak boleh membaca & menulis texture yang sama dalam satu pass,
 * jadi setiap field memiliki dua buffer yang ditukar tiap update.
 * Resource dibuat SEKALI saat init dan di-dispose saat teardown (§14).
 */
import * as THREE from 'three';
import type { GpuCapabilities } from '../utils/capabilities';

export interface DoubleFBO {
  read: THREE.WebGLRenderTarget;
  write: THREE.WebGLRenderTarget;
  swap(): void;
}

function makeFBO(w: number, h: number, caps: GpuCapabilities, format: number): THREE.WebGLRenderTarget {
  const rt = new THREE.WebGLRenderTarget(w, h, {
    type: caps.texType as THREE.TextureDataType,
    format: format as THREE.PixelFormat,
    minFilter: caps.linearHalfFloat ? THREE.LinearFilter : THREE.NearestFilter,
    magFilter: caps.linearHalfFloat ? THREE.LinearFilter : THREE.NearestFilter,
    wrapS: THREE.ClampToEdgeWrapping,
    wrapT: THREE.ClampToEdgeWrapping,
    depthBuffer: false,
    stencilBuffer: false,
    generateMipmaps: false,
  });
  return rt;
}

function makeDouble(w: number, h: number, caps: GpuCapabilities, format: number): DoubleFBO {
  const read = makeFBO(w, h, caps, format);
  const write = makeFBO(w, h, caps, format);
  return {
    read,
    write,
    swap() {
      const t = this.read;
      this.read = this.write;
      this.write = t;
    },
  };
}

export class RenderTargetManager {
  velocity!: DoubleFBO;
  dye!: DoubleFBO;
  pressure!: DoubleFBO;
  divergence!: THREE.WebGLRenderTarget;
  curl!: THREE.WebGLRenderTarget;
  mask!: THREE.WebGLRenderTarget;

  constructor(caps: GpuCapabilities, simRes: number, dyeRes: number) {
    const vf = caps.velocityFormat;
    const sf = caps.scalarFormat;
    this.velocity = makeDouble(simRes, simRes, caps, vf);
    this.dye = makeDouble(dyeRes, dyeRes, caps, sf);
    this.pressure = makeDouble(simRes, simRes, caps, sf);
    this.divergence = makeFBO(simRes, simRes, caps, sf);
    this.curl = makeFBO(simRes, simRes, caps, sf);
    this.mask = makeDouble(simRes, simRes, caps, sf).read; // mask single-pass sudah cukup
  }

  dispose() {
    for (const fbo of [this.velocity, this.dye, this.pressure]) {
      fbo.read.dispose();
      fbo.write.dispose();
    }
    this.divergence.dispose();
    this.curl.dispose();
    this.mask.dispose();
  }
}
