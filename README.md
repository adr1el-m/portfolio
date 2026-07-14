# Adriel Magalona — Portfolio

Personal portfolio for Adriel Magalona: full-stack developer and AI builder. The live site is [www.adrielmagalona.dev](https://www.adrielmagalona.dev).

## What is in this repository

- Vite + TypeScript single-page portfolio with serverless Vercel API routes.
- Static, indexable honor evidence pages generated at build time.
- Static case studies for WorkSight, GeneSync, ODRS, DokQ, and LingapLink.
- AdrAI portfolio guide with server-side provider access only.
- Accessible project and achievement dialogs, role-tailored recruiter paths, and a secure server-owned visit counter.

## Run locally

```bash
npm ci
cp .env.example .env.local
npm run dev
```

Never put secrets in a `VITE_*` variable. Server-only values are documented in [.env.example](.env.example).

## Validation

```bash
npm run type-check
npm run lint
npm run build
npm run check:links
npm run test:behavior
npm run test:visual
```

`npm run build` also generates honor and case-study pages in `dist/`.

## Deployment

The project deploys to Vercel. Production configuration requires server-only values for the Firebase visit counter and optional AdrAI provider access. Deploy with:

```bash
npm run deploy
```

## Project structure

```text
api/                 Vercel API routes
public/              Static assets and split CSS
scripts/             Build generators and behavior/visual checks
src/data/            Portfolio, project-proof, and case-study presentation data
src/modules/         UI behavior modules
```

## License

MIT
