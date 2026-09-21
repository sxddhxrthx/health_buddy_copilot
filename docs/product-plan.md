# Product plan

## Direction

Research Twin demonstrates evidence-linked reference research and authenticated synthetic patient
and doctor workspaces. Maintain one React/TypeScript experience with an Express API, delivered first as a
PWA, with Android/iOS packaging as a longer-term goal. This is not a clinical service.

This document distinguishes the shipped baseline from future intent. An idea in the README's original
vision or a roadmap is not an assigned implementation task.

## Implemented baseline

| Area                   | Current capability                                                                                                        | Detailed source                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Clinician workspace    | Fixed January 2026 synthetic patient, provenance, timeline and missing-data disclosures                                   | [Implementation guide](../demo/implementation.md) |
| Research               | Deterministic matching over 480 fictional historical cases, protected aggregates, evidence matrix and synthetic study     | [Implementation guide](../demo/implementation.md) |
| In-app Copilot         | Exact-allowlist templates, evidence-linked answers and Markdown review brief; no model calls                              | [Demo walkthrough](../demo/demo-script.md)        |
| My Health              | Sam Taylor persona, 16 seeded readings, manual CRUD, latest cards, trends, searchable/filterable timeline and reset       | [My Health guide](../demo/my-health.md)           |
| Simulated digitization | Two bundled reports, predefined extraction, editable review, confirmed atomic import, provenance and duplicate protection | [My Health guide](../demo/my-health.md)           |
| Delivery               | Responsive PWA, offline application shell, update/install UI, Capacitor configuration and automated regression tests      | [Native roadmap](../demo/native-roadmap.md)       |

## Approved collaboration work

Establish shared agent instructions, explicit task ownership, versioned decisions, issue/PR templates,
and automated validation. This work does not authorize new application behavior or dependencies.

After this setup, select each implementation task through a shared issue containing scope, acceptance
criteria, exclusions, affected components, an owner, and a human reviewer. No additional feature
milestone is assigned by this document.

## Requested authenticated milestone

The project owner selected Option A on September 17, 2026. The implementation in this working tree
adds Better Auth, persistent SQLite, provisioned fictional patient/doctor accounts, full-record
sharing with selected doctors, a shared-patient selector, and doctor-owned visit drafts/finalization/
amendments. Patients see finalized visits but cannot edit them. Doctor navigation retains Current
patient, Buddy cohort and Research study; patient navigation contains My Health only. The fixed
Alex Morgan scenario remains an explicitly separate reference demo, not the selected patient's cohort.

One-command Docker Compose initialization and reproducible source-controlled synthetic seeds are
included. See [ADR 0002](decisions/0002-authenticated-synthetic-workspaces.md) for the scope, limitations,
and pending teammate review/shared approval link. This is not a claim of merge or release approval.

## Requested report-range view

The September 18, 2026 requested patient report-range view is recorded in
[ADR 0003](decisions/0003-report-range-body-view.md). My Health and the doctor's selected shared-patient
tile open the same read-only body map, restricted to the authorized patient snapshot. It highlights
latest readings outside their own saved report ranges and exposes chronological
history with exact values and sources. There are no built-in medical cutoffs, organ-health scores
or severity estimates. Body regions are navigation groups; vitamins, HbA1c and unmapped measures
use the general/systemic group. Missing/ambiguous ranges remain unknown. Human review is pending.

## Requested richer demo

The owner approved Three.js and optional sample loading in [ADR 0004](decisions/0004-3d-map-and-synthetic-checkups.md).
The expanded catalogue has 126 numeric measurements plus six qualitative findings on each of three
dates (396 entries), with contrasting circulation, liver/kidney and vitamin/mineral profiles.
It is not a recommended screening package. The 3D view adds count-sized hotspots and rotation with
the existing 2D fallback. Provider/wearable cards are nonfunctional Coming soon previews only.
See [the research and source references](lab-catalog-research.md). Human review remains pending.

## Future direction: separate approval required

### Requested selected-patient integration

The September 18 implementation request is recorded in
[ADR 0004](decisions/0004-selected-patient-research.md); teammate review and shared approval tracking
remain outstanding. Current patient selection now persists in memory across Buddy cohort and
Research study. Supported doctor-confirmed labels in current finalized visits select independent
fictional cohort aggregates and bundled fictional studies. Unsupported/absent labels return no match.
Personal entries, measurements, drafts and prescriptions do not drive matching. Reference research
and the disabled evidence-review model pilot remain separate. No automatic illness detection is added.

The requested presentation extension adds one explicitly fictional advanced-heart-failure visit
for Jordan, independent 120-case documentation aggregates and a plain-language fictional study.
Sam remains the simpler routine-care/no-match comparison, not a clinically verified healthy control.
One-time additive provisioning preserves existing entries, visits, revisions and sharing settings;
see ADR 0004 for the capacity exception and outstanding review.

### Still deferred

- Native Android/iOS packaging, physical-device validation, signing and store delivery follow the
  [native roadmap](../demo/native-roadmap.md); configuration alone is not a released native app.
- Production identity lifecycle, governed cloud/AI integrations, FHIR/EHR ingestion and real-data
  support need explicit architecture, security, privacy, and intended-use decisions first.
- Partial disclosure, specialist-focused prioritization and clinical-similarity matching are deferred.
- Real OCR, arbitrary report uploads, camera/device permissions, and synchronization are not part of
  the current My Health scope.

## Non-goals and release boundaries

Do not turn the prototype into an automated diagnostic/prescribing system or suggest that synthetic
patterns are medical evidence. Doctor-authored fictional prescriptions are documentation only, not
valid prescriptions or pharmacy transmissions. Do not blend personal records with research cohorts,
connect a live model, or enable real data merely by changing an endpoint. Production secure retention, clinical and
privacy review, and native release gates remain outstanding. Preserve the boundaries in
[AGENTS.md](../AGENTS.md) and the existing detailed implementation guides.

## Changing direction

Propose scope changes in an issue; record architecture-changing choices in a
[decision record](decisions/README.md). The project owner approves product direction and a teammate
reviews implementation. Update this plan and affected guides in the same reviewed change. Neither
agent may treat its private conversation, generated plan, or unapproved proposal as shared approval.
