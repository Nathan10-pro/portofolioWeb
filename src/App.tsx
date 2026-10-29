/* ============================================================
   APP SHELL — sementara (Tahap 1: Project Foundation)
   Menampilkan skeleton urutan scene untuk memverifikasi:
   - design tokens & tipografi berjalan
   - data layer bisa diimpor
   - struktur folder sesuai arsitektur §8

   ⚠ Belum ada animasi. Experience Shell + Loading Scene = Tahap 2–3,
   dikerjakan setelah konfirmasi user.
   ============================================================ */

import { profile } from './data/profile';
import { projects } from './data/projects';
import { socials, collaborate } from './data/social';

const scenes = ['LOADING', 'PHOTO', 'PROJECT', 'COLLABORATE'] as const;

export default function App() {
  return (
    <main style={{ minHeight: '100dvh', background: 'var(--color-bg)', padding: 'var(--edge-padding)' }}>
      {/* Alur perjalanan: LOADING → PHOTO → PROJECT → COLLABORATE */}
      <header className="meta-label" style={{ display: 'flex', gap: '2rem' }}>
        {scenes.map((s, i) => (
          <span key={s}>
            {String(i).padStart(2, '0')} / {s}
          </span>
        ))}
      </header>

      <h1 style={{ fontSize: 'var(--text-h1)', letterSpacing: 'var(--tracking-tight)', lineHeight: 'var(--leading-tight)', margin: '12vh 0' }}>
        {profile.name}
      </h1>

      <p style={{ color: 'var(--color-text-secondary)', maxWidth: '48ch' }}>
        Foundation OK — GSAP / Three / R3F / EmailJS terpasang.{' '}
        <span style={{ color: 'var(--color-muted)' }}>[PLACEHOLDER UI, bukan desain final]</span>
      </p>

      <section style={{ marginTop: '8vh', borderTop: '1px solid var(--color-line)', paddingTop: '2rem' }}>
        <span className="meta-label">{projects.length} DUMMY PROJECTS</span>
        <ul style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem' }}>
          {projects.map((p) => (
            <li key={p.id} style={{ color: 'var(--color-text-secondary)' }}>
              <span className="meta-label" style={{ marginRight: '1rem' }}>{p.category}</span>
              {p.title} · {p.year}
            </li>
          ))}
        </ul>
      </section>

      <section style={{ marginTop: '6vh' }}>
        <span className="meta-label">SOCIAL OBJECTS</span>
        <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}>
          {socials.map((s) => s.label).join(' · ')} — headline akhir: {collaborate.headline} → {collaborate.cta}
        </p>
      </section>
    </main>
  );
}
