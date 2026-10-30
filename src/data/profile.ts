/* ============================================================
   PROFILE DATA — DUMMY / PLACEHOLDER
   ⚠ Semua teks di file ini adalah placeholder.
   Jangan dianggap fakta. Ganti dengan isi BioData.txt final.
   Aturan §13: jangan mengarang biografi — karena user mengizinkan
   dummy bebas (jawaban #4 & #6), file ini diberi penanda jelas.
   ============================================================ */

import type { ProfileData } from '../types';

export const profile: ProfileData = {
  name: 'NATHAN',
  role: 'CREATIVE DEVELOPER', // spec PHOTO v2.0 §6 (dulu 'STUDENT')
  major: 'SOFTWARE DEVELOPMENT',

  /** Tagline kecil di bawah identitas (§6). Placeholder. */
  tagline: '[PLACEHOLDER] Exploring creativity through technology.',
  taglineSub: '[PLACEHOLDER] Design · Development · Experimentation',

  // Empat sudut Photo Scene (§4)
  cornerMeta: [
    { corner: 'top-left',     label: 'NATHAN' },
    { corner: 'top-right',    label: 'CREATIVE DEVELOPER' },
    { corner: 'bottom-left',  label: 'SOFTWARE DEVELOPMENT' },
    { corner: 'bottom-right', label: 'AI ENGINEERING' },
  ],

  bio: {
    summary:
      '[PLACEHOLDER] Mahasiswa yang bekerja di persimpangan software development dan AI engineering. ' +
      'Membangun antarmuka yang terasa hidup, dan sistem yang berpikir di belakangnya.',
    biography:
      '[PLACEHOLDER] Paragraf biografi pendek akan diisi dari public/assets/profile/BioData.txt. ' +
      'Struktur modal sudah disiapkan: identitas → summary → biography → education/focus.',
    education:
      '[PLACEHOLDER] Pendidikan: jurusan, kampus, tahun — menunggu data final.',
    focus: ['Software Development', 'AI Engineering'],
  },

  assets: {
    logo: '/assets/logo/logo.png',
    photoBW: '/assets/profile/selfpotraitBW.png',
    photoColor: '/assets/profile/selfpotraitCOLOR.png',
    signature: '/assets/profile/signature.png',
  },
};
