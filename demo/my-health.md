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

## Patient and doctor body map

The default map now uses an illustrative Three.js body with selectable organs and count-sized
hotspots. Rotate/reset/play controls operate the model; 2D map remains available, and a browser
without WebGL uses the 2D view. Hotspot size represents flagged latest test series, not diagnosis or
severity. The general/systemic hotspot is deliberately separate from any single organ.

### Rich sample profiles

In patient mode, **Reports and connected apps > Load sample checkups** adds 396 fictional entries:
126 numeric measurements and six qualitative findings across three dates. It preserves existing
records, doctor visits and sharing, rejects repeat loading and stays within the 500-record limit.
It does not load automatically or replace the original 16 seed readings. Reset personal records
removes samples and permits another walkthrough. Source reports remain available for inspection.

- Sam Taylor: circulation/lipid-focused high and low readings.
- Jordan Lee: liver/kidney-focused readings plus a qualitative fictional urine-culture finding.
- Casey Patel: multiple vitamin/mineral readings below their fictional source ranges.

Doctors see loaded samples through existing sharing grants. Casey shares with Dr Riley Shah;
Sam and Jordan share with Dr Avery Chen. No grants or accounts are changed by sample loading.
See [laboratory catalogue research](../docs/lab-catalog-research.md) for coverage, source links,
specialist-test caveats and provider constraints. Qualitative urine findings are shown as source
text and are excluded from numeric hotspot counts.

### Connection previews

Patient mode displays lab/hospital and fitness/wearable options. Every provider opens **Coming soon**.
No provider credentials, permissions, OAuth, background requests, imports or ETL are implemented.
Do not treat the displayed names as active integrations or partnerships.

### Range comparisons

Select **Body map** on the right side of the patient summary tile in My Health, or in the doctor's
Current patient page after selecting a sharing patient, to open the same read-only body view.
Red means a latest
recorded value is numerically outside that reading's saved report range, not organ disease or
severity. Gray is not a claim of health. Heart/circulation, liver-related and kidney-related labels
are explicitly allowlisted navigation groups, not exclusive clinical interpretations. Vitamins,
HbA1c and unmapped test names remain general/systemic. Unknown names are not guessed from substrings.

Hover or focus a body region to inspect its outside-range readings, or select it by keyboard or tap.
Select a measurement to see its history. Horizontal positions use elapsed demo-local time rather
than equal spacing. Original units, named tests and contexts remain separate. The exact-value table
includes each reading's own supplied range and source; select a date for source details. Prior
results are compared with their own ranges, never today's range. Tied latest timestamps are all
retained. Escape or the close button returns focus to the patient tile's launch button.

No limits are hard-coded: a creatinine value is not flagged just because it exceeds 1.2. Supported
range text includes `0.6-1.2`, `0.6 to 1.2`, en/em-dash intervals, `< 1.2`, `<= 1.2`, `> 30`, and
`>= 30`, including Unicode comparison signs. A trailing unit must match the reading's unit exactly.
Intervals include both endpoints; inequality signs preserve strict/inclusive bounds. Missing,
reversed, qualitative, age/sex-conditional, mismatched-unit or otherwise ambiguous ranges remain
unclassified. `Other` units cannot be compared. No bold-report flag is currently stored, so this
feature compares only the reviewed saved numeric range; it does not claim to reproduce source typography.

Existing BP entries support `90-120 / 60-80` for separate systolic/diastolic ranges. Pulse saved
inside BP has no separate range and remains unclassified; a named Heart rate/Pulse laboratory
reading with `bpm` can carry its own source range. Vitamin units include ng/mL, pg/mL and nmol/L.
No report uploads or OCR are added. Optional checkup fixtures extend the source library without
changing the two extraction samples. Existing data is not automatically reseeded or modified.
The original 16 seeded readings have no report ranges, so an initially neutral map is expected.
Load sample checkups, import the bundled blood report and review its HbA1c range, or enter fictional report readings and
their source ranges to exercise highlights. Doctors see only their selected patient's shared
readings and cannot edit them through the map. Switching patients resets the map. Revoked access
clears the snapshot and closes the map at the next focus/reconnection refresh, as for the existing
doctor record view; there is no real-time revocation channel.

The bundled PNG body silhouette is a public-domain derivative of Mikael Haggstrom's image by
RexxS, with background work by Frederic Michel. Source and license:
https://commons.wikimedia.org/wiki/File:Human_body_silhouette.svg . It is stored locally as
`public/body-silhouette.png`; no external image request is made when viewing patient data.

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
7. Selection persists in memory across Current patient, Buddy cohort and Research study (not reload
   or sign-out). With a selected patient, the research pages use current finalized visits marked
   **confirmed** and exact labels **Advanced heart failure**, **Hypertension**, **Type 2 diabetes**, or **Asthma** (case-insensitive).
   Save and finalize a fictional confirmed visit, then open Buddy cohort for independent fictional
   case counts (or use **View cohort details** beside the patient selector). **View research details**
   opens the selected patient's Research study page. Jordan has a bundled fictional confirmed
   heart-failure visit, Sam has a hypertension scenario and Casey has an asthma scenario, each with
   seed provenance in its summary and revision. These labels are invented demo keys, not diagnoses
   inferred from readings. Buddy cohort shows fictional
   case counts and Research study for its bundled fictional study. These are not real publications,
   trial eligibility assessments or medical evidence. Source details identify visit and revision.
8. Absent/unsupported conditions display no match; personal entries, readings, draft/provisional visits,
   prescriptions and historical revisions are excluded. Amendments apply on the next read. Switching
   patients clears previous results; focus/reconnection refreshes authorization. With no patient selected,
   the pages request a selection and never substitute Alex. **View reference patient** opens the original
   reference demo; its **Reference cohort** and **Reference study** controls remain separate. Its matcher,
   Copilot and brief never use shared records. The model pilot stays disabled. See
   [ADR 0004](../docs/decisions/0004-selected-patient-research.md) and the requested
   [ADR 0005 extension](../docs/decisions/0005-selected-patient-study-scenarios.md) for scope and pending review.

## Public-audience presentation (three fictional scenarios)

1. Rebuild/restart the app (`docker compose up --build --wait` for Compose). The one-time seed also
   applies to existing stores, without deleting entries, visits or grants. Sign in as Dr Avery Chen.
2. Select **Jordan Lee**, open **View cohort details**. Start with **Presentation at a glance**:
   advanced heart failure is an authored fictional label, not something the app detected.
   Explain that a cohort is simply a group of cases sharing that label.
3. Show the 120 independent invented cases: **90 (75%)** have a fictional follow-up note and
   **30 (25%)** do not. The bars describe documentation, not recovery, risk or treatment success.
4. Open **View research details**. Walk through the everyday-language question, record-review
   design, illustrative 30-day window and limitations. The study is made up, not recruiting,
   and the selected patient's records are not included in its counts.
5. Expand **Recorded condition sources**, then return to Current patient and inspect the seeded
   finalized visit for the detailed fictional history, functional-class text, ejection-fraction
   example and January timeline. Those details do not feed matching; personal readings are unchanged.
6. Select **Sam Taylor** to show the blood-pressure documentation scenario: 60 independent invented
   cases with 30 documented and 30 missing follow-up notes. Sign in as Dr Riley Shah and select
   **Casey Patel** for the distinct respiratory documentation study. Existing sharing grants are
   unchanged; other doctors see Casey only if Casey explicitly shares with them.
7. Expand **Fictional patient context and data gaps** to inspect versioned background, age band,
   scenario dates, provenance and unresolved information. The background is fixed invented text,
   not a current medical assessment and not an input to matching. Allergies and reconciliation
   remain unverified. A later visit amendment changes the association, not the background.

If Jordan's sharing was revoked, provisioning does not restore it; the patient must explicitly
share again. If the workspace already contains 200 Jordan visits, provisioning permanently skips
the additional visit to preserve the limit. An author may explicitly create/finalize a supported
fictional visit when capacity permits. Later amendments remain effective across restarts.
Migration 6 adds context for all three personas plus distinct Sam/Casey visits once, without
recreating Jordan's condition. It skips equivalent confirmed conditions and full visit workspaces.
No missing personal readings are imputed, no sample checkups are auto-loaded, and no authored
prescriptions, visits, revisions or grants are replaced. A no-match state remains valid after
amendments or a capacity skip and does not establish health or normal readings.
There are no actual clinical findings, prescriptions, prognosis estimates or real study claims.

## Architecture and boundaries

- React UI: `src/MyHealth.tsx`, with scoped `src/health.css` styles.
- Shared validation and unit-separated trends: `shared/health.ts`; roles and visits: `shared/care.ts`.
- Bundled samples and deterministic seeds: `server/health-data.ts`.
- Express router: `server/health.ts`, mounted behind authentication at `/api`.
- `GET /api/health-demo/reports` returns synthetic report text and predefined extraction drafts.
- `POST /api/health-demo` accepts `read`, `save`, `delete`, `import`, `load-checkups`, `reset`. Ownership comes from the
  authenticated cookie, not a request-body patient/session ID. Mutations require `syntheticOnly: true`;
  import also requires `confirmed: true` and every reviewed field. Sample loading requires
  `confirmed: true` and uses server-owned versioned fixtures, not client-supplied measurements. The 8 KB limit remains. There is
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
