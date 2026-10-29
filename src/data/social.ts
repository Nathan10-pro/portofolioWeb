/* ============================================================
   SOCIAL + COLLABORATE DATA (jawaban user #7)
   ⚠ URL handle masih placeholder — ganti dengan akun asli.
   Offset = posisi objek mengambang relatif terhadap karakter (§6).
   ============================================================ */

import type { SocialData, CollaborateContent } from '../types';

export const socials: SocialData[] = [
  { platform: 'github',   label: 'GITHUB',    handle: '@nathan',        url: 'https://github.com/',                 offset: { x: -220, y: -140 } },
  { platform: 'linkedin', label: 'LINKEDIN',  handle: '/in/nathan',     url: 'https://linkedin.com/in/',            offset: { x: 250,  y: -90 } },
  { platform: 'instagram',label: 'INSTAGRAM', handle: '@nathan',        url: 'https://instagram.com/',              offset: { x: -300, y: 120 } },
  { platform: 'x',        label: 'X',         handle: '@nathan',        url: 'https://x.com/',                      offset: { x: 300,  y: 150 } },
  { platform: 'email',    label: 'EMAIL',     handle: 'hello@…',        url: 'mailto:hello@example.com',            offset: { x: 0,    y: 240 } },
];

export const collaborate: CollaborateContent = {
  headline: "LET'S COLLABORATE",
  cta: 'START A PROJECT',
  // Model .glb sementara (jawaban #5). Pengganti SPACESUIT3Dasset.blend.
  characterSrc: '/assets/spacesuit-placeholder.glb',
};
