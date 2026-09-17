# 0001: Preserve the synthetic prototype baseline

- **Status:** Existing baseline (documents implemented behavior; not new feature approval)
- **Context:** Two developers and their coding agents need a shared starting point without treating
  private conversations or aspirational roadmap entries as authority to redesign the application.

## Baseline

- One React/TypeScript PWA with an Express API; Node 22 tooling and existing Capacitor configuration.
- Deterministic server-side synthetic matching and protected aggregates. Historical rows remain
  server-only. In-app Copilot uses exact-allowlist templates, not model calls.
- My Health is a separate synthetic persona and server-memory session store. Only its session ID is
  persisted in browser sessionStorage; personal records do not enter clinician/research cohorts.
- Scanning is simulated with bundled reports; imports require review, atomic validation, provenance
  and duplicate protection. No camera, real OCR, or arbitrary uploads.
- API responses are no-store; offline support is limited to application assets, with no offline writes.
- Authentication, real-data governance, durable storage, cloud/model connections and native store
  delivery remain future work with separate approvals and release gates.

## Consequences

The demo remains reproducible and bounded, but is not a secure real-user health service or a clinical
product. Records can expire or disappear on restart. Browser emulation does not establish native or
physical-device readiness. New capability must not quietly weaken these boundaries.

## Alternatives and changes

No new architecture is selected here and no alternative is being newly rejected. Agents must not
infer authorization for a database, connected model, framework rewrite, or real-data ingestion from
the original product vision. Propose a new ADR with alternatives when such work is actually scoped.

## Evidence and validation

See [architecture](../architecture.md), [implementation](../../demo/implementation.md),
[My Health](../../demo/my-health.md), and [native roadmap](../../demo/native-roadmap.md).
Existing tests cover deterministic matching, disclosure safeguards, API behavior, personal sessions,
report imports, and desktop/mobile browser journeys. Run the checks in
[CONTRIBUTING.md](../../CONTRIBUTING.md); this record does not assert a particular run passed.
