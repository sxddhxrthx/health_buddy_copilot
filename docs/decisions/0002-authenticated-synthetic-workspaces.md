# 0002: Authenticated synthetic patient and doctor workspaces

- **Status:** Proposed; implementation requested, teammate review pending.
- **Issue:** Not supplied. This record captures the requested scope for a shared issue.
- **Owner and reviewer:** Requesting project owner; human reviewer not yet assigned.
- **Approval:** On September 17, 2026, the requesting user approved Option A: Better Auth,
  SQLite, deterministic synthetic seeds, and one-command Docker Compose startup. No shared
  approval URL or teammate review has been supplied; do not mark this record Accepted yet.
- **Supersedes:** On acceptance, replaces the anonymous personal-session and persona-isolation
  portions of [0001](0001-synthetic-prototype-baseline.md). Research isolation remains unchanged.

## Context and scope

Patients need their own authenticated workspace. Doctors need a selectable list of patients who
have shared with them, read-only access to those patients' records, and an encounter workflow for
authoring fictional diagnoses and prescriptions. Patients can read finalized visit records but
cannot change them. Partial disclosure and specialty-specific prioritization are deferred.

## Proposed decision

- Integrate Better Auth with the existing Express server and use SQLite through better-sqlite3.
  Provision fictional accounts locally; disable public registration and client role assignment.
- Use database-backed, expiring cookie sessions. Keep roles and record authorization server-owned.
  Check the active patient-doctor grant for every doctor read and visit write.
- Store patient-owned records, import provenance, grants, encounters and visit revisions separately.
  A patient shares all existing and future records with an explicitly selected doctor until revoked.
  The doctor selector returns only actively sharing patients, never a global patient directory.
- Patients edit only their own entries. Doctors edit only their own visit drafts. Finalization
  publishes a visit; subsequent corrections create a revision rather than overwriting the original.
  Other doctors cannot overwrite an author's visit. Revocation prevents further shared access,
  including to retained visits; it does not delete finalized records or retract prior downloads.
- Preserve all-or-nothing report import, duplicate protection, demo-local dates, unit-separated
  trends, API no-store, request limits, offline write prohibition and synthetic-only acknowledgements.
- Keep Alex Morgan and historical matching as a clearly labeled reference demonstration. Never
  present the fixed reference cohort, Copilot or brief as findings about a selected shared patient.
- Package the production UI/API/authentication together with a persistent local volume. Compose
  initializes migrations, synthetic fixtures and locally generated secrets before reporting readiness.
  Startup never resets existing records. No credentials or runtime database are checked into Git.
- Security follow-up requested September 18, 2026: compile the container server with the existing
  TypeScript toolchain, prune development dependencies, and copy the pinned Node binary into a
  minimal Alpine base patched during build. Local source-running development remains unchanged.
  Scan the built runtime image rather than treating a base-image warning as its final package report;
  retain warnings and report scanner limitations instead of suppressing vulnerability diagnostics.

## Alternatives

Better Auth with PostgreSQL adds a database server and supports greater write concurrency.
Keycloak with PostgreSQL additionally demonstrates a separate OIDC identity provider. Both are
reasonable future choices, but SQLite and embedded authentication minimize local demo dependencies.
The existing anonymous eight-hour record store cannot provide authenticated ownership or persistence.

## Consequences and safety

This is durable local synthetic storage, not a real-data or clinical release. Login expiry no longer
deletes patient records. SQLite supports one writer at a time and this setup targets one app instance.
Database and filesystem administrators can alter data: revision history is not tamper-proof auditing.
Doctor provisioning does not verify professional credentials. Visit prescriptions are fictional
documentation only: no automated recommendations, medical validation, e-prescribing or transmission.
No patient data enters cohort matching or study aggregates. No new cloud service, OCR or device
permission is introduced. Default local deployment binds to loopback; public hosting needs HTTPS,
managed secrets, account lifecycle controls, and separate security/privacy/clinical review.

## Validation and rollout

Validate sign-in/logout/expiry, role tampering, cross-patient requests, grant/revoke behavior,
patient selection and stale request handling, patient/doctor write ownership, draft visibility,
finalization and revisions, duplicate imports and persistence across reopen/restart. Exercise the
production UI in desktop Edge and mobile emulation. Run all CONTRIBUTING.md checks. Validate Compose
configuration and clean startup/restart when Docker is available; disclose any unexecuted checks.
Migrations are versioned and applied before serving traffic. Back up the local volume before schema
upgrades; rollback restores a matching application revision and backup, not a blind schema downgrade.

## Documentation updates

Update the shared instructions, product plan, architecture and setup/My Health guides to distinguish
the requested authenticated workflow from the retained reference research demo. Record exact commands,
results and remaining platform/review gates in the handoff. Do not claim remote approval or deployment.
