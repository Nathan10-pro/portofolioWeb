/* ============================================================
   PROGRESS BAR — minimal, indikator inisialisasi nyata.
   Spec §3: track abu-abu gelap, fill putih 2px, persentase kecil
   di sisi kanan, transisi halus. Status berubah per rentang
   persentase (INITIALIZING → … → EXPERIENCE READY).
   Persentase berasal dari usePreloader (bukan angka animasi palsu).
   ============================================================ */

import { statusForProgress } from './loading.config';

interface Props {
  progress: number; // 0–100 real
}

export default function ProgressBar({ progress }: Props) {
  const clamped = Math.max(0, Math.min(100, progress));
  return (
    <div className="loading__progress" data-progress-block>
      {/* Nomor tahapan canonical perjalanan visual (Loading = 01 dari 04) */}
      <span className="loading__progress-step meta-label">01/04</span>

      <div className="loading__progress-main">
        <span className="loading__progress-status meta-label" data-status>
          {statusForProgress(clamped)}
        </span>

        <div
          className="loading__progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(clamped)}
          aria-label="Memuat aset pengalaman"
        >
          <span className="loading__progress-fill" data-progress-fill />
        </div>

        <span className="loading__percent meta-label" data-percent>
          {String(Math.round(clamped)).padStart(2, '0')}%
        </span>
      </div>
    </div>
  );
}
