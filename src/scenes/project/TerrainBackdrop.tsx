/* ============================================================
   TerrainBackdrop — lanskap monochrome DI BALIK landmark.

   Digital Terrain §2/§5: permukaan bergelombang, bukit geometris,
   struktur wireframe, tiang, floating geometry, kabut tipis untuk
   kedalaman. Prinsip performa: semua SVG/CSS ringan + transform
   GPU-friendly; TANPA WebGL (keputusan §7 "WebGL hanya bila perlu"
   — fluid Photo sudah memakai budget GPU di pengalaman ini).

   Tiga lapisan parallax (spec §5): foreground / midground /
   background — masing-masing digeser lewat CSS variable --px yang
   diisi WorldParallax dari progress scroll (bukan React state).

   Aturan penting: zona TERBUKA di tengah-atas dibiarkan kosong —
   supaya photo NPA tetap terlihat sebagai "jendela dunia" dan
   landmark tidak terhalang ornamen.
   ============================================================ */

interface Props {
  /** warna siluet mengikuti palet spec §1 */
}

export default function TerrainBackdrop(_props: Props) {
  return (
    <div className="terrain" aria-hidden="true">
      {/* ---------- BACKGROUND: bukit jauh + horizon kabut ---------- */}
      <div className="terrain__layer terrain__layer--bg">
        <svg viewBox="0 0 2400 600" preserveAspectRatio="none">
          {/* ridge jauh */}
          <path d="M0,420 L180,340 L340,400 L520,300 L700,380 L900,290 L1080,360 L1300,270 L1520,350 L1740,300 L1960,380 L2180,320 L2400,400 L2400,600 L0,600 Z"
                fill="#141414" />
          {/* garis kontur wireframe halus */}
          <path d="M0,420 L180,340 L340,400 L520,300 L700,380 L900,290 L1080,360 L1300,270 L1520,350 L1740,300 L1960,380 L2180,320 L2400,400"
                fill="none" stroke="#2A2A2A" strokeWidth="1" />
          <path d="M0,470 L240,410 L460,455 L680,390 L920,440 L1160,385 L1420,445 L1680,400 L1940,455 L2200,415 L2400,460"
                fill="none" stroke="#222222" strokeWidth="1" />
        </svg>
      </div>

      {/* ---------- MIDGROUND: platform, pillar, struktur arsitektural ---------- */}
      <div className="terrain__layer terrain__layer--mid">
        <svg viewBox="0 0 2400 600" preserveAspectRatio="none">
          {/* platform datar tempat landmark "berdiri" secara visual */}
          <path d="M0,520 L300,505 L640,525 L980,500 L1340,522 L1680,505 L2050,528 L2400,510 L2400,600 L0,600 Z"
                fill="#1B1B1B" />
          <path d="M0,520 L300,505 L640,525 L980,500 L1340,522 L1680,505 L2050,528 L2400,510"
                fill="none" stroke="#3A3A3A" strokeWidth="1" />
          {/* geometric pillars */}
          {[120, 430, 760, 1120, 1480, 1840, 2210].map((x, i) => (
            <rect key={x} x={x} y={430 - (i % 3) * 26} width={i % 2 ? 8 : 12} height={90 + (i % 3) * 26}
                  fill="none" stroke="#454545" strokeWidth="1" opacity="0.8" />
          ))}
          {/* arch structure (landmark architectural) */}
          <path d="M1240,520 L1240,470 Q1300,410 1360,470 L1360,520" fill="none" stroke="#3F3F3F" strokeWidth="1.5" />
          {/* wireframe grid floor perspective */}
          {[0, 1, 2, 3, 4].map((r) => (
            <line key={r} x1="0" y1={540 + r * 14} x2="2400" y2={536 + r * 14} stroke="#2E2E2E" strokeWidth="1" opacity={0.6 - r * 0.1} />
          ))}
        </svg>
      </div>

      {/* ---------- FOREGROUND: batu geometris dekat, lebih gelap ---------- */}
      <div className="terrain__layer terrain__layer--fg">
        <svg viewBox="0 0 2400 600" preserveAspectRatio="none">
          <polygon points="60,600 140,540 230,565 260,600" fill="#0D0D0D" />
          <polygon points="1980,600 2080,530 2200,560 2260,600" fill="#0D0D0D" />
          <polygon points="1150,600 1210,555 1290,575 1320,600" fill="#101010" opacity="0.9" />
          {/* hairline edges biar terasa digital */}
          <polyline points="60,600 140,540 230,565 260,600" fill="none" stroke="#3A3A3A" strokeWidth="1" />
          <polyline points="1980,600 2080,530 2200,560 2260,600" fill="none" stroke="#3A3A3A" strokeWidth="1" />
        </svg>
      </div>

      {/* ---------- FLOATING GEOMETRY kecil (drei-like, murni CSS) ---------- */}
      <div className="terrain__floats">
        <span className="terrain__float terrain__float--cube" style={{ left: '8%', top: '22%' }} />
        <span className="terrain__float terrain__float--ring" style={{ left: '27%', top: '14%' }} />
        <span className="terrain__float terrain__float--dot"  style={{ left: '46%', top: '26%' }} />
        <span className="terrain__float terrain__float--cube" style={{ left: '63%', top: '12%' }} />
        <span className="terrain__float terrain__float--ring" style={{ left: '81%', top: '24%' }} />
        <span className="terrain__float terrain__float--dot"  style={{ left: '92%', top: '16%' }} />
      </div>

      {/* ---------- KABUT TIPIS: gradient, bukan fog literal 3D ---------- */}
      <div className="terrain__fog terrain__fog--top" />
      <div className="terrain__fog terrain__fog--bottom" />
    </div>
  );
}
