# Five-minute demo

Start `npm run build` then `npm start`; open http://localhost:3001. Use a fresh browser session for the initial state. The Guided demo button provides on-screen stage reminders.

## 0:00–0:40 · The ambiguity

“Research Twin helps a clinician reconstruct context and inspect comparable evidence—not diagnose a patient. Everything here is synthetic.”

Show Alex Morgan, age band 50–59, with a winter febrile presentation and chronic conditions. Point out the fixed scenario date, January 15, 2026.

## 0:40–1:20 · Current Patient Twin

Scroll through the timeline and missing-data cards. Open a PAT-003 evidence chip to show original measurements and the temperature-change calculation. Close with Escape.

“Recorded facts, calculated changes, and unknowns stay separate. No missing test is treated as normal.”

## 1:20–2:05 · Health Twin Buddy

Select **Find comparable cohort**. Show the generated → eligible → comparable count, matching dimensions and fixed weights. Counts are generated from the dataset, never hard-coded UI claims.

“A buddy is a cohort, not another person. Historical rows stay on the server.”

Toggle **Laboratory-confirmed only**; explain why the existing result disappears. Find again and show the changed aggregate. Open MATCH evidence for the full calculation.

## 2:05–3:05 · Similarities and differences together

Inspect the evidence matrix and recorded patterns. Ask the diagnostic-pattern prompt in Copilot. Open the DIAG evidence.

“These are fictional historical categories, not a differential diagnosis. Their percentages are descriptive, not probabilities for this patient.”

## 3:05–3:50 · Safety boundary

Select **Test the prescribing safety boundary**. Show the explicit refusal.

“Historical improvement cannot establish which medicine is appropriate now. This initial Copilot uses deterministic templates, not a connected AI model. Unsupported free-form requests fail closed.”

## 3:50–4:30 · Human review

Select **What questions should a clinician review?** Then **Prepare review brief**. Download the Markdown brief and show its source appendix.

## 4:30–5:00 · Broader research and platform story

Open **Research study**. Show enrollment and visit completion with STUDY-001 evidence. Resize to a phone viewport or demonstrate an installed HTTPS PWA on a prepared device.

“The foundation works on web and phone. The final delivery goal includes native store packages through Capacitor. Governed Azure, FHIR and AI integration are next—not simulated live connections.”

## Recovery and honesty

- If the API is unavailable, restart `npm start`, check port 3001 and use Retry.
- A selected cohort below the privacy threshold intentionally shows no statistics; broaden filters.
- No Internet is needed for the local synthetic server once dependencies are installed. If the client cannot reach the server, only the shell works.
- Do not claim real clinical evidence, production privacy, a deployed Azure backend, generative AI, or an app-store release.
