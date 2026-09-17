# Initial evaluation results

## Formatting and runtime-image hardening - September 18, 2026

The two original formatting failures in index.html and scripts/generate-icons.mjs were fixed with
the existing Prettier configuration. The complete `npm run format:check` gate now passes.

The runtime image now uses patched Alpine packages and a digest-pinned Node 22 binary. The server
is compiled with `npm run build:server`, and development dependencies and package managers are not
included in the runtime. `npm run check` includes server compilation and is run in the Docker build
stage before pruning. Local source-running development remains unchanged.

- `docker compose up --build --wait`: passed; its Linux build ran the full check gate, including
  the PWA build, compiled server and 31 passing unit/API tests.
- `npm run test:e2e`: 16 desktop/mobile browser tests passed against the isolated test server.
- Disposable hardened-container smoke test: non-root/read-only execution, SQLite initialization,
  patient/doctor authentication and PWA asset delivery passed. Build executables were absent.
- Trivy 0.74.0 scanned the hardened candidate image
  `sha256:d59e326d94e75cb08dce80eac26631d6480f5868a3d098e3d7927ba1cc33a3b9`:
  19 Alpine packages and 134 Node packages, zero reported vulnerabilities across all severities.
  The scan used a local image archive, without mounting credentials or the live data volume.

VS Code still reports 2 critical and 7 high findings for the upstream Alpine base before the
Dockerfile's package upgrades. That diagnostic has not been suppressed and is distinct from the
built-image scan above. Docker Scout could not run without Docker Hub login. A clean Trivy package
scan is not proof of application security, exhaustive binary coverage, or production readiness.
The earlier validation sections below are historical results, not the current formatting status.

## Compose validation - September 18, 2026

Tested the existing Node 22 Alpine image with Docker Desktop's Linux engine. The default command
initially failed with `ports are not available` because the previously launched local Node demo
still owned port 8080. No Dockerfile or application change was needed for this failure. Stopping
that identified local demo freed the port; unrelated processes and stored demo data were preserved.
CONTRIBUTING.md now documents the collision and the supported alternate-port command.

- `docker compose up --build --wait`: passed on the default localhost:8080 after freeing the port;
  the initializer exited successfully and the app became healthy. The initial run also successfully
  created the named volume and provisioned the database using `DEMO_PORT=8081`.
- `docker compose config --quiet`: passed.
- Container API smoke check: patient/doctor login, role restrictions, shared-patient access,
  synthetic record creation and no-store headers passed.
- `docker compose restart app`, followed by `docker compose up --no-build --wait`: passed. Existing
  records, a newly created probe reading, sharing and both login sessions survived the restart.
  The probe reading was then deleted and the smoke-test sessions signed out.
- The browser loaded the Compose-served sign-in page on localhost:8080.
- Required regression checks: `npm run check` passed (production PWA and 31 unit/API tests);
  `npm run test:e2e` passed (16 desktop/mobile browser tests); `git diff --check` passed.
- The two edited documents pass Prettier. Repository `npm run format:check` still reports the
  existing issues in untouched index.html and scripts/generate-icons.mjs.

These checks validate local Linux startup and SQLite's native driver, not production security,
remote CI, clinical use or image-vulnerability remediation. The earlier image-scanner findings
below have not been rescanned or resolved by this startup fix.

## Authenticated milestone validation - September 17, 2026

Observed locally on Windows with Node 22.23.2, for the requested Option A implementation:

| Check                                                                                   | Observed result                                                                                          |
| --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `npm run check`                                                                         | Strict TypeScript and production PWA build passed; 31 unit/API tests passed                              |
| Focused `node --import tsx --test tests/runtime.test.ts` after final session-cap change | 4 passed                                                                                                 |
| `npm run test:e2e`                                                                      | 16 passed across desktop Edge and mobile Chromium emulation                                              |
| Desktop/mobile care screenshots                                                         | Inspected; role-specific navigation and no visible overlap in the inspected views                        |
| `docker compose config --quiet`                                                         | Configuration validated; named volume, initialization ordering and loopback binding confirmed            |
| `npm run format:check`                                                                  | Fails on untouched baseline files index.html and scripts/generate-icons.mjs; not a clean formatting gate |

The Docker engine was unavailable and configured for Windows containers. Linux image build,
clean Compose startup, container restart and native-driver behavior inside Alpine have not been
validated. The editor image scanner flags the pinned Node Alpine base with 3 critical and 16 high
vulnerabilities; remediation/rescan is required before deployment approval. This is not a production
security claim. Remote CI, repository protections, physical devices and cloud deployment were not checked.

New tests cover login expiry, server-assigned roles, patient isolation, sharing/revocation, doctor
read-only personal records, private visit drafts, finalization, authorship, preserved amendments,
stale-revision rejection, logout, capacity limits, restart persistence and duplicate imports after
deletion. Browser tests use a recreated isolated SQLite store and no network traces. Generated
credentials and live databases remain outside Git. Teammate review and a shared approval link for
ADR 0002 remain pending.

## Original baseline results

Executed locally on Windows with Node.js 22.16.0. These results evaluate this synthetic deterministic prototype, not clinical validity or a generative AI model.

| Check                                                    | Result                                          |
| -------------------------------------------------------- | ----------------------------------------------- |
| Strict TypeScript check and Vite production/PWA build    | Passed                                          |
| Analytics and API tests                                  | 21 passed, 0 failed                             |
| Desktop Edge browser tests                               | 4 passed, 0 failed                              |
| Mobile Chromium (Pixel 7 viewport, Edge engine) tests    | 4 passed, 0 failed                              |
| npm dependency audit, including development dependencies | 0 reported vulnerabilities at time of execution |

## What the tests verify

- Seeded-data and cohort reproducibility; numerical fidelity and scoring bounds.
- Eligibility exclusions and stricter filter behavior.
- Minimum-cohort suppression and whole-distribution small-cell suppression.
- No historical identifiers in returned aggregate contracts.
- Patient, comparison and Copilot evidence references resolve.
- Fixed-date temporal fidelity and explicit missing-data disclosure.
- Unknown, medication, diagnostic, causality, trial-eligibility, prompt-injection and individual-disclosure requests fail closed under exact allowlisting.
- Server-side recomputation rather than trust in client-supplied metrics.
- Bounded request bodies, malformed input rejection and no-store API headers.
- Complete patient → cohort → evidence → refusal → review brief → study journey.
- Filter changes invalidate stale results.
- Evidence dialog opens, Escape closes it, and keyboard focus returns to its trigger.
- Manifest and icon delivery; offline shell reload does not show cached patient data; no `/api` responses in Cache Storage; connection retry succeeds.
- No browser page errors in the demo journey; no page-level horizontal overflow in the tested study viewports.

## Not yet validated

- Physical Android/iOS devices, Safari/WebKit, store packaging and native export.
- Production HTTPS installation end to end on real phones.
- Clinical correctness, clinical usefulness or real-world treatment/outcome relationships.
- Real-data privacy, resistance to repeated-query differencing, tenant isolation or regulatory compliance.
- Generative-model safety/grounding (there is no connected model).
- Full WCAG audit, screen-reader verification, load testing or external penetration testing.

Reproduce with `npm run check` followed by `npm run test:e2e`. Browser tests currently require Microsoft Edge installed.
