# 0003: Patient and doctor report-range body view

- **Status:** Proposed; implementation requested, teammate review pending.
- **Issue:** Not supplied; this record captures the requested scope.
- **Owner and reviewer:** Requesting project owner; reviewer and shared approval link outstanding.
- **Request:** September 18, 2026: visualize report-supplied reference ranges on a body map, with
  hover/tap details and selectable measurement history. The owner clarified that ranges come from
  reports and must not be estimated by the application.
- **Scope clarification:** September 18, 2026: the owner requested the same read-only map in the
  doctor's selected shared-patient view, using existing sharing authorization.

## Decision scope

Add a Body map button to the patient summary tile in My Health and the doctor's selected shared-patient
view, opening the same accessible, read-only 2D body-view dialog. Derive
above/below/within labels only from numeric readings and their own saved report range and unit.
Support simple intervals and one-sided bounds; ambiguous, missing, incompatible and unspecified
units/ranges stay unclassified. Do not infer a cutoff from a test name, age, sex or another report.
Show the original range text and provenance beside every comparison. No disease inference, organ
health score, severity gradient, treatment advice or clinical validation is introduced.

Use an explicit test-name allowlist for navigational body groups. These associations are not
exclusive anatomical explanations. Vitamins, HbA1c and unmapped readings remain in a general/systemic
group instead of assigning a misleading single organ. Tint indicates only that a latest recorded
reading is outside its supplied range. A neutral area is not evidence of a healthy organ.

Keep named tests, units and contexts separate. Include all prior readings in the selected series,
positioned by elapsed demo-local time, with each reading's own range and an exact-value table.
Tied latest timestamps must not silently hide a conflicting result. Preserve unknown/missing states.
The view is read-only, uses the already-authorized patient snapshot, and performs no new API calls
or browser persistence. The doctor's map receives only the selected patient's already-authorized
records. Patient selection resets the map; a failed access refresh unmounts it along with the
patient snapshot. Existing focus/reconnection refresh behavior is retained, with no live revocation
channel. The map grants no record-editing rights. Research matching is unchanged.

## Boundaries and validation

The later owner-approved [ADR 0004 extension](0004-3d-map-and-synthetic-checkups.md) adds Three.js
and optional broader synthetic checkups. It extends only those original exclusions below; the
source-range, authorization and nonclinical boundaries remain unchanged. Both records await review.

This is a narrow report-data display exception, not general clinical interpretation. Real report
uploads, OCR, extra bundled reports, specialty filtering, arbitrary unit conversion, live AI and
new dependencies remain out of scope. Retain the two existing simulated report-import workflows.
Test range boundaries, malformed text, incompatible units, latest selection, history ordering,
keyboard/focus behavior, touch selection, shared-patient isolation, revoked access and desktop/mobile layouts. Run the
repository validation gates. Human review is still required before accepting this ADR.
