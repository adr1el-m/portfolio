# Adriel Magalona Portfolio

[![Lighthouse Performance](https://img.shields.io/badge/Performance-95-brightgreen?logo=lighthouse&logoColor=white)](https://adriel.dev)
[![Lighthouse Accessibility](https://img.shields.io/badge/Accessibility-100-brightgreen?logo=lighthouse&logoColor=white)](https://adriel.dev)
[![Lighthouse Best Practices](https://img.shields.io/badge/Best%20Practices-100-brightgreen?logo=lighthouse&logoColor=white)](https://adriel.dev)
[![Lighthouse SEO](https://img.shields.io/badge/SEO-100-brightgreen?logo=lighthouse&logoColor=white)](https://adriel.dev)
[![Coverage](https://img.shields.io/badge/Coverage-100%25-brightgreen?logo=vitest&logoColor=white)](./public/badges/coverage.svg)

A modern, performance-focused, accessible portfolio showcasing projects, achievements, and interactive experiences.

## Key Features
- Enterprise-grade performance monitoring with Core Web Vitals, budgets, and CI audits
- Lighthouse CI integration with 90+ targets for all categories
- Accessibility-first design achieving 100/100 Lighthouse A11y
- Responsive images with AVIF/WebP and `<picture>` for LCP improvements
- Interactive chatbot powered by Gemini API

## Performance Monitoring & Analytics 📊

This portfolio includes **enterprise-grade performance monitoring** to ensure optimal user experience:

- **Core Web Vitals Tracking:**  Real-time monitoring of LCP, INP, CLS, FCP, and TTFB.
- **Vercel Analytics & Speed Insights:**  Tracks real user metrics and page views.
- **Performance Budgets:**  Strict budgets for JS, CSS, images, and timing metrics.
- **Lighthouse CI:**  Automated audits with target scores of 90+ across categories.
- **GitHub Actions Integration:**  Continuous audits and budget checks on each commit.

**Run Performance Audits:**
```bash
npm run perf:audit
npm run lighthouse:ci
npm run perf:budget
```

See [PERFORMANCE_MONITORING.md](./PERFORMANCE_MONITORING.md) for details.

## Accessibility ♿

This portfolio achieves **WCAG 2.1 AA compliance** and **100/100 Lighthouse accessibility**. See [ACCESSIBILITY_FIXES.md](./ACCESSIBILITY_FIXES.md).

## Badges Automation

- Lighthouse badges and HTML reports generated via CI and committed to `public/badges/`.
- Coverage badge generated from Vitest `coverage-summary.json` and committed to `public/badges/coverage.svg`.
- Workflow: `.github/workflows/badges.yml` (runs on `main`, weekly schedule, and on demand).

## Deployment

Designed for seamless deployment on **Vercel** with optimized assets and build configuration.

## Scripts
```bash
npm run build
npm run preview
npm run perf:audit
npm run perf:budget
npm run lighthouse:ci
```

---

Explore the source code, interact with the chatbot, and feel free to adapt this project to your style and goals.
