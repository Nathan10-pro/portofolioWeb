/* ============================================================
   TYPES — kontrak data & state seluruh experience
   Arah dependensi: UI → Scene → System → Shader (§8)
   Data dipisahkan dari komponen UI.
   ============================================================ */

/** State scene utama (Experience Shell). */
export type SceneId = 'loading' | 'photo' | 'projects' | 'collaborate';

/** Kategori project — mengatur treatment visual, BUKAN kualitas (§5) */
export type ProjectCategory = 'MAIN' | 'SIDE' | 'EXPERIMENT';

/** Platform sosial untuk Social Objects di Collaborate Scene (§6) */
export type SocialPlatform = 'github' | 'linkedin' | 'instagram' | 'x' | 'email';

export interface Vector2 {
  x: number;
  y: number;
}

/** Metadata sudut Photo Scene: NATHAN / STUDENT / SOFTWARE DEVELOPMENT / AI ENGINEERING */
export interface CornerMeta {
  corner: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  label: string;
}

export interface ProfileData {
  name: string;
  role: string;
  major: string;
  /** Tagline kecil di bawah identitas Photo (§6 spec PHOTO v2.0). */
  tagline?: string;
  /** Sub-tagline (mis. "Design · Development · Experimentation"). */
  taglineSub?: string;
  cornerMeta: CornerMeta[];
  /** Isi Photo Bio Modal (§4). Placeholder sampai BioData.txt final. */
  bio: {
    summary: string;      // 2–3 kalimat
    biography: string;    // paragraf pendek
    education: string;    // Software Development & AI Engineering + info pendidikan
    focus: string[];
  };
  assets: {
    logo: string;
    photoBW: string;
    photoColor: string;
    signature: string;
  };
}

export interface ProjectMedia {
  type: 'image' | 'video' | 'embed';
  src: string;
  caption?: string;
}

export interface ProjectData {
  id: string;
  title: string;
  category: ProjectCategory;
  year: string;
  stack: string[];
  shortDescription: string;
  longDescription: string;
  links: { label: string; url: string }[];
  media: ProjectMedia[];
  thumbnail: string;
  /** Art-directed layout (§5): posisi & kedalaman tetap, bukan random. */
  layout: {
    x: number;        // posisi horizontal dalam track (px/unit dunia)
    y: number;        // offset vertikal
    depth: number;    // 0 = depan, 1 = jauh — menentukan kekuatan parallax
    rotation: number; // derajat, rentang ±1–4° desktop
    scale: number;
  };
}

export interface SocialData {
  platform: SocialPlatform;
  label: string;
  handle: string;
  url: string;
  /** Posisi objek mengambang di sekitar karakter (§6) */
  offset: Vector2;
}

export interface CollaborateContent {
  headline: string;   // "LET'S COLLABORATE"
  cta: string;        // "START A PROJECT"
  characterSrc: string; // path .glb sementara (pengganti SPACESUIT3Dasset.blend)
}

/** Konfigurasi EmailJS untuk Contact Modal (§6, jawaban user #8) */
export interface EmailJsConfig {
  serviceId: string;
  templateId: string;
  publicKey: string;
}

export type ContactFormStatus = 'idle' | 'sending' | 'success' | 'error';
