# 0005: Selected-patient study and complete fictional scenarios

- **Status:** Proposed; implementation requested; teammate review pending.
- **Approval context:** On September 21, 2026 the requester asked to replace Alex Morgan on
  Research study with the selected patient, audit stored data first, and fill synthetic gaps for
  every existing patient. After the audit, they explicitly selected "Add context and a matched
  scenario for every patient." No shared approval URL or reviewer was supplied. This records
  authorized implementation scope, not ADR acceptance or merge/release approval.

## Audit and decision

The local SQLite audit found 412 personal entries and three loaded synthetic checkups for each
of Sam, Jordan and Casey. Sam had no visits; Jordan had a finalized confirmed heart-failure
scenario; Casey had a finalized provisional sample visit. All existing readings have source
metadata. Unlike Alex's reference fixture, profiles contain no structured age band, presentation,
environment, scenario timeline or completeness disclosures. Numeric checkup coverage is already
richer than Alex's, so copying his febrile observations is neither necessary nor appropriate.

| Data category                                 | Alex reference                                        | Local patients before migration 6                                                   | Decision                                                                   |
| --------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Identity                                      | Fixed name and reference ID                           | Three account-owned names and persona IDs                                           | Use selected authorized identity                                           |
| Age band, presentation and environment        | Fixed authored context                                | No structured profile context                                                       | Add distinct explicitly fictional context                                  |
| Timeline and provenance                       | Fixed events and evidence IDs                         | 412 sourced entries each; visits vary                                               | Preserve records; add versioned scenario source and timeline               |
| Confirmed condition                           | Fixed reference conditions                            | Jordan confirmed; Sam absent; Casey provisional                                     | Add separate Sam/Casey scenario visits, never reinterpret readings         |
| Observations and renal tests                  | A few temperatures, oxygen/pulse; renal result absent | Broad checkups, including renal tests and heart rate; no equivalent febrile episode | Do not copy Alex's values or fabricate the same illness                    |
| Medications and allergies                     | Old medication list; allergies unverified             | Casey has a fictional prescription, not verified reconciliation                     | Preserve authored prescriptions; disclose unknown reconciliation/allergies |
| Confirmation, exposure, vaccination, outcomes | Explicitly unavailable                                | Not established by the scenario seed                                                | Keep explicit unknowns, not invented negative results                      |
| Enrollment and sites                          | Independent WINTER-26 generator                       | No patient enrollment data                                                          | Use independent associated-study counts; never claim enrollment            |

Add fixed, clearly labeled fictional context for all three personas in a separate
`patient_research_context` table. An additive one-time transaction (migration 6) adds a confirmed
hypertension visit for Sam and a confirmed asthma visit for Casey under their existing fictional
authors, with initial revision provenance. Jordan's existing presentation is never recreated or
reconfirmed, including if it was amended. Existing equivalent finalized confirmed labels are not
duplicated. A full 200-visit workspace keeps its existing visits and an honest no-match state.
No readings, prescriptions, existing visits/revisions or sharing grants are overwritten.

This explicitly replaces Sam's previous default no-match presentation, not the no-match behavior
itself. Unknown allergies, reconciliation, vaccination/exposure, confirmatory tests and outcomes
remain disclosed unknowns, not fabricated negative findings. Context uses `patient-scenarios-v1`
and is a fixed seeded background, not a current medical assessment. It is not a matching input.
Study explanation fixtures advance to `condition-fixtures-v3`; label matching remains
`finalized-confirmed-exact-label-v2` because its inputs and algorithm are unchanged.

Research study must prioritize the authorized selected patient and their condition-associated
fictional studies, never substitute Alex or WINTER-26 during loading, no-match, denial or offline
states. The original reference scenario, matching controls, study and deterministic Copilot remain
available only in an explicitly separate reference experience. Study operational counts are
independent fixtures, never claims of patient enrollment or generated from personal entries.

## Compatibility with the population extension

The merged [200-patient extension](0005-expanded-synthetic-cohort-demo.md) preserves these three
scenarios while adding 197 separate patient accounts and retaining the cohort presentation
components. Research study remains selected-patient first. Combined `condition-fixtures-v4` retains
the richer study explanations with 80 heart-failure cases and 40 for each other supported label,
200 independent cases in total. Label matching remains v2; no workspace readings enter the counts.

Both branches previously used migration marker 6. Population provisioning now records marker 7.
The presence of the scenario context table distinguishes a completed scenario migration from an
earlier population-only marker 6. The former remains a no-op, including after amendments; the latter
receives the additive scenario transaction. No migration history, visits or grants are reset.

## Boundaries

Only current finalized author-confirmed condition labels determine research associations under
ADR 0004. The additive context response requires the same doctor role and active sharing grant.
No personal readings, draft visits, prescriptions or historical revisions enter matching. No
clinical inference, model, external service, new dependency, authentication change, browser
persistence or real data is introduced. Existing no-store and revocation safeguards remain.

## Validation and rollback

Test additive/idempotent provisioning, existing records/grants, visit capacity, amendments and
provenance; authorized context reads, all three condition matches and explicit no matches; selected
identity, switching, stale responses, denied access and offline clearing on desktop/mobile. Run
the repository's format, type/build/unit/API, browser and whitespace gates.

Back up the local database with SQLite's backup API before applying the seed. Reverting UI/code
does not delete stored context or visits. Authors can amend seeded diagnoses through existing
revision-preserving controls. Never reset migration history or erase a volume to roll back.

## Local verification (September 21, 2026)

These results describe the scenario branch before integration with the population extension.

- `npm run format:check`: passed.
- `npm run check`: TypeScript, production PWA/server builds and all 57 unit/API tests passed.
- `node --import tsx --test tests/presentation-seed.test.ts tests/patient-research.test.ts`:
  all eight focused migration/association tests passed, including rollback and preserved grants.
- `npx playwright test tests/browser/research-layout.spec.ts tests/browser/patient-research.spec.ts tests/browser/workspace.spec.ts`:
  all 20 selected-patient/reference tests passed on desktop Edge and mobile emulation. Screenshots
  were inspected and overflow checks passed.
- `npm run test:e2e`: 40 passed, six failed. All failures are in the existing `review.spec.ts`
  journeys waiting for the absent **Doctor workflow** selector. Committed HEAD already lacks that
  selector in `src/MyHealth.tsx` while the committed tests require it; this component is unchanged.
  No test was skipped, no timeout increased, and no model pilot enabled. The full browser gate is
  not green; this separate baseline mismatch remains outstanding.
- `git diff --check`: passed. Final tracked diffs and the new decision record were inspected.

The local SQLite store was backed up with its backup API in the protected, ignored `.local/`
directory before applying migration 6. Post-seed checks confirmed 412 personal entries per patient,
all original visits/revisions, imported-report markers and sharing grants unchanged, and a second
seed was a no-op. All three patients have scenario context; Sam/Jordan/Casey associate with
SYN-BP-26/SYN-HEART-26/SYN-RESP-26 respectively. Casey's original provisional visit is retained.

No Compose changes, Docker startup/restart validation, physical-device tests, remote CI or deployment
were performed for this change. Human review and shared approval tracking remain pending.
