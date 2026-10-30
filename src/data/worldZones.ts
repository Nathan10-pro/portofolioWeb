/* ============================================================
   worldZones — pemetaan progress scroll → zona Digital Terrain.

   Master plan §5: susunan ART-DIRECTED & konstan, bukan random.
   Zona adalah penanda atmosfer/UI (bukan dinding literal):
   perbedaan posisi, depth, dan treatment visual menandai area.

   Jumlah zona disamakan dengan project dummy saat ini (5);
   ketika data project final masuk, cukup update array ini +
   layout di projects.ts — komponen membaca dari data (§8).
   ============================================================ */

export interface WorldZone {
  id: string;
  index: number;          // 1-based untuk HUD "0N / 05 ZONES"
  name: string;           // label HUD uppercase
  /** Rentang progress track [start, end) 0..1 yang memicu zona aktif. */
  range: [number, number];
}

export const WORLD_ZONES: WorldZone[] = [
  { id: 'entry',    index: 1, name: 'ENTRY TERRAIN',      range: [0.00, 0.20] },
  { id: 'web',      index: 2, name: 'WEB DEVELOPMENT',    range: [0.20, 0.40] },
  { id: 'software', index: 3, name: 'SOFTWARE / AI',      range: [0.40, 0.60] },
  { id: 'creative', index: 4, name: 'CREATIVE LAB',       range: [0.60, 0.80] },
  { id: 'experiment', index: 5, name: 'EXPERIMENTAL TERRAIN', range: [0.80, 1.0001] },
];

export function zoneAt(progress: number): WorldZone {
  return WORLD_ZONES.find((z) => progress >= z.range[0] && progress < z.range[1]) ?? WORLD_ZONES[WORLD_ZONES.length - 1];
}
