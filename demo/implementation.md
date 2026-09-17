# Implementation guide

## Delivery plan and current state

The original clinician flow below is now the **reference research demonstration** inside the
authenticated doctor workspace. Shared patient records and visits do not enter its matching,
Copilot or brief. See [My Health](my-health.md) for care flows and [CONTRIBUTING.md](../CONTRIBUTING.md)
for generated accounts, persistent SQLite and Compose startup. Except health status and supported
auth routes, APIs require authentication; reference endpoints additionally require the doctor role.
The authenticated demo uses one origin. Native/separate-origin authentication needs additional work.

1. PWA foundation and independent API — implemented.
2. Synthetic patient and evidence-linked timeline — implemented.
3. Deterministic cohort matching, aggregate disclosure controls and evidence matrix — implemented.
4. Bounded Copilot demonstration and review brief — implemented as exact-allowlist templates, not an LLM.
5. Synthetic study workspace, guided demo and automated tests — implemented.
6. Local authenticated synthetic workspaces and SQLite persistence — implemented; production identity, Azure integrations and governed AI remain future work.
7. Native app packaging, device testing and store submission — final delivery goal; see native roadmap.

## Structure

| Location                     | Responsibility                                                                    |
| ---------------------------- | --------------------------------------------------------------------------------- |
| `src/`                       | React PWA, responsive styles, API client and evidence interface                   |
| `shared/contracts.ts`        | Typed API models, supported prompts, matching versions and weights                |
| `server/data.ts`             | Server-only seeded historical data, current patient and synthetic study           |
| `server/analytics.ts`        | Validation, eligibility, score calculation and protected aggregates               |
| `server/copilot.ts`          | Fail-closed deterministic question routing and grounded templates                 |
| `server/app.ts`              | Express API and production static hosting                                         |
| `tests/`                     | Analytics, privacy, safety, numerical fidelity and API tests                      |
| `tests/browser/`             | Full demo journey, filtering, evidence focus, offline behavior and manifest tests |
| `scripts/generate-icons.mjs` | Reproducible PNG icon generator with no external image dependency                 |
| `capacitor.config.ts`        | Native package identity and local web-assets configuration                        |

## Local commands

```powershell
npm ci
npm run dev
# Production, including PWA service worker:
npm run build
npm start
# Validation:
npm run check
npm run test:e2e
```

Development uses Vite on 5173, proxying `/api` to Express on 3001. Production Express serves both `dist` and `/api` on port 3001 (or `PORT`). The source-running API uses `tsx`, so production hosting must install development dependencies too, or introduce a separately compiled server build before omitting them.

Docker now uses the separately compiled server (`npm run build:server`) and prunes development
dependencies before copying them to its final image. The container runs Node directly, without
npm, Yarn, tsx or esbuild. Local `npm start` remains the source-running developer entry point.

`npm start` does not load `.env` automatically. Set server variables in the host environment/PowerShell; Vite loads `.env` for `VITE_*` build-time values. Never place secrets in `VITE_*` variables.

```powershell
$env:PORT = '3001'
$env:APP_ORIGIN = 'http://localhost:3001'
npm start
```

## Deploy the web demo

Use a Node.js host (for example, Azure App Service with a supported Node 22 runtime) behind HTTPS. Build with `npm ci && npm run build`; start with `npm start`. Configure `PORT` to the host's expected listening port. Use one origin for the frontend and API. Do not publish only `dist` to a static host without also configuring a reachable API.

No cloud resources have been created and no deployment has been performed by this implementation. Provisioning, tenant permissions and host-specific configuration remain necessary. Local authenticated accounts are provisioned for synthetic demo use only. Public hosting still requires HTTPS, managed secrets, account recovery/provisioning policies and security review; do not expose the local demo configuration as a real-user service.

## Deterministic matching

Dataset: `synthetic-v1.0`, seed `2026`, 480 fictional records. Scenario date: January 15, 2026, intentionally fixed so demonstrations and evaluations remain reproducible.

Eligibility: provenance present, completeness at least 70%, historical year at least 2024, fever present. These are hackathon design rules, not clinically validated thresholds.

| Dimension      | Component                           | Weight |
| -------------- | ----------------------------------- | -----: |
| Symptoms       | Jaccard similarity                  |     25 |
| Conditions     | Jaccard similarity                  |     20 |
| Course         | `max(0, 1 - abs(duration - 4) / 7)` |     20 |
| Environment    | Mean season and climate agreement   |     15 |
| Age band       | Exact band agreement                |     10 |
| Record quality | Completeness fraction               |     10 |

Weights sum to 100 and are fixed in `match-v1.0`. Configurable filters set score threshold (50–95 in steps of 5), same environment, laboratory confirmation, and recorded follow-up. Threshold comparisons use the unrounded score; means and percentages are rounded to one decimal at presentation. Scores are retrieval indicators, not disease probabilities.

The opaque cohort ID is a hash of data/matching versions and validated canonical filters, not an individual identifier. Changing data generation or matching behavior requires a version change.

### Disclosure boundaries

- Historical rows stay in server modules, never the frontend bundle or response body.
- Cohorts smaller than 10 return no selected size, means, comparisons or distributions.
- A distribution with any observed cell smaller than 5 is withheld entirely, preventing simple subtraction using other categories and the cohort total.
- Data-source total and baseline eligible count are synthetic operational counts, independent of user filters.
- These controls do **not** provide differential privacy or prevent every repeated-query differencing attack. Real data requires authorization, query-history controls, release review, broader suppression and institution-specific governance.

### Known matching limitations

Medication compatibility, vaccination, renal/hepatic function, detailed laboratory values, urban/rural similarity, exposure and symptom severity are not scored in v1. These are explicitly disclosed. Diagnostic categories, confirmation status, treatment and outcomes are fictional independently generated attributes; the app does not infer relationships among them. Each historical case has one recorded category per displayed distribution, with the selected cohort as denominator.

## API

All `/api` responses have `Cache-Control: no-store`. Request bodies are bounded to 8 KB. Questions are limited to 1,000 characters. CORS does not grant wildcard access; configure exact origins only when separate hosting or native shells require it.

| Method | Route          | Input                                          |
| ------ | -------------- | ---------------------------------------------- |
| GET    | `/api/health`  | None; synthetic mode/version status            |
| GET    | `/api/patient` | None; fixed current synthetic patient          |
| GET    | `/api/study`   | None; study-level and broad site aggregates    |
| POST   | `/api/cohort`  | `CohortFilters`                                |
| POST   | `/api/copilot` | `{ question, filters: CohortFilters or null }` |
| POST   | `/api/brief`   | `{ filters: CohortFilters or null }`           |

Example cohort request:

```json
{
  "minScore": 65,
  "sameEnvironment": true,
  "confirmedOnly": false,
  "requireFollowup": false
}
```

The API recomputes metrics rather than trusting client-provided numbers. Evidence objects accompany the patient/cohort/study response so the dialog always shows evidence for that snapshot. Filter changes invalidate the selected cohort and Copilot answer in the UI.

## Copilot boundary

This release deliberately has **no model call**. Exact supported questions map to reviewed templates. Any other input fails closed; there is no keyword-based attempt to infer safe free-form intent. No source record is interpreted as an instruction. React renders all content as text, with no raw HTML insertion.

Future Foundry integration should use managed identity on the server, approved read-only tools, schema-validated output, citation validation, deterministic numeric substitution and an expanded evaluation suite. An allowlist demo is not evidence that a future generative model will be safe.

## PWA behavior

- Vite PWA generates the manifest, precache and service worker for production builds.
- Local assets (no external fonts/CDNs) support offline shell startup.
- No API runtime caching, local storage or IndexedDB stores patient/research responses.
- An offline reload shows the app frame and retry message, not previously fetched patient data.
- Already displayed synthetic results remain in memory until reload, with an offline warning.
- Update prompt lets the user activate a new service worker intentionally.
- HTTPS or localhost is required. Mobile install prompts vary by browser; Safari uses Add to Home Screen.

## Before using real data

Authentication/Entra, server-side authorization and tenant isolation; access auditing without leaking prompts or PHI; data-use agreements and consent; retention rules; clinical validation; secure clinical ingestion; differential disclosure controls; monitoring and abuse prevention; threat modeling and independent safety/privacy review are all outstanding. No HIPAA or other compliance claim is made.
