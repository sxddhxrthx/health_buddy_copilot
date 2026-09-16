# My Health · synthetic personal persona

## Walkthrough

1. Select **My Health** in the sidebar or mobile bottom navigation. Sam Taylor is a fictional persona, separate from the clinician's Alex Morgan and historical cohorts.
2. Inspect 16 seeded daily readings, latest-reading cards and the trend selector. Expand **Show exact trend readings** for an accessible list. Units, test names and glucose contexts are separate series; nothing is clinically interpreted.
3. Enter a fictional glucose or blood-pressure reading, walking/running distance, steps, weight, temperature, oxygen saturation, laboratory result, recorded diagnosis or other finding. Confirm fictional-only use, then save.
4. Reload and return to My Health: saved entries remain for this demo session. Edit or delete an entry in the timeline; filter by record type or search its name, notes, finding or report ID.
5. In **Report library & simulated scanning**, preview the bundled blood-test sample and select **Simulate extraction**. This loads predefined fields, not OCR; no file is uploaded and no camera is opened.
6. Compare fields with the original sample. The HbA1c reference range is intentionally missing in the simulated extraction. Enter `4.0–5.6` from the sample, or leave it explicitly unknown. Review all fields, check the confirmation and save.
7. Find the result in the timeline and select **View source**. Records preserve simulated-report provenance and user confirmation, which is not clinical verification. Repeat with the fictional diagnosis note. Duplicate report imports are rejected, including after individual results are deleted; resetting allows a fresh walkthrough.
8. **Reset demo records** restores the original 16 readings after confirmation, removing all added entries and imported results in this session only.

## Architecture and boundaries

- React UI: `src/MyHealth.tsx`, with scoped `src/health.css` styles.
- Shared types, input validation and unit-separated trend keys: `shared/health.ts`.
- Bundled samples and deterministic seeds: `server/health-data.ts`.
- Express router: `server/health.ts`, mounted at `/api/health-demo`.
- `GET /api/health-demo/reports` returns synthetic report text and predefined extraction drafts.
- `POST /api/health-demo` accepts actions `create`, `read`, `save`, `delete`, `import`, `reset`. Other than `create`, actions require a demo session ID. Mutations require `syntheticOnly: true`; import additionally requires `confirmed: true` and all reviewed fields. The original 8 KB JSON request limit remains in effect. There is no upload endpoint.
- Records live **only in server memory**, for a fixed maximum of eight hours from session creation, or until server restart. At most 200 concurrent sessions and 500 records per session are supported. Expired sessions are removed on the next demo request. This is bounded prototype storage, not durable storage or authentication.
- Only an opaque session ID is stored in browser `sessionStorage`; health records are not persisted in browser storage or service-worker caches. The ID is a bearer capability, **not a secure personal account**. Browser storage must be enabled. Reloads work while the server session exists; multi-device synchronization does not exist. A duplicated tab may share the copied session ID. No health data is intentionally logged.
- API responses remain `no-store`. Offline writes are disabled; there is no queue or automatic retry of writes. A network timeout may happen after a server write succeeds: use **Retry My Health** to reload server state before repeating a manual submission. Report imports have server-side duplicate protection.
- Dates are explicitly demo-local values (2000–2099) without timezone conversion. Validation rejects malformed dates, incompatible units, negative/non-numeric readings, fractional steps and invalid oxygen percentages. Technical limits are not clinical thresholds. Glucose contexts and original units are preserved, not converted. Laboratory `Other` units can be explained in notes; general findings use a text field.
- No sign-in, real OCR, arbitrary uploads, medical interpretation, treatment recommendations or automatic clinician/research sharing. Fictional-only acknowledgements cannot detect real information: **never enter real health data**. Do not expose this unauthenticated demo as a real-user health service.

## Validation

Run `npm run check`, `npm run test:e2e`, `npm run format:check` and `git diff --check`. Tests cover parsing, report review, atomic import, duplicate protection, session isolation, persistence across reads/reloads, editing/deletion/reset, API failures, expired sessions and desktop/mobile overflow. Existing clinician tests remain regression coverage. Physical-device camera/OCR and real-data security validation are future work.
