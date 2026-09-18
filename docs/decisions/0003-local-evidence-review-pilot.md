# 0003: Synthetic patient-specific local evidence-review pilot

- **Status:** Proposed; implementation explicitly requested, activation blocked on review.
- **Issue:** [Local planning issue draft](../planning/local-evidence-review-pilot.md); no shared issue URL supplied.
- **Owner and reviewer:** Requesting project owner; implementing developer and human reviewer unassigned.
- **Approval:** On September 18, 2026, after requesting the complete implementation, the requester
  explicitly selected: “Approve the synthetic-only patient-to-research exception and local Ollama
  integration; keep activation gated until model, corpus, and reviewer approval.” This authorizes
  implementation, not activation or release. No shared approval URL or teammate review has been
  supplied; this ADR is not Accepted.
- **Supersedes:** None now. If accepted, introduces a narrowly scoped exception to the personal-record
  research isolation in ADRs 0001/0002 and AGENTS.md. Existing reference research remains isolated.

## Context and scope

Explore a clinician-only workflow that produces patient-specific evidence-review drafts from
fictional shared records, a reviewed literature corpus, and separately generated synthetic cohorts.
This is a prototype evaluation, not clinical decision support or evidence of treatment effectiveness.
Switching execution mode does not approve conflicting data boundaries or settle the model, corpus,
scenarios, reviewer, or operational limits.

The initial documentation-only plan has been followed by the explicit implementation request above.
The working tree now contains guarded orchestration, additive contracts, a separate doctor UI,
versioned measurement-coverage fixtures and a fixed-fixture evaluation harness. No dependency,
database migration, installed model or approved literature has been added. The default activation
configuration is null. See the [implementation/runbook](../../demo/evidence-review.md).

### Implemented conservative scope

The model selects reviewed literature IDs and allowlisted review questions only. It cannot author
clinical claims, patient values, citations, diagnoses or treatment advice. Server-rendered drafts
separate recorded facts, selected literature and fictional cohort observations. Source relevance is
not guaranteed by schema validity; qualified review remains required. This deliberately does not
implement unrestricted narrative synthesis or clinical matching. The pilot matcher compares only
measurement availability by kind/unit, with no inference about severity, diagnosis or effectiveness.
Cardiology/pulmonology are technical candidate selectors, not approved clinical scenarios.

## Proposed decision

### Separate workflow and authorization

The doctor explicitly chooses routine visit documentation or evidence review. The application never
classifies a patient as low risk, automatically starts research, or substitutes a model for the
existing deterministic Copilot. Proposed flow:

1. The authenticated doctor selects a currently shared synthetic patient and acknowledges fictional-only use.
2. Express checks the doctor role, session, exact request origin, and active sharing grant.
3. The server constructs a bounded snapshot from authorized records and approved finalized visit fields.
   Other doctors' drafts, credentials, account emails, and historical source rows are excluded.
4. A separately versioned pilot matcher computes protected aggregates server-side. Approved literature
   is retrieved from a versioned local corpus, not from model memory or patient-bearing web queries.
5. A bounded local Ollama request receives the minimal snapshot, permitted source material, and
   reportable aggregates. No cloud fallback, tools, arbitrary URLs, or filesystem access are exposed.
6. Express validates the structured response and references, then rechecks the session, grant and
   snapshot revision before releasing a draft. Changed access or records discard the result.
7. The UI labels the output as unverified and synthetic, links evidence, and requires qualified human
   review. Switching patients, logout, access failure, or cancellation clears pending/result state.

No patient records become cohort source rows, training examples, embeddings in a persistent store,
or inputs to the existing Alex Morgan study, matching, Copilot or brief. The proposed exception is
limited to transient query input for the separately approved pilot. Sharing language must explicitly
describe that use before activation; an existing full-record sharing grant alone is not assumed to
approve a new research purpose.

### Scenarios, cohorts and literature

- Cardiology and pulmonology are candidate pilot areas, not approved scenarios. A qualified reviewer
  must select specific fictional cases, expected missing information, exclusions and evaluation criteria.
- Do not repurpose the current respiratory matcher for unrelated clinical scenarios. Version the new
  generator, matching rules, feature definitions, missing-data behavior and fixture manifest separately.
- Include unsuccessful outcomes and missing follow-up in fictional cohorts. Preserve cohort/cell
  suppression and complementary disclosure safeguards; server-side recomputation remains authoritative.
  Retrieval scores are not diagnostic probabilities; synthetic patterns are not treatment evidence.
- Admit literature only after verifying identifiers, provenance, publication/version dates, corrections
  or retractions, permitted content use, and reviewer-approved scope. Record retrieval date, license
  evidence, content hash and review status per source. Open access alone does not establish reuse rights.
- External discovery, if later approved, uses generic terms only. No records, patient IDs, free-text
  notes, or prompts leave the local workflow. Runtime network literature search is excluded initially.
- Keep literature findings and fictional cohort observations visibly separate. No prescribing, dosing,
  diagnosis assignment, treatment ranking, automatic triage or assertions of real effectiveness.

### Proposed contract requirements, not implemented APIs

The request should carry only a patient identifier, approved scenario identifier, explicit
fictional-only acknowledgement and snapshot version. Reject unknown keys and client-supplied
records, cohorts, citations, model names, URLs or arbitrary prompts. Exact field names, limits and
error/status contracts require review before additions to shared/.

The response should identify the patient and immutable snapshot version, scenario, model artifact,
prompt/schema version, corpus version and matcher/generator versions. Its sections should separate
source-linked patient facts, literature findings, fictional aggregate observations, missing data,
limitations and clinician review questions. Citation IDs must resolve to the exact supplied source
set; URLs and bibliographic details are server-owned, never generated by the model.

Validate strict structure, field lengths, item counts, citation membership and numerical provenance.
Do not render partial, truncated or invalid responses. Citation existence does not prove that the
source supports a claim: semantic grounding and clinical appropriateness need human evaluation.
Treat record text and literature as untrusted data; prompt instructions alone are not a security boundary.

### Local inference and lifecycle

- Default off until approvals and evaluation gates pass. Bind inference to a fixed loopback endpoint;
  do not accept a client-selected destination or follow redirects. A container-to-host deployment
  topology requires separate review; loopback inside an app container is not the host Ollama service.
- Pin a reviewed artifact by full digest with license/provenance records. Fail closed on a digest
  mismatch or unavailable model; no automatic pulls, updates, alternate models or cloud fallback.
- Decide context/input/output byte and token budgets, timeout, cancellation and concurrency limits
  from measured performance. Reject overload rather than queue unbounded work or silently retry.
  Verify that cancellation releases inference resources, not merely the browser request.
- Keep drafts transient in server/browser memory only. No new database, browser storage, downloads,
  API caching, offline queue, prompt/record logging or model response tracing. Review Ollama's own
  logging, network behavior and retention rather than assuming that local inference guarantees privacy.
- Preserve no-store headers, existing cookie/session authorization, exact-origin restrictions and
  service-worker asset-only caching. No automatic write-back to visits or personal entries.

## Alternatives

1. Keep the current deterministic reference-only workflow: lowest operational and privacy risk, but
   does not demonstrate patient-specific synthesis.
2. Build a fixed-fixture local evaluation harness first: can assess model/schema behavior without
   crossing the shared-record boundary. This is the preferred next technical task after scoped approval.
3. Connect a cloud model or live search: excluded; introduces additional data-transfer and governance
   decisions and is not an authorized fallback.

## Consequences and safety

This proposal changes an explicit current boundary and cannot be activated through an environment
variable alone. Small local models may fabricate facts, cite irrelevant evidence or follow injected
instructions even with structured output. Conservative validation, refusal paths, source inspection
and a qualified reviewer are required; none establishes clinical suitability.

Local execution consumes shared workstation resources. Installed RAM and a graphics adapter name do
not establish available inference memory, GPU acceleration or acceptable latency. The readiness notes
in the planning issue are inventory observations only, not a model selection or performance claim.

## Validation and rollout

Before activation, obtain recorded owner approval of the exact data-purpose exception, patient-facing
sharing language, reviewer assignment, scenario/corpus selection, artifact/license pin and limits.
Update affected guidance in the same reviewed change; preserve reference-research isolation.

Use isolated synthetic stores and mocked inference for repeatable automated tests. Cover unauthenticated
and patient-role requests, other doctors' patients/drafts, revocation and session expiry during generation,
record edits, stale results after patient switches, injection, invented/irrelevant citations, malformed and
oversized responses, numeric/unit fidelity, suppression, overload, cancellation and outages. Assert no
new persistence, logging, API caches, silent retries or model calls through the deterministic Copilot.
Exercise keyboard/focus behavior, loading/error/offline states and desktop/mobile layouts.

Run repository formatting, check, browser and whitespace commands. Separately evaluate the actual pinned
model against human-reviewed fictional scenarios and adversarial cases, with pre-agreed acceptance
thresholds. A format/schema pass or small benchmark is not a clinical safety evaluation.

Roll out only to the local synthetic pilot after review. No schema migration is proposed initially.
Rollback disables the new workflow and clears transient work, retaining the original care/reference
flows and existing records. Do not reset databases or stop unrelated developer services.

## Documentation updates

Implementation updates AGENTS.md, product plan, architecture, sharing notice, setup/runbook,
typed contracts and tests. Record the shared approval URL and teammate review before changing
this ADR to Accepted. The gate is still closed; no model or corpus approval is inferred from code.
