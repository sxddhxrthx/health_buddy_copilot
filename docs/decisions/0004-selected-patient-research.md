# 0004: Selected synthetic patient research navigation

- **Status:** Proposed; implementation requested; teammate review pending.
- **Approval context:** On September 18, 2026 the requester said “implement the changes”
  after the proposed synthetic-only cross-page scope and clinician-confirmed condition
  matching were summarized. No shared issue/approval URL or reviewer was supplied.
  This records implementation scope, not merge/release approval or ADR acceptance.
- **Plan:** Lift patient selection into the authenticated workspace; add an authorized,
  deterministic condition-to-fixture endpoint; render patient-specific Buddy cohort and
  Research study views; test switching, authorization, exclusions and no-match behavior.

## Decision and boundaries

Current patient, Buddy cohort and Research study retain the same in-memory patient ID.
Only doctors with an active sharing grant can request the selected patient's research.
The server uses exact, case-insensitive labels from current finalized visits marked
confirmed by their author: advanced heart failure, hypertension, type 2 diabetes and asthma. These labels are
technical demo keys, not a clinically validated vocabulary. Unsupported text, provisional
diagnoses, drafts, historical revisions, personal entries, measurements, medications and
visit summaries do not drive matching. No automatic serious-illness detection is added.

This narrow exception permits finalized doctor-confirmed labels to select separately
versioned, wholly fictional cohort aggregates and bundled fictional study descriptions.
It does not blend patient records into historical rows, infer severity, establish trial
eligibility, or recommend treatment. Aggregate minimum cohort/cell controls apply; raw
fictional rows remain server-side. Unmatched conditions have an explicit no-match state.
The original Alex Morgan reference matcher, Copilot and briefs remain isolated and unchanged.
ADR 0003's model pilot remains disabled; this flow does not call or activate inference.

No dependency, authentication, database schema, browser persistence, external search,
native permission or real-data support is added. Existing no-store and session/grant
checks apply. Views refresh on navigation, focus and reconnection, discard stale responses,
and clear results on errors/offline; there is no push revocation channel.
Sharing language explains this local fictional research use.

## Requested presentation extension

The requester selected adding Jordan's fictional confirmed heart-failure visit to the saved demo
workspace while preserving existing records and keeping Sam as the routine-care comparison.
This records that conversation's implementation scope only; teammate review and a shared approval
link remain outstanding, and this ADR remains Proposed.

An additive, transactional provisioning migration (version 5) adds one finalized Jordan visit under
the fictional Avery author, with explicit seed provenance and a preserved initial revision. It runs
once for existing and fresh stores, never overwrites records or grants, and permanently skips the
seed when Jordan already has 200 visits. Amendments use the existing author/revision controls and
are never undone on restart. Personal readings are unchanged, not made to fit the story.

The exact label `Advanced heart failure` selects 120 independent fictional cases (90 notes present,
30 missing), a bundled study and plain-language explanatory text. Both fixture and association
versions advance to v2. No symptom/measurement/severity inference, real publication, eligibility or
treatment claim is added. Optional presentation metadata extends the response compatibly. Sam's
no-match view is a routine-care presentation comparison, not a declaration of normal readings or
good health. The label-based scenario background is static educational fixture text, not extracted
from the selected patient's visit summary.

Rollback must preserve records: reverting presentation code does not erase the seeded visit or its
revisions. The fictional author can amend the diagnosis/status using the existing UI if the research
association is no longer wanted. Do not remove the persistent volume or reset migration history.

## Alternatives and consequences

Keeping the reference-only pages preserves isolation but leaves the reported patient mismatch.
Inferring conditions from readings or free-text/model classification is excluded. Exact-label
matching is deliberately limited and may return no match for synonymous or compound text.
The patient selector remains on Current patient; selection lasts only until logout/reload.

## Validation and rollback

Cover condition normalization, excluded inputs, amendments, suppression, no matches,
authentication/roles/grants, switching and stale responses. Run repository formatting,
build/unit/API and desktop/mobile browser checks. Human review and shared approval tracking
remain outstanding. Rollback removes the additive endpoint and views without changing any
stored records; no migration or data reset is required.
