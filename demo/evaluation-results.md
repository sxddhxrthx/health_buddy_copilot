# Initial evaluation results

Executed locally on Windows with Node.js 22.16.0. These results evaluate this synthetic deterministic prototype, not clinical validity or a generative AI model.

| Check                                                    | Result                                          |
| -------------------------------------------------------- | ----------------------------------------------- |
| Strict TypeScript check and Vite production/PWA build    | Passed                                          |
| Analytics and API tests                                  | 21 passed, 0 failed                             |
| Desktop Edge browser tests                               | 4 passed, 0 failed                              |
| Mobile Chromium (Pixel 7 viewport, Edge engine) tests    | 4 passed, 0 failed                              |
| npm dependency audit, including development dependencies | 0 reported vulnerabilities at time of execution |

## What the tests verify

- Seeded-data and cohort reproducibility; numerical fidelity and scoring bounds.
- Eligibility exclusions and stricter filter behavior.
- Minimum-cohort suppression and whole-distribution small-cell suppression.
- No historical identifiers in returned aggregate contracts.
- Patient, comparison and Copilot evidence references resolve.
- Fixed-date temporal fidelity and explicit missing-data disclosure.
- Unknown, medication, diagnostic, causality, trial-eligibility, prompt-injection and individual-disclosure requests fail closed under exact allowlisting.
- Server-side recomputation rather than trust in client-supplied metrics.
- Bounded request bodies, malformed input rejection and no-store API headers.
- Complete patient → cohort → evidence → refusal → review brief → study journey.
- Filter changes invalidate stale results.
- Evidence dialog opens, Escape closes it, and keyboard focus returns to its trigger.
- Manifest and icon delivery; offline shell reload does not show cached patient data; no `/api` responses in Cache Storage; connection retry succeeds.
- No browser page errors in the demo journey; no page-level horizontal overflow in the tested study viewports.

## Not yet validated

- Physical Android/iOS devices, Safari/WebKit, store packaging and native export.
- Production HTTPS installation end to end on real phones.
- Clinical correctness, clinical usefulness or real-world treatment/outcome relationships.
- Real-data privacy, resistance to repeated-query differencing, tenant isolation or regulatory compliance.
- Generative-model safety/grounding (there is no connected model).
- Full WCAG audit, screen-reader verification, load testing or external penetration testing.

Reproduce with `npm run check` followed by `npm run test:e2e`. Browser tests currently require Microsoft Edge installed.
