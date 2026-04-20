import type { Award } from "../data";

type HonorsYearViewProps = {
  year: string;
  awards: Award[];
};

export default function HonorsYearView({ year, awards }: HonorsYearViewProps) {
  return (
    <main className="honors-page">
      <header className="honors-hero">
        <span className="badge">Honors Archive</span>
        <h1>Honors and Awards {year}</h1>
        <p className="meta">{awards.length} documented entries for competitions, recognitions, and milestones.</p>
        <div className="honors-actions">
          <a href="/" className="text-link">
            Back to portfolio
          </a>
          <a href="#year-awards" className="text-link">
            Jump to entries
          </a>
        </div>
      </header>

      <section className="honors-year-grid" id="year-awards">
        {awards.map((award) => (
          <article key={award.title} className="award-card">
            <div className="award-top">
              <h2>{award.title}</h2>
              <span className="award-badge">{award.badge}</span>
            </div>

            <p className="award-subtitle">{award.subtitle}</p>
            <p className="award-meta">
              {award.date} | {award.location}
            </p>
            <p className="award-meta">Organizer: {award.organizer}</p>
            <p className="award-description">{award.description}</p>

            {award.teammates && award.teammates.length > 0 ? (
              <ul className="award-teammates">
                {award.teammates.map((member) => (
                  <li key={member.name}>
                    {member.name} - {member.role}
                  </li>
                ))}
              </ul>
            ) : null}

            {award.images.length > 0 ? (
              <div className="award-media-grid">
                {award.images.map((src, idx) => (
                  <figure className="award-media" key={`${award.title}-${src}`}>
                    <img src={src} alt={`${award.title} image ${idx + 1}`} loading="lazy" />
                  </figure>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </section>
    </main>
  );
}
