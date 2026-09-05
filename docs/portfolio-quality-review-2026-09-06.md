# Portfolio quality review — 6 September 2026

The portfolio retains its charcoal-and-gold design. This pass improves evidence presentation, accessibility, slow-loading behavior, offline availability, and the repeatability of its quality checks.

## Changes

- Preserved the pending achievement-logo layout correction and school/scholarship additions. Served six new logos as 128px WebP assets with explicit layout dimensions: 1,044,778 bytes reduced to 36,956 bytes (96.5%). Original JPEGs remain available.
- Replaced generic service copy with concrete descriptions and kept sidebar email text compact.
- Made the activity chart keyboard-scrollable and hid its empty tooltip from assistive technology. Matched the GitHub link's accessible name to its visible handle.
- Preserved search keystrokes while its lazy module loads. Project comparison now waits for explorer readiness instead of relying on a 180ms delay.
- Made clipboard fallback truthful and fixed service-worker registration when its deferred module loads after the browser's load event.
- Stopped legacy social-media captions appearing as organization names in generated honor-page badges and structured data. Original modal narratives remain intact.
- Aligned local preview routing for generated detail pages with production rewrites.
- Removed WorkSight's live-product and documentation buttons after both deployments returned HTTP 404 with `DEPLOYMENT_NOT_FOUND`. The repository, project record, and case study remain accessible.
- Added repeatable browser and handler tests, expanded link scanning to project profiles and generated case studies, and aligned CI jobs with the repository's Node.js 24 requirement.

## Validation

| Check | Result |
| --- | --- |
| TypeScript, ESLint, production build, whitespace checks | Passed |
| Asset/link scan | All 455 collected links pass, including the final external-link audit (70 external URLs) |
| Responsive WCAG matrix | Six portfolio routes at 320, 390, 768, 1024, 1440, and 1920px; no page overflow, broken visible images, uncaught page exceptions, or tested WCAG violations |
| Keyboard and behavior smoke tests | Resume, filters, comparison, history/ARIA, command palette, focus restoration, Escape, changelog, skip link, destinations, case study |
| Slow module delivery | Search typing and comparison work with a 900ms bundle delay |
| Repeated actions | 60 route changes and 20 dialog cycles; one dialog retained and scroll locks restored |
| Contact UI | Clipboard-unavailable fallback, empty input, and ten immediate Send clicks producing one intercepted request |
| Generated content | All 26 honor pages and five case studies return 200 with an H1 and canonical |
| Offline | Real service worker registers on a non-audit visit; cached About page reloads offline |
| Handler checks | Method/origin rejection, malformed input, validation, stubbed contact/AI responses, and 50 contact attempts limited to three upstream calls |
| Visual regression | Six reviewed scenarios pass against refreshed local baselines; captures now prepare lazy content and use reduced motion |
| Lighthouse mobile sample | Performance 98, accessibility 100, best practices 96, SEO 100; FCP 1.7s, LCP 2.2s, TBT 0ms, CLS 0.007 |

## Scope and limits

Browser validation used local production assets in Chrome. The Lighthouse best-practices deduction was an unavailable local `/api/visits` backend, not an uncaught application exception. This is a measured local sample, not a production performance guarantee.

Contact delivery and AI upstream calls were intercepted in tests; no real messages were sent, and provider availability or credentials were not certified. External-link checking accepts authentication, rate-limit, and bot-block responses as reachable; it cannot establish the content behind them. It found two confirmed dead WorkSight deployments, which were removed.

Visual baselines and detailed JSON/screenshot artifacts are local and Git-ignored. The new GitHub quality workflow publishes its browser artifacts. CI itself has not been claimed successful before the push.

## Reproduce

Run `npm run type-check`, `npm run lint`, `npm run build`, `npm run check:links`, `npm run test:api`, and `npm run test:behavior`.

Start `npm run preview` in another terminal, then run `npm run test:stress` and `npm run test:resilience`. Run `npm run test:visual` for local snapshot comparison. Inspect changed screenshots before updating baselines.
