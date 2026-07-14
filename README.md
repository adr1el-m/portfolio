# Adriel Magalona — Portfolio

The source for [adrielmagalona.dev](https://adrielmagalona.dev): a TypeScript portfolio with selected work, evidence-backed case studies, achievements, and a small serverless contact/AI layer.

## What it includes

- Responsive Vite application with accessible navigation, dialogs, and keyboard support.
- Static, indexable case studies and honor pages generated during the production build.
- Project evidence: role, scope, constraints, decisions, outcomes, and relevant links.
- AdrAI, a portfolio guide that calls providers only through server-side Vercel functions.
- Optional Firebase-backed visitor analytics and Resend contact delivery.

## Stack

| Area | Tools |
| --- | --- |
| App | TypeScript, Vite, vanilla DOM modules |
| Hosting and APIs | Vercel Functions |
| Optional services | Firebase Realtime Database, Resend, Gemini |
| Quality checks | TypeScript, ESLint, Pa11y, Puppeteer, Lighthouse CI |

## Local development

Requires Node.js 24.

```bash
npm ci
cp .env.example .env.local
npm run dev
```

The portfolio works without optional service credentials. Add only the features you need using the documented values in [.env.example](.env.example). Never expose server secrets with a `VITE_*` prefix.

## Verify changes

```bash
npm run type-check
npm run lint
npm run build
npm run check:links
npm run test:behavior
npm run test:visual
npm run lighthouse:ci
```

`npm run build` also creates static honor and case-study pages in `dist/`.

## Deployment

The site deploys to Vercel. Configure any optional Firebase, Resend, and AI credentials as server-only Vercel environment variables, then run:

```bash
npm run deploy
```

## Repository map

```text
api/                 Vercel Functions
public/              Static media, styles, service worker, offline page
scripts/             Build generators and automated checks
src/data/            Portfolio, project, and case-study content
src/modules/         Page behavior and UI features
config/              Lighthouse and performance budgets
```

## License

[MIT](LICENSE)
