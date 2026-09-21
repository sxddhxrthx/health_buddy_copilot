# 0005: Preserve cohort presentation and expand synthetic demo data

- **Status:** Proposed; implementation requested; teammate review pending.
- **Request:** The owner requested keeping the cohort UI components, showing the current patient
  instead of Alex Morgan, and explicitly selected both 200 selectable synthetic patients and 200
  independent fictional cohort records. Shared approval URL and teammate review remain outstanding.

## Implementation plan and boundaries

1. Reuse the existing patient banner, comparison card, hero/ring, metric cards, evidence table,
   distribution cards and two-column layout. No stylesheet redesign. Reference-only scoring controls
   and Copilot must not imply they operate on selected patients; retain their presentation with an
   explicit unavailable state where the exact-label matcher has no equivalent.
2. Add 197 reproducible fictional patient accounts to the existing three, with personal seed readings,
   two finalized fictional visits each and initial sharing with both demo doctors. Existing accounts,
   credentials, records, amendments and sharing choices are never overwritten. New profiles are seeded
   transactionally once; restart must not restore removed records or revoked grants.
3. Use exactly 200 independent, server-only condition fixtures (80 heart failure and 40 each for
   hypertension, type 2 diabetes and asthma), with varied documentation categories. These replace the
   earlier 300 condition fixtures, not Alex's isolated 480-case reference data. Do not pool workspace
   records into research. Advance the fixture version; exact-label association behavior is unchanged.
4. Add only optional aggregate response fields. Preserve cohort/cell suppression, authorization,
   no-store responses, stale-response rejection and explicit reference entry. No new dependency,
   schema, clinical inference, real data or model activation.
5. Validate fresh/restarted provisioning, patient isolation, aggregates and desktop/mobile journeys;
   run formatting, build/unit/API tests, browser tests, whitespace and Compose configuration checks.

## Integration with the scenario extension

The merged [selected-patient scenarios](0005-selected-patient-study-scenarios.md) retain context for
the original three patients and add Sam/Casey's fictional confirmed visits. Cohort components remain
available for selected patients; reference research requires explicit reference navigation. Combined
condition fixtures v4 retain this 200-case distribution with the additional study explanations.
Population completion uses marker 7, avoiding the scenario branch's migration 6. Existing
population-only stores with marker 6 and no scenario context table also upgrade additively.

## Consequences and rollback

Fresh setup hashes more generated passwords and takes longer; the eight-hour/200-session cap is
unchanged (account count is not session capacity). Generated credentials remain in protected ignored
storage. Added visits are explicitly fictional documentation, not real clinician assessments.
Rollback of UI/fixture code must preserve the database and credentials; do not delete accounts,
records or migration history. The existing patients keep their original sharing boundaries, so a
doctor may see fewer than 200 patients while the application contains exactly 200 patient accounts.
