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

## Future direction: separate approval required

- Native Android/iOS packaging, physical-device validation, signing and store delivery follow the
  [native roadmap](../demo/native-roadmap.md); configuration alone is not a released native app.
- Production identity lifecycle, governed cloud/AI integrations, FHIR/EHR ingestion and real-data
  support need explicit architecture, security, privacy, and intended-use decisions first.
- Partial disclosure, specialist-focused prioritization and shared-patient cohort matching are deferred.
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
