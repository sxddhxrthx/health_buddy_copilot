# Research Twin

## Run the PWA prototype

The repository now contains a working **synthetic-data prototype**, built with React, TypeScript, Vite and an Express API. The original project vision below includes future capabilities that are **not yet integrated**.

**Requirements:** Node.js 22 LTS and npm.

```powershell
npm ci
npm run dev
```

Open **http://localhost:5173**. The API runs on port 3001. No Azure subscription, credentials, or real patient records are needed.

For the installable production PWA (including its service worker):

```powershell
npm run build
npm start
```

Open **http://localhost:3001**. Deploy behind HTTPS to install on phones. Android supports browser installation; on iOS use Safari → Share → Add to Home Screen. A phone accessing an HTTP LAN address can preview the responsive UI, but installation/service-worker functionality requires HTTPS. Only the application shell is available offline; research API responses are intentionally not cached.

### Implemented in this first release

- Responsive patient, cohort and clinical-study workspaces; mobile bottom navigation.
- **My Health synthetic persona:** daily manual readings, activity entries, trends, editable timeline, and bundled report preview → simulated extraction → correction → confirmed save. No actual OCR or real uploads. See [My Health walkthrough and storage limitations](demo/my-health.md).
- Fixed January 15, 2026 synthetic patient snapshot, evidence-linked timeline and missing-data disclosures.
- Seeded generator for 480 historical cases; server-side eligibility, similarity and aggregation.
- Versioned matching rules; configurable cohort filters; minimum cohort and small-cell suppression.
- Differential evidence matrix, recorded diagnostic, investigation, treatment, confirmation and outcome patterns.
- Evidence dialogs containing sources, calculation details, date windows and limitations.
- **Deterministic Copilot demonstration**, not a connected generative AI model: supported prompts produce source-linked templates; unknown, diagnostic, prescribing and individual-disclosure requests are declined.
- Clinician questions, downloadable Markdown review brief, study metrics and guided demo.
- PWA manifest, generated icons, app-shell service worker, offline/error states and update prompt.
- Capacitor configuration and documented path to native Android/iOS store packaging.
- Unit, API and desktop/mobile-emulation browser tests.

### Validation

```powershell
npm run check
npm run test:e2e
```

Browser tests currently use installed Microsoft Edge, including a mobile viewport emulation. Run `npm run build` first. Physical Android/iOS installation and Safari validation are still release gates, not implied by emulation.

### Scope and safety

**Do not enter real patient information.** This is not a clinical product. There is no authentication, real EHR/FHIR ingestion, Azure AI Foundry, Microsoft Fabric, live literature, or enterprise privacy/governance integration yet. Synthetic categories are fictional and independently generated, not medical evidence. Minimum-size suppression is a demonstration safeguard, not a formal privacy guarantee against repeated-query differencing.

See [setup and architecture](demo/implementation.md), [five-minute walkthrough](demo/demo-script.md), and [native release roadmap](demo/native-roadmap.md).

---

## AI Copilot for Clinical Studies and Clinically Similar Cohort Intelligence

> **Hackathon 2026 project concept for “Hack for Industry – Healthcare & Life Sciences: The UI for AI for Clinicians.”**

Research Twin is a clinician-facing, evidence-linked AI experience that combines three complementary capabilities:

1. **Research Twin**: An AI workspace for exploring clinical studies, patient cohorts, research evidence, and study operations.
2. **Current Patient Twin**: A longitudinal, source-linked representation of the current patient’s known health context.
3. **Health Twin Buddy Cohort**: A privacy-protected cohort of historical cases with clinically, temporally, and environmentally similar characteristics.

The project is designed to reduce avoidable information ambiguity by helping clinicians reconstruct the current patient’s context, discover relevant historical patterns, inspect important differences, and review supporting evidence without replacing professional clinical judgment.

---

## Executive Summary

Healthcare professionals make decisions using information distributed across electronic health records, laboratory systems, medications, clinical notes, wearable observations, environmental data, prior cases, and medical research. During a time-constrained encounter, reconstructing this context and finding relevant historical evidence is difficult, particularly when symptoms are nonspecific and several explanations are plausible.

Research Twin addresses this challenge by creating an explainable clinician workspace that:

- Organizes the current patient’s longitudinal record into a **Current Patient Twin**.
- Identifies a privacy-protected group of clinically and environmentally similar historical cases through the **Health Twin Buddy Cohort**.
- Connects patient context and cohort patterns with clinical-study information and trusted research evidence through the **Research Twin Copilot**.
- Distinguishes recorded facts, deterministic calculations, observed associations, and AI-generated hypotheses.
- Exposes source records, calculation details, missing information, and limitations for every important finding.
- Keeps diagnosis, prescribing, treatment changes, and clinical decisions under qualified human control.

Research Twin is not an autonomous diagnostic system. Its purpose is to make relevant evidence easier to discover, compare, verify, and discuss.

---

## Opportunity Statement

**Reduce diagnostic ambiguity by connecting current patient context with clinically similar historical cohorts, research evidence, and explainable AI insights.**

---

## Vision

Research Twin introduces a new interaction model for healthcare AI. It is not a chatbot that gives a single answer and not a black-box model that claims to diagnose a patient.

Instead:

- The **Current Patient Twin** explains what is known about the patient.
- The **Health Twin Buddy Cohort** explains what was observed across relevant, privacy-protected historical cases.
- The **Research Twin Copilot** connects both perspectives with clinical-study evidence, exposes uncertainty, and helps clinicians determine what to investigate.

The objective is not to eliminate clinical uncertainty. The objective is to make uncertainty structured, transparent, measurable, and easier to investigate.

---

## Problem

A patient may present with fever, fatigue, respiratory symptoms, or another nonspecific complaint while also having chronic conditions such as diabetes, hypertension, or dyslipidemia. A clinician must consider:

- Symptoms and their progression
- Existing diagnoses and chronic conditions
- Medications, allergies, and contraindications
- Recent laboratory and diagnostic results
- Vaccination and infection history
- Recent encounters and clinical notes
- Wearable or home-monitoring observations
- Travel and broad exposure context
- Season, climate, humidity, air quality, and other environmental factors
- Relevant historical cases and current medical evidence

Historical evidence may exist in other records, but traditional search can return patients with the same diagnosis while overlooking material differences such as age band, symptom duration, medication history, laboratory confirmation, vaccination status, renal or hepatic function, and quality of follow-up.

Matching the current patient to one identifiable person would create privacy risks and could produce unsafe conclusions. Two superficially similar people may have different illnesses, contraindications, exposures, or outcomes. Similarity is useful context, but it does not establish diagnosis, causality, treatment safety, or treatment effectiveness.

---

## Solution Overview

### 1. Current Patient Twin

The Current Patient Twin is a time-aware, evidence-linked representation of the patient’s available clinical and contextual information.

It may include:

- Active symptoms and onset dates
- Symptom duration and progression
- Existing diagnoses and chronic conditions
- Recent encounters and clinical notes
- Laboratory and diagnostic results
- Current and recently changed medications
- Allergies and recorded contraindications
- Vital signs and wearable observations
- Vaccination and recent infection history
- Broad seasonal and environmental context
- Recent travel or exposure categories
- Missing, conflicting, outdated, or low-quality information
- Provenance linking each fact to its original source

The Current Patient Twin does **not** simulate the patient’s biology or independently predict a diagnosis. It organizes the available evidence into a coherent longitudinal view.

### 2. Health Twin Buddy Cohort

The Health Twin Buddy is implemented as a **cohort**, not as one identifiable person. It is a privacy-protected group of historical cases with relevant similarities to the current patient.

Possible matching dimensions include:

#### Clinical similarity

- Symptom family
- Symptom duration
- Temperature or vital-sign pattern
- Existing chronic conditions
- Recent clinical measurements
- Relevant laboratory findings
- Medication categories
- Recorded progression

#### Environmental similarity

- Season
- Broad climate zone
- Temperature and humidity bands
- Air-quality category
- Urban or rural setting
- General exposure setting

#### Temporal similarity

- Time since symptom onset
- Similar stage in the recorded illness
- Comparable seasonal period
- Recency of the historical evidence

#### Evidence quality

- Laboratory-confirmed versus unconfirmed diagnoses
- Availability of follow-up outcomes
- Completeness of source records
- Consistency between data sources
- Presence of unresolved missing information

The interface presents:

- Number of comparable cases
- Similarity dimensions
- Important differences
- Matching-quality indicator
- Data-completeness indicator
- Recorded diagnostic categories
- Investigations performed
- Historical treatment categories
- Outcome distributions
- Missingness and evidence-quality limitations
- Supporting calculations and source references

Historical treatment information is descriptive research context. It is never converted automatically into a medication recommendation for the current patient.

### 3. Research Twin Copilot

Research Twin connects the Current Patient Twin and Health Twin Buddy Cohort with clinical-study information and trusted evidence.

A clinician can ask:

- What changed in the patient’s condition?
- Why were these historical cases selected?
- Which similarities are strongest?
- Which differences reduce comparability?
- What diagnoses were recorded across the cohort?
- Which investigations differentiated the historical cases?
- What information is missing from the current record?
- Is an environmental similarity clinically relevant or potentially incidental?
- What evidence supports this observation?
- What questions should be considered during clinical review?

Deterministic tools calculate metrics and comparisons. The AI layer explains those outputs, discloses limitations, links statements to evidence, and generates review questions.

---

## Example Hackathon Scenario

A synthetic patient presents during winter with unexplained fever and fatigue. The record also contains diabetes, hypertension, and dyslipidemia. Initial findings are incomplete, and no specific exposure has been documented.

Research Twin:

1. Builds the Current Patient Twin from synthetic clinical records, laboratory observations, medications, symptoms, and environmental context.
2. Retrieves historical synthetic cases with similar symptoms, chronic conditions, seasonal exposure, climate band, and illness stage.
3. Applies evidence-quality filters for diagnostic confirmation, record completeness, and follow-up availability.
4. Creates a privacy-protected Health Twin Buddy Cohort.
5. Displays strong similarities and clinically important differences.
6. Shows diagnostic categories, investigations, and outcomes recorded in the historical cohort.
7. Identifies information missing from the current patient record.
8. Generates focused questions for the clinician to investigate.

Example system language:

> The current patient shares symptom duration, winter climate exposure, diabetes, hypertension, and selected laboratory characteristics with the synthetic comparison cohort. Historical records contain multiple diagnostic categories, and similarity does not establish a diagnosis or common cause. Important differences include vaccination history, medication context, and missing confirmatory testing.

If asked to prescribe the same medicine used in the cohort, Research Twin should respond:

> Historical treatment patterns cannot determine the appropriate medication for the current patient. Treatment selection requires patient-specific diagnosis, contraindication review, approved clinical guidance, and professional clinical judgment.

---

## Clinician Experience

### Patient Twin Summary

- Current symptoms
- Chronic conditions
- Medications and allergies
- Recent clinical changes
- Environmental context
- Missing or conflicting information

### Longitudinal Timeline

- Encounters
- Symptoms
- Laboratory results
- Medication events
- Environmental periods
- Diagnostic events
- Follow-up outcomes

### Health Twin Buddy Cohort

- Cohort size
- Similarity dimensions
- Important differences
- Matching-quality indicator
- Data-completeness indicator
- Configurable cohort filters

### Differential Evidence Matrix

| Area | Current Patient Evidence | Comparable Cohort Pattern | Important Differences | Evidence Quality |
|---|---|---|---|---|
| Symptoms | Current symptom course | Cohort symptom distribution | Duration or severity differences | High / Medium / Low |
| Conditions | Recorded chronic conditions | Cohort comorbidity pattern | Additional conditions | High / Medium / Low |
| Environment | Seasonal and climate context | Comparable environmental bands | Exposure gaps | High / Medium / Low |
| Investigations | Current tests | Tests used in historical cases | Missing confirmation | High / Medium / Low |
| Outcomes | Not yet available | Aggregated historical outcomes | Follow-up differences | High / Medium / Low |

### Copilot and Evidence Drawer

Every material statement is labeled as one of:

- Recorded fact
- Calculated metric
- Observed association
- AI-generated synthesis
- Missing or incomplete data
- Requires clinician review
- Synthetic demonstration data

Selecting an evidence identifier opens:

- Source type
- Source record identifier
- Relevant measurement
- Date range
- Transformation or calculation
- Provenance
- Limitations

---

## Research Twin for Clinical Studies

The platform can also represent a clinical study as a living research model containing:

- Study and protocol versions
- Research sites
- Cohorts and interventions
- Participants
- Scheduled and completed visits
- Outcome observations
- Adverse-event records
- Protocol deviations
- Participant dispositions
- Supporting studies and publications

Researchers can use the same Copilot experience to explore:

- Enrollment status
- Cohort retention
- Site performance
- Visit compliance
- Protocol deviations
- Data completeness
- Recorded safety-event patterns
- Historical and external study evidence

The AI must not independently classify adverse-event seriousness, expectedness, or causality, and it must not recommend stopping or modifying a study.

---

## Proposed Technical Architecture

```text
CURRENT PATIENT AND RESEARCH DATA
├── EHR / FHIR resources
├── Clinical notes and encounters
├── Laboratory and diagnostic results
├── Medication and allergy records
├── Wearable observations
├── Environmental and seasonal data
├── Synthetic historical cases
├── Clinical-study records
└── Curated research evidence
                │
                ▼
AZURE HEALTH DATA SERVICES
├── Patient
├── Observation
├── Condition
├── MedicationRequest
├── Encounter
├── DiagnosticReport
├── DocumentReference
└── Provenance
                │
                ▼
MICROSOFT FABRIC / ONELAKE
├── Bronze: source-faithful records
├── Silver: normalized clinical, temporal, and environmental features
└── Gold: patient state, cohort candidates, outcomes, evidence, and quality metrics
                │
                ▼
DETERMINISTIC MATCHING AND ANALYTICS
├── Eligibility and quality filters
├── Candidate retrieval
├── Transparent similarity calculation
├── Cohort-level aggregation
├── Important-difference detection
├── Outcome summaries
└── Data-quality diagnostics
                │
                ▼
AZURE AI FOUNDRY ORCHESTRATION
├── Approved tool calls
├── Grounded explanations
├── Similarity and difference summaries
├── Structured responses
├── Causal and treatment-safety boundaries
└── Evaluation and version tracking
                │
                ▼
CLINICIAN EXPERIENCE
├── Dragon Copilot extension
├── Copilot Studio experience
└── React clinician application
    ├── Current Patient Twin
    ├── Health Twin Buddy Cohort
    ├── Differential Evidence Matrix
    ├── Research Twin workspace
    └── Evidence drawer
```

---

## Fabric Medallion Design

### Bronze Layer

Source-faithful, append-only data:

- Raw FHIR resources
- Clinical notes
- Laboratory records
- Medication records
- Wearable observations
- Environmental data
- Historical synthetic cases
- Study datasets
- Protocol documents
- Supporting evidence metadata
- Ingestion and validation logs

### Silver Layer

Normalized and quality-checked data:

- Patient and encounter identifiers
- Clinical concepts
- Dates and time zones
- Units
- Symptom categories
- Medication categories
- Environmental bands
- Temporal features
- Comorbidity features
- Evidence provenance
- Data-quality indicators

### Gold Layer

Curated products for the UI and Copilot:

- Current patient state
- Longitudinal patient timeline
- Cohort candidate features
- Similarity results
- Cohort-level diagnostic patterns
- Historical treatment and outcome summaries
- Environmental comparisons
- Important-difference matrix
- Research-study metrics
- Data-quality assessment
- Copilot evidence records

---

## Similarity and Cohort-Matching Design

### Stage 1: Safety and Evidence Filters

Exclude records that are unusable for comparison because of:

- Insufficient evidence
- Major incompatibility with the configured research population
- Missing source provenance
- Poor or stale data
- Missing outcome information when outcomes are required
- Privacy or governance restrictions

The exact clinical rules must be designed and validated by qualified clinical and governance teams before production use.

### Stage 2: Candidate Retrieval

Retrieve a broad candidate set using structured dimensions such as:

- Symptom family
- Season and climate band
- Comorbidity profile
- Symptom duration
- Recent measurements
- Diagnostic-confirmation status
- Follow-up availability

### Stage 3: Transparent Similarity Scoring

A conceptual similarity calculation may combine:

```text
Similarity =
    Clinical-state similarity
  + Comorbidity similarity
  + Symptom-course similarity
  + Environmental similarity
  + Temporal similarity
  + Data-quality confidence
```

Weights should be visible, versioned, and configurable. The resulting score is a retrieval and comparability indicator, not a disease probability.

### Stage 4: Cohort-Level Aggregation

Return aggregated evidence rather than identifiable patient records:

- Diagnostic-category counts or distributions
- Investigation patterns
- Historical treatment categories
- Recorded outcome distributions
- Data completeness
- Confidence and limitations

Minimum cohort-size controls should prevent narrow disclosure.

---

## Suggested Copilot Tools

### `get_current_patient_state`

Returns normalized patient context, timeline, provenance, and missing fields.

### `find_comparable_cohort`

Returns an opaque cohort identifier, matching dimensions, important differences, cohort size, and data-quality summary.

### `compare_patient_to_cohort`

Returns patient-versus-cohort feature distributions and comparability limitations.

### `get_recorded_diagnostic_patterns`

Returns aggregated diagnostic categories, confirmation status, and evidence identifiers.

### `get_historical_treatment_outcomes`

Returns descriptive cohort-level treatment and outcome information. It never recommends a treatment.

### `get_supporting_evidence`

Returns source record, calculation, date window, and provenance.

### `generate_review_questions`

Generates clinician-facing questions based on missing information, differences, and evidence limitations.

### Clinical Study Tools

- `get_study_snapshot`
- `compare_cohorts`
- `analyze_site_performance`
- `get_safety_summary`
- `get_study_timeline`
- `prepare_research_review_brief`

---

## AI Response Contract

```json
{
  "answer": "Evidence-linked summary for clinician review",
  "findings": [
    {
      "statement": "The current patient and cohort share selected clinical and environmental characteristics.",
      "classification": "calculated_comparison",
      "evidenceIds": ["EVIDENCE-001", "EVIDENCE-002"],
      "confidence": "medium"
    }
  ],
  "importantDifferences": [
    {
      "statement": "Vaccination history is incomplete for the current patient.",
      "evidenceIds": ["MISSING-014"]
    }
  ],
  "possibleAssociations": [
    {
      "statement": "The symptom period overlaps with a similar seasonal pattern in the historical cohort.",
      "classification": "association_only",
      "evidenceIds": ["ENV-007", "COHORT-022"]
    }
  ],
  "reviewQuestions": [
    "Which missing investigations would help distinguish the recorded historical patterns?"
  ],
  "limitations": [
    "Similarity does not establish diagnosis or causation.",
    "Historical treatments are not recommendations for the current patient."
  ]
}
```

---

## Responsible AI, Privacy, and Clinical Safety

### Required Principles

- Use synthetic data for the Hackathon demonstration.
- Do not expose an identifiable historical patient as a buddy.
- Return cohort-level or appropriately protected aggregate evidence.
- Enforce minimum cohort sizes.
- Distinguish similarity from diagnosis probability.
- Distinguish association from causation.
- Treat environmental overlap as context, not proof of cause.
- Do not recommend starting, stopping, or changing treatment.
- Do not determine diagnosis autonomously.
- Do not determine clinical-trial eligibility autonomously.
- Do not independently classify adverse-event causality or seriousness.
- Disclose missing, stale, conflicting, or low-quality evidence.
- Keep clinicians responsible for diagnosis, treatment, and patient care.
- Version prompts, models, tools, matching rules, and evaluations.
- Use managed identities, least-privilege access, role-based authorization, and audit logging.

### Suitable Output

> Treatment X was recorded in a subset of matched synthetic cases. The current patient differs in medication context and confirmation status. Historical co-occurrence does not establish safety or effectiveness. Review approved guidance and patient-specific contraindications.

### Prohibited Output

> The buddy recovered after taking Treatment X, so prescribe Treatment X to the current patient.

---

## Hackathon Proof of Concept

### Dataset

A recommended synthetic dataset can contain:

- One active synthetic patient
- A few hundred historical synthetic records
- Multiple climate and seasonal categories
- Several comorbidity combinations
- Symptom-course features
- Laboratory features
- Recorded diagnostic categories
- Historical treatment categories
- Follow-up outcomes
- Deliberately incomplete records for data-quality testing
- One synthetic clinical study
- A small curated research-evidence set

These are project-design suggestions, not clinical thresholds.

### Must-Have Demonstration Capabilities

- Current Patient Twin
- Longitudinal patient timeline
- Transparent comparable-cohort retrieval
- Health Twin Buddy Cohort
- Similarity and difference explanation
- Differential Evidence Matrix
- Aggregated historical diagnostic and investigation patterns
- Evidence drill-through
- Missing-data disclosure
- Safe refusal for diagnosis and medication requests
- Clinician review-question generation
- Research or clinical review brief

### Optional Capabilities

- Protocol-document extraction
- Live environmental feed
- Public trial metadata
- Literature retrieval
- FHIR ingestion
- Dragon Copilot extension packaging
- Federated multi-institution matching

---

## Five-Minute Demo Script

### 0:00–0:40 | Introduce the ambiguity

Show a synthetic patient with winter fever, fatigue, diabetes, hypertension, and incomplete test information.

> “Clinicians often evaluate nonspecific symptoms using information scattered across records, tests, medications, environmental context, research, and prior cases. Research Twin brings that context together and finds relevant historical evidence without exposing another patient.”

### 0:40–1:20 | Build the Current Patient Twin

Show the patient timeline and summary:

- Symptoms and onset
- Conditions
- Medications
- Recent measurements
- Seasonal context
- Missing information

> “The Current Patient Twin creates a source-linked longitudinal view. It distinguishes what is known, what changed, and what remains missing.”

### 1:20–2:05 | Find the Health Twin Buddy Cohort

Select **Find comparable cohort** and show:

- Broad candidates
- Clinical and temporal filtering
- Environmental alignment
- Evidence-quality filtering
- Privacy-safe aggregate cohort

> “The Health Twin Buddy is not one person. It is a protected cohort selected using transparent clinical, temporal, environmental, and evidence-quality dimensions.”

### 2:05–3:05 | Review the Differential Evidence Matrix

Ask:

> “Which diagnostic patterns were recorded in comparable cases, and what evidence separated them?”

Show:

- Recorded diagnostic categories
- Investigations
- Similarities
- Important differences
- Evidence quality
- Missing confirmation

Open one evidence item.

### 3:05–3:50 | Demonstrate the safety boundary

Ask:

> “A matched case improved after a medicine. Should I prescribe the same medicine?”

Expected response:

> “Historical treatment patterns cannot determine the appropriate medication for the current patient. Patient-specific diagnosis, contraindications, approved guidance, and clinical judgment are required.”

### 3:50–4:30 | Generate clinician review questions

Show questions such as:

- Which missing tests would distinguish the recorded patterns?
- Are the environmental similarities meaningful or incidental?
- Which current-patient differences reduce cohort applicability?
- Is follow-up evidence sufficiently complete?

### 4:30–5:00 | Close with industry scale

> “The Hackathon demo uses synthetic data, but the architecture separates clinical ingestion, patient-state modeling, deterministic cohort analytics, AI explanation, evidence lineage, privacy controls, and clinician review. It can scale to governed hospital and research networks without turning cohort similarity into an autonomous diagnosis.”

---

## Hackathon-Week Implementation Plan

### Day 1: Vertical Slice

- Finalize the synthetic scenario.
- Define patient, cohort, study, and evidence schemas.
- Generate synthetic datasets.
- Create Fabric Bronze and Silver tables.
- Implement `get_current_patient_state`.
- Render the Current Patient Twin.
- Return one evidence-linked Copilot response.

**Exit criterion:** The clinician can ask what changed and receive a grounded answer with evidence identifiers.

### Day 2: Cohort Matching and Analytics

- Build Gold feature tables.
- Implement candidate retrieval.
- Add transparent similarity scoring.
- Add minimum cohort-size enforcement.
- Implement important-difference detection.
- Build cohort aggregation and data-quality metrics.

**Exit criterion:** The same input produces a reproducible cohort with visible matching reasons and differences.

### Day 3: Clinician Copilot and Safety

- Implement approved tools.
- Add structured response validation.
- Add the Differential Evidence Matrix.
- Add evidence drill-through.
- Add diagnosis, causality, and treatment safety boundaries.
- Add refusal tests and prompt-injection tests.

**Exit criterion:** The system explains evidence correctly and refuses unsupported diagnosis or prescribing requests.

### Day 4: Research Twin and Polish

- Add the clinical-study workspace.
- Add cohort and site comparisons.
- Add research-review brief generation.
- Improve timeline and visual hierarchy.
- Add synthetic-data labels and empty states.
- Run the evaluation suite.
- Record a backup demonstration.

**Exit criterion:** The complete five-minute scenario works from a clean session.

### Day 5: Submission Package

- Finalize project description.
- Finalize architecture visual.
- Document Responsible AI safeguards.
- Publish evaluation results.
- Rehearse the demo.
- Record the submission video.
- Freeze the synthetic dataset and demo branch.

---

## Evaluation Plan

Create fixed test prompts across:

| Category | Validation Goal |
|---|---|
| Groundedness | Every factual statement has supporting evidence |
| Numerical fidelity | Values match deterministic Fabric outputs |
| Temporal fidelity | Correct date and symptom window |
| Cohort reproducibility | Same inputs produce the same candidate results |
| Difference disclosure | Important mismatches are visible |
| Missing-data behavior | Incomplete evidence is disclosed |
| Privacy | No identifiable buddy record is exposed |
| Causal restraint | Associations are not called causes |
| Treatment safety | No medication recommendation is produced |
| Diagnostic safety | No autonomous diagnosis is produced |
| Prompt injection | Instructions embedded in records are ignored |
| Human review | Outputs clearly require professional validation |

Recommended demo evaluation cards:

- Grounded
- Numerically correct
- Evidence complete
- Privacy protected
- Clinically bounded
- Human review required

---

## Industry Scalability

### Future Data Integrations

- Electronic health record systems
- FHIR services
- Laboratory systems
- Clinical Trial Management Systems
- Electronic Data Capture platforms
- Safety and pharmacovigilance systems
- Wearable and medical-device platforms
- Environmental and public-health data
- Institutional knowledge repositories
- Clinical-trial registries
- Trusted medical-research sources

### Enterprise Controls

- Tenant and organization isolation
- Role-based access
- Managed identities
- Private networking
- Customer-managed encryption where required
- Evidence lineage
- Immutable audit events
- Data-retention policies
- Regional deployment
- Human approval gates
- Model, prompt, tool, and feature versioning
- Evaluation gates before release
- Configurable matching dimensions and evidence thresholds

### Federated Expansion

For multi-institution deployment, matching can evolve toward federated analytics where patient-level records remain within the participating organization and only approved, privacy-protected aggregate statistics are shared.

### Potential Product Forms

- Research workspace embedded in a hospital study portal
- Dragon Copilot app or agent
- Fabric-based clinical-research accelerator
- Reusable semantic model across therapeutic areas
- Governed extension for healthcare and life-sciences organizations

---

## Expected Impact

Research Twin can help clinicians and researchers:

- Spend less time reconstructing fragmented records
- Discover relevant historical evidence more efficiently
- Understand why a cohort was selected
- Review similarities and important differences together
- Detect missing investigations and incomplete follow-up
- Examine cohort-level patterns without exposing individuals
- Verify the sources behind AI-generated observations
- Prepare focused clinical and research discussions
- Preserve uncertainty instead of hiding it
- Keep professional judgment and accountability at the center

---

## Success Criteria

The Hackathon project is successful if it can:

1. Present a coherent Current Patient Twin.
2. Produce a relevant synthetic Health Twin Buddy Cohort using transparent criteria.
3. Explain similarities and important differences.
4. Display cohort-level diagnostic, investigation, treatment, and outcome patterns with evidence.
5. Ensure numerical values come from deterministic analytics.
6. Disclose missing, stale, conflicting, and low-quality data.
7. Refuse unsupported diagnostic and medication recommendations.
8. Avoid exposing an identifiable historical patient.
9. Generate useful questions for clinician review.
10. Demonstrate a credible path to enterprise integration and governance.

---

## Recommended Repository Structure

```text
research-twin/
├── README.md
├── infra/
│   ├── main.bicep
│   └── modules/
├── data/
│   ├── generator/
│   ├── synthetic-patient/
│   ├── synthetic-cohort/
│   └── synthetic-study/
├── fabric/
│   ├── notebooks/
│   ├── pipelines/
│   ├── sql/
│   └── semantic-model/
├── src/
│   ├── research-twin-api/
│   ├── matching-service/
│   ├── copilot-tools/
│   └── clinician-web/
├── prompts/
│   ├── system-prompt.md
│   └── response-schema.json
├── evals/
│   ├── groundedness.jsonl
│   ├── numerical-fidelity.jsonl
│   ├── privacy.jsonl
│   ├── clinical-safety.jsonl
│   └── prompt-injection.jsonl
└── demo/
    ├── demo-script.md
    ├── expected-responses.json
    └── submission-script.md
```

---

## Scope Reduction Order

If the project falls behind, cut features in this order:

1. External literature integration
2. Live environmental feed
3. Protocol-document extraction
4. Live event streaming
5. Multi-agent orchestration
6. Production FHIR integration
7. Multiple-study support
8. Exported report generation

Do not cut:

- Current Patient Twin
- Privacy-protected cohort matching
- Similarity and difference explanation
- Evidence links
- Missing-data disclosure
- Safe refusal
- Synthetic-data labeling
- Evaluation results
- Polished demo narrative

---

## Final Positioning

Research Twin should not be presented as an AI that diagnoses patients or removes the need for doctors. Its strongest and most credible framing is:

> **A transparent clinician research interface that connects the current patient with privacy-protected historical cohorts and clinical-study evidence, shows exactly why cases are comparable, exposes where they differ, and keeps every conclusion reviewable by a qualified professional.**

The memorable product concept is:

> **Health Twin Buddy: People like this patient, without exposing a person.**
