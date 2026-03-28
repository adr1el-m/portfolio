export default function HomePage() {
  return (
    <main>
      <div className="badge">Phase 1 Migration</div>
      <h1 style={{ marginTop: 14, fontSize: 34 }}>Next.js Migration Shell</h1>
      <p className="meta" style={{ marginTop: 10 }}>
        This runs in parallel with the existing Vite site so migration can happen section by section without breakage.
      </p>

      <div className="grid" style={{ marginTop: 20 }}>
        <section className="card">
          <h2 style={{ fontSize: 22 }}>What is migrated now</h2>
          <p className="meta" style={{ marginTop: 8 }}>
            Honors 2026, Honors 2025, and Honors 2024 are now rendered dynamically in Next.js as incremental migration slices.
          </p>
          <ul style={{ marginTop: 10, paddingLeft: 18 }}>
            <li>
              <a href="/honors/2026">/honors/2026</a>
            </li>
            <li>
              <a href="/honors/2025">/honors/2025</a>
            </li>
            <li>
              <a href="/honors/2024">/honors/2024</a>
            </li>
          </ul>
        </section>

        <section className="card">
          <h2 style={{ fontSize: 22 }}>Why this gradual approach</h2>
          <p className="meta" style={{ marginTop: 8 }}>
            We avoid risky rewrites by moving one area at a time, validating parity, then replacing the old section.
          </p>
        </section>
      </div>
    </main>
  );
}
