# Architecture map

This is a navigation and ownership map, not a duplicate API specification. Detailed behavior remains
in the linked implementation guides and typed contracts. If code and documentation disagree, report
the discrepancy rather than silently changing a boundary.

| Component                               | Responsibility                                                                     | Coordination boundary                                      |
| --------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| src/App.tsx, src/styles.css             | Clinician/research workspaces, shared navigation and PWA UI                        | Coordinate changes affecting both personas                 |
| src/MyHealth.tsx, src/health.css        | Personal synthetic records and reviewed report import                              | Keep personal state isolated from clinician/research state |
| src/api.ts                              | Frontend API transport                                                             | Coordinate error handling and server contracts             |
| shared/contracts.ts                     | Clinician/research models, supported prompts, versions and matching constants      | Agree contract and version changes before parallel edits   |
| shared/health.ts                        | Health models, validation and trend keys                                           | Keep UI and API validation aligned                         |
| server/data.ts, server/analytics.ts     | Server-only historical rows, deterministic matching and protected aggregates       | Do not export historical rows to the client                |
| server/copilot.ts                       | Allowlisted, grounded response templates                                           | No model invocation or free-form intent routing            |
| server/health-data.ts, server/health.ts | Bundled synthetic reports, seeded readings, bounded in-memory sessions and actions | No durable storage or connection to cohort analytics       |
| server/app.ts, server/index.ts          | Express routing, request limits, response headers, CORS and static hosting         | Preserve API-wide no-store behavior                        |
| vite.config.ts, capacitor.config.ts     | PWA asset caching and native packaging foundation                                  | No API caches or unapproved native permissions             |
| tests/, tests/browser/                  | Node unit/API tests and Playwright desktop/mobile-emulation tests                  | Preserve safety and regression coverage                    |

## Runtime

Node.js 22 and npm; React 19, TypeScript strict mode, Vite 6, Express 5, and Capacitor 7.
Development uses Vite on 5173 with an API proxy to Express on 3001. Production builds place web assets
in dist/; Express serves those assets and /api on one origin. The server runs through tsx, so current
hosting requires development dependencies too. Secrets never belong in VITE_* build-time variables.

## Independent data flows

- Clinician requests use the fixed synthetic patient and server-computed cohort/study aggregates.
  The server recomputes evidence and metrics rather than trusting client-supplied results.
- My Health requests use /api/health-demo and its separate session store. The browser keeps only the
  opaque session ID in sessionStorage. Report imports require reviewed fields and explicit
  confirmation; the API validates the entire import before changing records.
- No personal-record flow enters matching or study outputs. No API response enters service-worker
  caches. Offline mode serves the application shell; health writes are disabled.

## Authoritative details

- [Clinician matching, disclosure controls, routes and deployment](../demo/implementation.md)
- [My Health routes, validation, storage limits and simulated scanning](../demo/my-health.md)
- [Native delivery prerequisites and release gates](../demo/native-roadmap.md)
- [Architecture baseline decision](decisions/0001-synthetic-prototype-baseline.md)

Extend these sources when their behavior changes rather than copying large specifications into
multiple files. Architectural changes require the decision workflow before implementation.
