/* ============================================================
   MONOGRAM — NPA (Direction A: Typography)
   Keputusan terkunci spec v1.0: monogram teks/SVG, warna #FFFFFF,
   letter-spacing editorial tegas. logo.png TIDAK dibuang —
   dipakai sebagai fallback <img> bila font gagal render / untuk
   konteks identitas alternatif (lihat loading.config & preloader).
   Kelas BEM consumed oleh GSAP timeline di LoadingScreen.tsx.
   ============================================================ */

interface Props {
  /** true → render <img logo.png>; default false → tipografi NPA. */
  useImage?: boolean;
}

export default function Monogram({ useImage = false }: Props) {
  return (
    <div className="loading__monogram" data-monogram>
      {useImage ? (
        <img
          className="loading__monogram-img"
          src="/assets/logo/logo.png"
          alt="NPA"
          draggable={false}
        />
      ) : (
        <>
          <span className="loading__monogram-text" aria-label="NPA">
            {'NPA'.split('').map((ch, i) => (
              // Per-letter span disiapkan utk future split-text polish;
              // animasi saat ini tetap pada level wrapper (sederhana).
              <span key={i} className="loading__monogram-char">{ch}</span>
            ))}
          </span>
          <span className="loading__monogram-subtitle">PERSONAL PORTFOLIO</span>
        </>
      )}
    </div>
  );
}
