<div align="center">

# Adriel Magalona

### Portfolio website · selected work, case studies, and engineering notes

[Live site](https://adrielmagalona.dev) · [Case studies](https://adrielmagalona.dev/case-studies/worksight) · [Report an issue](https://github.com/adr1el-m/portfolio/issues)

</div>

---

This repository powers [adrielmagalona.dev](https://adrielmagalona.dev), a portfolio built to make the work easy to evaluate: projects have context, achievements have evidence, and the site remains useful across devices and connection states.

| Focus | What is here |
| --- | --- |
| **Work** | Selected projects with role, scope, constraints, decisions, outcomes, and links. |
| **Evidence** | Build-generated, indexable case-study and honor pages. |
| **Experience** | Responsive navigation, keyboard-accessible dialogs, offline support, and tailored recruiter paths. |
| **Services** | Optional contact delivery, visitor analytics, and the server-side AdrAI portfolio guide. |

## Built with

| Layer | Technology |
| --- | --- |
| Application | TypeScript · Vite · focused DOM modules |
| Platform | Vercel · Vercel Functions |
| Optional integrations | Firebase Realtime Database · Resend · Gemini |
| Quality | TypeScript · ESLint · Pa11y · Puppeteer · Lighthouse CI |

## Local setup

> **Requirement:** Node.js 24

```bash
npm ci
cp .env.example .env.local
npm run dev
```

The public portfolio runs without optional credentials. Enable only the services you need with the values documented in [.env.example](.env.example). Keep provider keys and server secrets out of `VITE_*` variables.

## Quality checks

Run the checks relevant to your change, or run the full suite before publishing:

```bash
npm run type-check      # TypeScript
npm run lint            # Static analysis
npm run build           # Production build + static page generation
npm run check:links     # Internal-link validation
npm run test:behavior   # Keyboard, dialog, route, and CTA smoke tests
npm run test:visual     # Visual-regression snapshots
npm run lighthouse:ci   # Lighthouse CI assertions
```

The production build writes the static honor and case-study pages to `dist/`.

## Deployment

Production is hosted on Vercel. Set optional Firebase, Resend, and AI credentials as **server-only** Vercel environment variables, then deploy:

```bash
npm run deploy
```

## Repository guide

```text
api/                 Vercel Functions
config/              Lighthouse and performance budgets
public/              Static media, styles, service worker, offline fallback
scripts/             Page generators and automated checks
src/data/            Portfolio, project, and case-study content
src/modules/         Page behavior and UI features
```

## License

Released under the [MIT License](LICENSE).
