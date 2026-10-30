/* ============================================================
   WorldHUD — UI 2D overlay di atas dunia (spec §6).

   Posisi final:
   - Kiri atas : PROJECT WORLD + sub-label.
   - Kanan atas: zona aktif + mode kamera ("EXPLORATION MODE").
   - Kiri bawah: project ter-hover/terpilih (P-00N / nama) atau hint.
   - Kanan bawah: petunjuk navigasi + CONTINUE → COLLABORATE.

   Aturan: UI tidak mengambil ruang visual; semua meta-label kecil.
   Update zona/hover TIDAK lewat React state per frame — HUD menulis
   langsung ke DOM via ref (progress dari useProjectScroll sudah
   di-throttle ~5%, dan itu pun ditulis imperatif).
   ============================================================ */

import { forwardRef } from 'react';
import { WORLD_ZONES } from '../../../data/worldZones';
import { projects } from '../../../data/projects';

interface Props {
  onContinue: () => void;
}

const WorldHUD = forwardRef<HTMLDivElement, Props>(({ onContinue }, ref) => {
  return (
    <div className="world-hud" ref={ref} aria-hidden="true">
      {/* kiri atas */}
      <div className="world-hud__tl">
        <span className="world-hud__title">PROJECT WORLD</span>
        <span className="meta-label">NPA / DIGITAL TERRAIN</span>
        <span className="meta-label">{String(WORLD_ZONES.length).padStart(2, '0')} ZONES · {projects.length} WORKS</span>
      </div>

      {/* kanan atas — teks zona diisi imperatif oleh scene */}
      <div className="world-hud__tr">
        <span className="meta-label hud-zone">ZONE 01 — ENTRY TERRAIN</span>
        <span className="meta-label">EXPLORATION MODE</span>
      </div>

      {/* kiri bawah — hover/select label */}
      <div className="world-hud__bl">
        <span className="meta-label hud-focus">HOVER OR SELECT A LANDMARK</span>
      </div>

      {/* kanan bawah — petunjuk & continue (bukan navbar; satu aksi lanjut saja) */}
      <div className="world-hud__br">
        <span className="meta-label hud-hint">SCROLL TO TRAVERSE THE TERRAIN</span>
        <button className="hud-continue" onClick={onContinue}>CONTINUE → COLLABORATE</button>
      </div>
    </div>
  );
});

WorldHUD.displayName = 'WorldHUD';
export default WorldHUD;
