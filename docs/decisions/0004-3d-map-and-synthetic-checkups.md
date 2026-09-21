# 0004: 3D body map, expanded synthetic checkups and connection placeholders

- **Status:** Proposed; implementation requested, human review pending.
- **Request:** September 18, 2026: richer anatomical visualization, count-sized hotspots, researched
  laboratory coverage, contrasting patient profiles, and nonfunctional provider/fitness connections.
- **Approval:** The owner explicitly approved Three.js and optional non-destructive sample-checkup
  loading in this session. Shared approval URL, issue and teammate reviewer remain outstanding.
- **Extends:** [0003](0003-report-range-body-view.md). This permits a 3D dependency and separate
  synthetic checkup fixtures; the two original simulated report imports remain intact.

## Scope and decisions

- Use Three.js for a rotatable illustrative anatomical scene. Highlight navigational organ groups
  and size translucent hotspots by the number of latest out-of-range measurement series, not by
  disease risk, confidence or severity. Preserve an accessible 2D/list fallback and existing history.
- Research test families using laboratory catalogs and authoritative medical-test references.
  Distinguish routine screening from specialized tests and qualitative microbiology. Not all tests
  belong in a routine full-body package; the catalogue is not a recommendation to order them.
- Add versioned, deterministic synthetic checkups across three dates, covering over 100 measurements.
  All values and reference intervals are explicitly fictional fixture content, never universal
  medical thresholds. Do not infer deficiency or infection diagnoses from report comparisons.
- Sam Taylor demonstrates circulation-related flags; Jordan Lee liver/kidney-related flags; Casey
  Patel vitamin/mineral-related low readings. Preserve existing names, accounts and sharing grants.
- An explicit patient-only Load sample checkups action adds fixtures atomically without overwriting
  records or visits, respects the 500-record limit, and rejects duplicate loading. No automatic
  startup reseeding or migration of existing patient data. Existing reset removes personal fixtures
  while preserving visits and sharing. Doctors see loaded fixtures only through existing grants.
- Display laboratory/hospital and fitness provider options after app sign-in. Every provider opens
  Coming soon. Never request provider credentials, simulate a successful connection, navigate to
  login, call provider APIs or assert that an integration/partnership exists. No ETL is implemented.

## Validation and limitations

Test the catalogue, distinct scenario flags, latest-versus-history counts, qualitative exclusion,
atomic capacity checks, duplicate protection and unchanged ownership rules. Verify desktop/mobile
screenshots, nonblank canvas pixels, rotation/picking, fallback, keyboard selection, history and
Coming soon behavior without provider-network requests. Run repository formatting, build, unit/API
and browser gates. Assets and data remain local. No real-data, clinical, provider API, physical-device,
cloud or store-release validation is implied. Dependency/image and human review gates still apply.
