import type { Award } from "../data";

type HonorsYearViewProps = {
  year: string;
  awards: Award[];
};

export default function HonorsYearView({ year, awards }: HonorsYearViewProps) {
  return (
    <main>
      <div className="badge">Migrated Slice</div>
      <h1 style={{ marginTop: 14, fontSize: 34 }}>Honors & Awards {year}</h1>
      <p className="meta" style={{ marginTop: 10 }}>
        This page is rendered dynamically in Next.js and mirrors the existing portfolio content.
      </p>

      <div className="grid" style={{ marginTop: 20 }}>
        {awards.map((award) => (
          <article key={award.title} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <h2 style={{ fontSize: 22 }}>{award.title}</h2>
              <span className="badge">{award.badge}</span>
            </div>
            <p style={{ marginTop: 8 }}>{award.subtitle}</p>
            <p className="meta" style={{ marginTop: 6 }}>
              {award.date} • {award.location}
            </p>
            <p className="meta" style={{ marginTop: 4 }}>Organizer: {award.organizer}</p>
            <p style={{ marginTop: 10 }}>{award.description}</p>

            {award.teammates && award.teammates.length > 0 ? (
              <div style={{ marginTop: 10 }}>
                <h3 style={{ fontSize: 16 }}>Teammates</h3>
                <ul className="meta" style={{ marginTop: 6, paddingLeft: 18 }}>
                  {award.teammates.map((member) => (
                    <li key={member.name}>
                      {member.name} - {member.role}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {award.images.length > 0 ? (
              <div className="imageRow">
                {award.images.map((src, idx) => (
                  <figure className="imageCard" key={src}>
                    <img src={src} alt={`${award.title} image ${idx + 1}`} loading="lazy" />
                    <figcaption className="imageCap">Image {idx + 1}</figcaption>
                  </figure>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </main>
  );
}
