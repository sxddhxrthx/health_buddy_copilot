# Architecture map

This is a navigation and ownership map, not a duplicate API specification. Detailed behavior remains
in the linked implementation guides and typed contracts. If code and documentation disagree, report
the discrepancy rather than silently changing a boundary.

| Component                               | Responsibility                                                                 | Coordination boundary                                      |
| --------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| src/App.tsx, src/styles.css             | Clinician/research workspaces, shared navigation and PWA UI                    | Coordinate changes affecting both personas                 |
| src/MyHealth.tsx, src/health.css        | Personal synthetic records and reviewed report import                          | Keep personal state isolated from clinician/research state |
| src/api.ts                              | Frontend API transport                                                         | Coordinate error handling and server contracts             |
| shared/contracts.ts                     | Clinician/research models, supported prompts, versions and matching constants  | Agree contract and version changes before parallel edits   |
| shared/health.ts                        | Health models, validation and trend keys                                       | Keep UI and API validation aligned                         |
| server/data.ts, server/analytics.ts     | Server-only historical rows, deterministic matching and protected aggregates   | Do not export historical rows to the client                |
| server/copilot.ts                       | Allowlisted, grounded response templates                                       | No model invocation or free-form intent routing            |
| server/health-data.ts, server/health.ts | Bundled reports, authorized personal records, sharing grants and visit actions | Patient ownership, doctor authorship, no cohort data flow  |
| server/app.ts, server/index.ts          | Express routing, request limits, response headers, CORS and static hosting     | Preserve API-wide no-store behavior                        |
| vite.config.ts, capacitor.config.ts     | PWA asset caching and native packaging foundation                              | No API caches or unapproved native permissions             |
| tests/, tests/browser/                  | Node unit/API tests and Playwright desktop/mobile-emulation tests              | Preserve safety and regression coverage                    |

## Authenticated application

The requested [ADR 0002](decisions/0002-authenticated-synthetic-workspaces.md) adds:

- `server/runtime.ts`: Better Auth, SQLite schema initialization, versioned synthetic provisioning,
  eight-hour login sessions, generated local secrets and persistent records.
- `shared/care.ts`: role, sharing, care snapshot and visit contracts with technical visit validation.
- `server/health.ts`: authorized patient reads/writes, full-record sharing grants and doctor-owned
  visit drafts, finalization and preserved amendments. The server checks ownership on every request.
- `src/Session.tsx`: login/logout and session-expiry boundary. No tokens in browser storage.
- `src/MyHealth.tsx` and `src/Visits.tsx`: shared readings/report display, patient editing, doctor
  patient selection, visit authoring and patient-readable finalized records.
- `Dockerfile`, `compose.yaml`: production UI/API in one app container, one-shot volume-permission
  initialization, persistent named volume, loopback host binding and HTTP health check.

The clinician patient tab now selects shared patients. Alex Morgan's original timeline remains
accessible from the Buddy cohort page as a separate reference scenario. Reference matching,
templates, evidence and briefs never receive the selected patient's records.

## Runtime

Node.js 22.13+ and npm; React 19, TypeScript strict mode, Vite 6, Express 5, and Capacitor 7.
Development uses Vite on 5173 with an API proxy to Express on 3001. Production builds place web assets
in dist/; Express serves those assets and /api on one origin. The server runs through tsx, so current
hosting requires development dependencies too. Secrets never belong in VITE_* build-time variables.
The hardened container instead runs compiled `server/index.js` from `npm run build:server`.
It copies only production dependencies and UI assets into a patched Alpine runtime with a
digest-pinned Node 22 binary. npm, Yarn, TypeScript, tsx and esbuild remain outside the runtime
image. The local development/start commands still use tsx. The server-only compiler output is
ignored under `.local/server-build`; it is not committed or served directly from that directory.

## Independent data flows

- Clinician requests use the fixed synthetic patient and server-computed cohort/study aggregates.
  The server recomputes evidence and metrics rather than trusting client-supplied results.
- My Health requests use /api/health-demo, identified by an HttpOnly authenticated session cookie,
  not a caller-provided session/patient ID. SQLite persists patient records beyond login expiry.
  Report imports require reviewed fields and explicit confirmation; the API validates the entire
  import before changing records. Doctors use /api/care/patients and patient-specific read/visit routes.
- Sign-in, sign-out and session reads are the only exposed Better Auth routes. Registration, role
  changes and account deletion are not public APIs. Mutations require the configured exact origin.
  The bounded JSON body is reconstructed for the auth Fetch handler after Express parsing; the raw
  Node handler must not be mounted after a body parser. Login rate limiting uses the socket address,
  not untrusted forwarding headers. Proxy trust requires separate explicit configuration.
- Shared access includes existing and future personal records and finalized doctor visits, but not
  other doctors' drafts. Revocation blocks subsequent reads/writes; finalized visits remain stored.
  Views refresh on focus/reconnection and failed access clears doctor data. Already viewed or
  downloaded information cannot be retracted; there is no real-time push revocation channel.
- No personal-entry flow enters matching or study outputs. No API response enters service-worker
  caches. Offline mode serves the application shell; health writes are disabled.

## Selected-patient fictional research

[ADR 0004](decisions/0004-selected-patient-research.md) records the requested narrow exception.
`src/App.tsx` owns the in-memory selected patient ID; `src/PatientResearch.tsx` renders selected-patient
cohort/study views and rejects stale requests on navigation/focus refresh. Offline/error states clear
research results. `GET /api/care/patients/:id/research` checks doctor role and active sharing, reads only
current finalized visits, and projects confirmed condition sources. `server/patient-research.ts`
performs exact-label associations to independent versioned fixtures with cohort/cell suppression.
`shared/patient-research.ts` defines the additive response. No personal readings, revision history,
drafts, medication fields or summaries enter this matcher. Reference APIs and model activation gates
are unchanged. No schema migration, dependency or external service is involved.
`server/presentation-seed.ts` uses one-time provisioning migration 5 to append Jordan's explicitly
fictional finalized heart-failure visit to the existing visit tables without replacing records or
sharing grants. It respects the 200-visit limit. Condition fixtures v2 provide public-friendly
explanations, accessible documentation-count bars and a detailed invented study; these are not
clinical evidence. Sam's no-match view provides the routine-care presentation comparison.

Buddy cohort and Research study retain the main-branch reference UI (comparison slider, checkboxes,
matching action, study metrics, site table and evidence tools). Selected-patient details appear in an
additional, separately labelled section on each page, independently of reference API loading/errors.
The reference banner links to that section and explains that reference controls, metrics and Copilot
never operate on the selected patient. Reference filter changes do not alter condition-label matches.

## Authoritative details

- [Clinician matching, disclosure controls, routes and deployment](../demo/implementation.md)
- [My Health routes, validation, storage limits and simulated scanning](../demo/my-health.md)
- [Native delivery prerequisites and release gates](../demo/native-roadmap.md)
- [Architecture baseline decision](decisions/0001-synthetic-prototype-baseline.md)

Extend these sources when their behavior changes rather than copying large specifications into
multiple files. Architectural changes require the decision workflow before implementation.
