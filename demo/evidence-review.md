# Local evidence-review pilot

## Status and boundaries

Implemented but **disabled by default**. The requester authorized the synthetic-only transient
data-purpose exception and Ollama implementation; model/corpus/reviewer approval is still absent.
ADR 0003 remains Proposed until a shared approval link and teammate review exist. No literature
is bundled, model installed, real inference run, or clinical safety claim made by this change.

Doctors choose **Doctor workflow → Evidence review (synthetic pilot)** after selecting a shared
fictional patient. Routine documentation and the reference research/Copilot are unchanged.
Disabled status is visible without making model calls. No environment variable activates the pilot.

The conservative model contract selects approved literature IDs and allowlisted review questions.
All displayed fact strings and excerpts come from server-owned sources, not model-authored prose.
Invented IDs, extra fields, duplicate references and incomplete generations fail closed. This is not
free-form evidence synthesis. A valid selection can still be irrelevant; inspect every source with
a qualified reviewer. No diagnosis, risk classification, prescribing, dosing or write-back is generated.

## Authorization, snapshots and limits

- GET/POST `/api/care/patients/:id/evidence-review` require an authenticated doctor, synthetic profile
  and active sharing. POST also requires the existing exact-origin check. All API responses use no-store.
- GET returns availability, allowed scenarios and an opaque SHA-256 snapshot token when enabled.
  POST accepts exactly `scenario`, `snapshotVersion`, `syntheticOnly: true`. It never accepts prompts,
  patient facts, aggregates, URLs or model parameters from the caller.
- Snapshot hashing covers all personal rows, finalized visits and grant timestamp. Up to 40 entries
  and 10 finalized visits are allowed; larger snapshots fail, never silently truncate. Personal notes,
  visit drafts, medication fields, account identities/emails and report originals are excluded from
  inference. Free-text labels, findings and finalized summaries remain untrusted source data.
- Measurement dates remain demo-local; values, units, glucose context and named tests are preserved.
  Snapshot labels are not clinical interpretation. Pulse, activity duration and recorded ranges are
  retained where present. Source excerpts are inspectable in the report; literature links are reviewed
  HTTPS URLs, never model-generated links.
- Session/grant/freshness checks run every 500 ms during inference and immediately before delivery.
  Changes discard the draft. Already viewed drafts cannot be remotely retracted; they are explicitly
  point-in-time. Focus/reconnection refresh, patient/workflow switch, cancellation and logout clear
  local state. No offline report cache, silent retry, storage or download is added.
- One request per app process, no queue; overload returns 429. The whole inference has a 60-second
  deadline; the browser allows 65 seconds for transport. Browser disconnect aborts the upstream fetch.
  Verify that the actual Ollama build releases compute after abort before activation.
- Evidence context max 23,000 UTF-8 bytes; serialized inference context max 24,000. Model inventory
  response max 65,536 bytes; inference response max 16,384 bytes. Context setting 8,192 tokens,
  output max 512 tokens, deterministic seed/temperature, no streaming/thinking, `keep_alive: 0`.
  Byte bounds are not a tokenizer guarantee; candidate-model evaluation must check truncation/fit.
- Only `http://127.0.0.1:11434/api/` is used; redirects, arbitrary endpoints, cloud fallback, tools,
  runtime literature searches, embeddings and model pulls are absent. The installed tag/digest must
  match the reviewed pin. Protect the local service and model files against concurrent changes.
- The app does not log prompts, records or model response text. Ollama logging, retention, proxies,
  outbound network behavior and compute cancellation must be separately inspected by the reviewer.

## Independent fictional coverage cohort

225 generated fictional rows cover 15 nonempty feature patterns, each with 15 balanced fictional
outcomes. Features are measurement kind/unit availability, not values or clinical diagnoses.
Cardiology considers BP, weight by unit and steps; pulmonology considers oxygen, temperature by unit
and steps. No units are converted. Jaccard retrieval threshold is 0.75; this is not clinical similarity.
No shared patient becomes a cohort row. Missing features produce no reportable cohort.

The whole aggregate, including its total, is suppressed below the existing minimum cohort size or
if any outcome cell is below the existing minimum cell size. No individual historical rows are
returned or sent to the model. Versions are independent of the fixed reference cohort. Fictional
outcomes are demonstrations of disclosure controls, never effectiveness evidence.

## Activation and evaluation procedure

1. Publish/link the planning issue and owner approval. Assign an implementing maintainer and qualified
   evidence reviewer. Approve exact scenarios, included fields, sharing-purpose language and treatment
   of existing grants. The current notice discloses the proposed purpose but does not collect new consent;
   an existing grant alone is not approval. Complete any required consent workflow before activation.
2. Review candidate artifact provenance/license/digest, literature content-use permissions and original
   summaries, correction/retraction checks, review dates, scenario applicability and evidence IDs.
   Do not copy copyrighted sources without permission. No discovered PMID is approved implicitly.
3. Set a separate reviewed evaluation configuration in `server/review-config.ts` while leaving the
   application activation config null. Document the evaluation protocol and human acceptance thresholds.
   Run the fixed-fixture smoke harness explicitly from the repository root:

   ```powershell
   node --import tsx scripts/evaluate-review.ts --run-local
   ```

   It uses only fixed synthetic fixtures and reviewed literature, no patient database, and prints only
   fixture IDs, schema pass/fail and latency. Without evaluation approval it exits without inference.
   Schema validity does not establish citation relevance, clinical accuracy or sufficient performance.
   Separately evaluate memory/acceleration, source relevance, adversarial selection, outages, deadline
   behavior and actual compute cancellation; record qualified review and thresholds/results.

4. After all approvals, submit a reviewed source change populating `APPROVED_REVIEW_CONFIG` with the
   pinned model, digest, corpus version, bounded article manifests and approval/evaluation evidence.
   Validation requires all metadata and hashes, but cannot prove human approval; code review is mandatory.
   Update the sharing notice/workflow as approved, rerun validation and restart the local app.
5. Use same-host local Node execution for the pilot. Docker loopback is inside the app container;
   the existing Compose configuration does not expose host Ollama or deploy a model service. Do not
   replace loopback with a remote hostname as a workaround without another reviewed architecture change.

Rollback sets activation back to null and restarts the owned app, without deleting records or changing
reference research. Drafts are transient; no database migration is needed.

## Validation

`npm run check` includes strict typing, production web/server builds and mocked unit/API tests for
contracts, pinning, byte bounds, roles/origin/grants, snapshot races, expiry/revocation, suppression,
overload and invalid inference. `npm run test:e2e` includes default-disabled and mocked desktop/mobile
UI, readable source text/links, focus, cancellation and patient-switch/offline clearing. These do not
exercise actual model behavior or physical devices. Model/artifact evaluation remains a separate gate.
