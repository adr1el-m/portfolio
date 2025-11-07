<div align="center">

# Adriel Magalona — Portfolio

[![Live](https://img.shields.io/badge/Live-adriel.dev-121212?logo=vercel)](https://adriel.dev)
[![Deploy](https://img.shields.io/github/actions/workflow/status/adr1el-m/portfolio/vercel-deploy.yml?branch=main&label=Deploy&logo=vercel)](https://github.com/adr1el-m/portfolio/actions/workflows/vercel-deploy.yml)
[![Performance](https://img.shields.io/github/actions/workflow/status/adr1el-m/portfolio/performance.yml?branch=main&label=Performance%20Audit&logo=lighthouse)](https://github.com/adr1el-m/portfolio/actions/workflows/performance.yml)
[![Accessibility](https://img.shields.io/github/actions/workflow/status/adr1el-m/portfolio/accessibility.yml?branch=main&label=Accessibility%20Audit&logo=w3c)](https://github.com/adr1el-m/portfolio/actions/workflows/accessibility.yml)

[![Lighthouse](public/badges/lighthouse.svg)](public/badges/lighthouse.svg)
[![Coverage](public/badges/coverage.svg)](public/badges/coverage.svg)

</div>

Elegant, fast, and accessible personal portfolio built with modern Web tooling. It features a PWA offline experience, strong performance baselines, robust accessibility checks, and security hardening via CSP and safe-link policies.

---

## ✨ Highlights

- Performance-first: optimized loading, deferred modules, and budgets enforced with Lighthouse CI.
- Accessibility-focused: automated checks via `axe-core` and `pa11y-ci`, WCAG-minded markup.
- PWA offline support: service worker precaches critical assets and provides an offline page.
- Security-conscious: strict CSP (reporting enabled), safe external links, and sanitized content.
- Developer DX: TypeScript, Vite, modular architecture, and CI pipelines for quality signals.

## 🚀 Live & Preview

- Live site: https://adriel.dev
- Local dev: `npm run dev` → open `http://localhost:5173/`
- Build preview: `npm run preview` → open `http://localhost:4173/`
- Offline fallback: visit `/offline` (served and rewritten to `offline.html`)

## 🧰 Tech Stack

- TypeScript + Vite 5
- Vanilla JS modules for UI features
- Three.js (for visuals), Vanilla‑Tilt (interactions)
- Vercel (deploys), GitHub Actions (CI)

## ⚙️ Getting Started

Prerequisites
- Node.js 22.x recommended
- npm 10.x

Setup
```bash
npm ci
npm run dev      # start local dev server (5173)

# Build & preview
npm run build
npm run preview  # preview built app (4173)
```

## 📦 Useful Scripts

- `dev` — start Vite dev server
- `build` — type-check and build production bundle
- `preview` — serve the built `dist` locally
- `deploy` / `deploy:preview` — Vercel CLI deploys
- `purge:css` — PurgeCSS against `style.css` producing `public/style.purged.css`
- `lighthouse` — local Lighthouse run against preview
- `lighthouse:ci` — Lighthouse CI autorun (used in GitHub Actions)
- `perf:audit` — build, preview, run Lighthouse (auto-view report)
- `perf:budget` — validate `performance-budget.json` against preview
- `lint` / `type-check` — code quality and TS types

## 🏗️ Project Structure

```
├── .github/workflows/        # CI pipelines (deploy, performance, accessibility, badges)
├── public/                   # Static assets, PWA files, badges
│   ├── offline.html          # Offline fallback page
│   ├── sw.js                 # Service worker (precaches CSS and critical assets)
│   ├── manifest.json         # PWA manifest
│   └── badges/               # Lighthouse + Coverage badges
├── src/                      # TypeScript source
│   ├── main.ts               # App bootstrap (deferred modules, SW registration)
│   ├── modules/              # Feature modules (accessibility, loading, search, etc.)
│   ├── styles/               # Modular CSS (main.css and subfolders)
│   └── types/                # Shared types
├── index.html                # App shell
├── vite.config.ts            # Vite configuration
├── vercel.json               # Edge headers, rewrites, redirects, CSP
└── package.json              # Scripts and dependencies
```

## 🧩 Key Features

- Service Worker
  - Precache `style.purged.css`, `index.html`, offline routes, and PWA icons.
  - Cache‑first for repeat visits; network update for freshness.

- Accessibility Enhancer
  - Landmark improvements and assistive markup activation after DOM ready.
  - Audits can be stabilized via `?audit=true` query behavior in `main.ts`.

- Performance Optimizations
  - Deferred module loading using `requestAnimationFrame + setTimeout` windows.
  - Skeleton loaders and progressive image handling.
  - Lighthouse CI runs on PRs and scheduled to track performance drift.

- Security Hardening
  - Strict CSP headers in `vercel.json` with `report-uri /api/csp-report`.
  - Safe external link enforcement (`noopener`, `noreferrer`) at runtime.
  - Sanitized content creation helpers.

## 🔁 CI Pipelines

- Deploy (`vercel-deploy.yml`)
  - Node 22, `npm ci` with caching, concurrency control to cancel overlapping runs.
  - Uses prebuilt artifacts for faster production deploys.

- Performance (`performance.yml`)
  - Builds, runs Lighthouse CI, uploads artifacts, and comments summary on PRs.

- Accessibility (`accessibility.yml`)
  - Spins up preview and runs `axe-core` and `pa11y-ci` against key pages.

- Badges (`badges.yml`)
  - Generates Lighthouse and coverage badges into `public/badges`.

## ☁️ Deployment (Vercel)

- Required secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
- Rewrites ensure clean SPA routes (e.g., `/projects`, `/organizations`, `/offline`).
- Cache headers tuned for images and HTML.

## 🔐 CSP Reporting

- Reports collected at `POST /api/csp-report` (see `api/csp-report.js`).
- Use your browser’s DevTools to verify blocked resources and policy adherence.

## 🧪 Audits

Local performance audit
```bash
npm run build && npm run preview &
sleep 3
npm run lighthouse
```

Accessibility audit
```bash
pa11y-ci --config pa11y-ci.json
# or
npx @axe-core/cli --tags wcag2a,wcag2aa --exit http://localhost:4173/
```

## 🤝 Contributing

PRs welcome. Please run `npm run lint` and `npm run type-check` before submitting.

## 📄 License

MIT © Adriel Magalona