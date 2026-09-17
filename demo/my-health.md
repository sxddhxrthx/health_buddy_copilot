# My Health and shared patient records

The authenticated Option A scope is recorded in [ADR 0002](../docs/decisions/0002-authenticated-synthetic-workspaces.md).
Use [CONTRIBUTING.md](../CONTRIBUTING.md) for Compose or Node setup. Sign in with a locally provisioned
fictional account; no public registration is enabled.

## Walkthrough

1. Sign in as Sam Taylor or Jordan Lee. **My Health** is the patient's only workspace, separate from Alex Morgan's reference research scenario and historical cohorts.
2. Inspect 16 seeded daily readings, latest-reading cards and the trend selector. Expand **Show exact trend readings** for an accessible list. Units, test names and glucose contexts are separate series; nothing is clinically interpreted.
3. Enter a fictional glucose or blood-pressure reading, walking/running distance, steps, weight, temperature, oxygen saturation, laboratory result, recorded diagnosis or other finding. Confirm fictional-only use, then save.
4. Reload and return to My Health: saved entries remain for this demo session. Edit or delete an entry in the timeline; filter by record type or search its name, notes, finding or report ID.
5. In **Report library & simulated scanning**, preview the bundled blood-test sample and select **Simulate extraction**. This loads predefined fields, not OCR; no file is uploaded and no camera is opened.
6. Compare fields with the original sample. The HbA1c reference range is intentionally missing in the simulated extraction. Enter `4.0–5.6` from the sample, or leave it explicitly unknown. Review all fields, check the confirmation and save.
7. Find the result in the timeline and select **View source**. Records preserve simulated-report provenance and user confirmation, which is not clinical verification. Repeat with the fictional diagnosis note. Duplicate report imports are rejected, including after individual results are deleted; resetting allows a fresh walkthrough.
8. **Reset demo records** restores the original 16 readings, removing personal added entries and imports only. It preserves doctor visits and sharing relationships.

## Doctor and visit walkthrough

1. Sign in as Dr Avery Chen. Current patient lists only actively sharing patients and supports search.
   Doctor navigation contains Current patient, Buddy cohort and Research study, not My Health.
2. Select Sam Taylor. Readings, trends, imported reports and the timeline are read-only. Doctor-authored
   visits remain distinguishable from patient-entered or imported diagnoses.
3. Record a fictional diagnosis or prescription in Current visit. This version supports one diagnosis
   and one prescription per visit. Prescription fields are source text, not a formulary or medical
   validator. Save a draft, review it, then explicitly finalize to publish it to the patient.
4. Sign in as the patient: finalized visits are visible, but drafts and editing controls are absent.
   The API refuses patient changes to visits. Other doctors cannot overwrite the author's work.
5. The author can amend a finalized visit with a reason; prior published revisions remain visible.
   Revision checks reject stale writes. Editing personal entries never edits finalized visit content.
6. Patient sharing grants include all existing and future records and finalized visits. Revoking
   sharing denies subsequent doctor reads/writes, but does not erase retained visits or information
   already viewed. Views refresh on focus/reconnection; there is no push revocation channel.
7. Buddy cohort's reference patient, Copilot and brief use only fixed Alex Morgan data, never the
   selected shared patient. Partial sharing and specialty-based prioritization are deferred.

## Architecture and boundaries

- React UI: `src/MyHealth.tsx`, with scoped `src/health.css` styles.
- Shared validation and unit-separated trends: `shared/health.ts`; roles and visits: `shared/care.ts`.
- Bundled samples and deterministic seeds: `server/health-data.ts`.
- Express router: `server/health.ts`, mounted behind authentication at `/api`.
- `GET /api/health-demo/reports` returns synthetic report text and predefined extraction drafts.
- `POST /api/health-demo` accepts `read`, `save`, `delete`, `import`, `reset`. Ownership comes from the
  authenticated cookie, not a request-body patient/session ID. Mutations require `syntheticOnly: true`;
  import also requires `confirmed: true` and every reviewed field. The 8 KB limit remains. There is
  no anonymous create, arbitrary upload or public account-management endpoint.
- `GET /api/care/patients` lists a doctor's actively sharing patients; `GET /api/care/patients/:id`
  returns an authorized snapshot. `POST /api/care/patients/:id/visits` accepts create/save/finalize/amend
  with author, grant and revision checks. `GET/POST /api/care/sharing` manages a patient's grants.
- Better Auth has eight-hour cookie sessions and a 200-session demo capacity. SQLite records persist
  beyond login expiry: 500 entries and 200 visits per patient, 100 revisions per visit. This is not a
  reviewed health vault. Database owners can modify files; revision history is not tamper-proof auditing.
- No records or auth tokens are stored in browser sessionStorage/localStorage or service-worker caches.
  HttpOnly cookies authenticate same-origin requests. One app instance is supported; native and
  cross-origin cookie authentication are unvalidated. No health data is intentionally logged.
- API responses remain `no-store`. Offline writes are disabled; there is no queue or automatic retry of writes. A network timeout may happen after a server write succeeds: use **Retry My Health** to reload server state before repeating a manual submission. Report imports have server-side duplicate protection.
- Dates are explicitly demo-local values (2000–2099) without timezone conversion. Validation rejects malformed dates, incompatible units, negative/non-numeric readings, fractional steps and invalid oxygen percentages. Technical limits are not clinical thresholds. Glucose contexts and original units are preserved, not converted. Laboratory `Other` units can be explained in notes; general findings use a text field.
- No real OCR, arbitrary uploads, automated medical interpretation, treatment recommendations or
  automatic research sharing. Fictional-only acknowledgements cannot detect real information:
  **never enter real health data**. Doctor provisioning is not professional credential verification.
  Do not expose this local demo as a real-user health service.

## Validation

Run `npm run check`, `npm run test:e2e`, `npm run format:check` and `git diff --check`. Tests cover parsing, report review, atomic import, duplicate protection, session isolation, persistence across reads/reloads, editing/deletion/reset, API failures, expired sessions and desktop/mobile overflow. Existing clinician tests remain regression coverage. Physical-device camera/OCR and real-data security validation are future work.
