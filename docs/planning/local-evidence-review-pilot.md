# Planning issue draft: local evidence-review pilot

## Owner and reviewer

- Product direction: requesting project owner; identity/shared approval link not supplied.
- Implementing developer and qualified clinical/evidence reviewer: unassigned.
- Shared issue: not created. This local draft is not approval or a published issue.
- Decision: [Proposed ADR 0003](../decisions/0003-local-evidence-review-pilot.md).

## Goal and approved scope

Prepare Scope B, a synthetic-only local-LLM evidence-review workflow for clinicians. After the initial
documentation/inventory task, the requester explicitly approved implementing the synthetic-only
patient-to-research exception and local Ollama integration, with activation gated until model,
corpus and reviewer approval. See ADR 0003 for the exact approval statement and the
[implementation/runbook](../../demo/evidence-review.md) for the conservative implemented contract.
No shared issue, teammate approval or activation approval is claimed.

## Acceptance criteria for this planning task

- [x] Capture the proposed flow, exclusions, contracts, risks, rollout and validation gates in an ADR.
- [x] Identify the current personal-record research boundary and the proposed narrow exception.
- [x] Inventory installed models and memory without reading credentials or patient records.
- [x] Record unresolved choices without claiming approval, corpus review or benchmark success.
- [ ] Assign the implementing developer and qualified reviewer; publish/link the shared issue.
- [x] Obtain requester approval to implement the synthetic-only data-purpose exception and local integration.
- [ ] Publish the approval link and obtain teammate review, model/corpus/evaluation and activation approval.

## Readiness observations

Observed locally on September 18, 2026, through `ollama list`, `ollama ps`, `ollama --version`,
the loopback Ollama `/api/tags` and `/api/show` endpoints, and Windows CIM inventory:

| Item                               | Observation                                                                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Working tree before planning edits | Clean; branch `main`                                                                                                      |
| Ollama                             | Version 0.34.0; loopback API reachable                                                                                    |
| Memory                             | Approximately 32 GiB installed; 9.37 GiB available at the sampled instant                                                 |
| Graphics                           | Intel(R) Arc(TM) Graphics; usable inference acceleration/VRAM not established                                             |
| Loaded models                      | None reported by `ollama ps` at inspection                                                                                |
| Installed models                   | qwen3.5:9b, nomic-embed-text:latest, mistral:latest, hermes3:8b, llama2-uncensored:7b, dolphin3:8b, llama3.1:8b           |
| Candidate inspected                | qwen3.5:9b, GGUF, reported 9.7B parameters, Q4_K_M; CLI size 6.6 GB                                                       |
| Candidate digest                   | `6488c96fa5faab64bb65cbd30d4289e20e6130ef535a93ef9a49f42eda893ea7`                                                        |
| License metadata                   | Local model metadata begins with Apache License, Version 2.0; complete artifact provenance/license review remains pending |
| Inference performance              | Not benchmarked; no model loaded or installed by this task                                                                |

The digest is an observed candidate identifier, not a production pin or selection. Installed model
names and license headers are not suitability evidence. With only 9.37 GiB available, weight size
alone is insufficient to establish context/KV-cache headroom. Do not stop other processes to make room.

Before choosing a model, measure cold/warm latency, prompt processing and output tokens/second,
peak memory, actual CPU/GPU placement, structured-output success and cancellation under the intended
context budget. Use bounded non-patient synthetic fixtures; print timing/status metrics, not prompt
contents or generated drafts. Establish budgets and pass/fail criteria with the reviewer first.

## Unresolved decisions and dependencies

1. **Approval and purpose:** Who approves the narrow patient-to-pilot flow, and what patient-facing
   sharing/acknowledgement language is required? Record the approval in a shared issue or PR.
2. **Reviewer and scenarios:** Name a qualified reviewer and select specific cardiology/pulmonology
   fictional cases, contraindicated uses, missing-data expectations and evaluation thresholds.
3. **Model:** Verify artifact provenance and complete license terms; choose and pin an artifact only
   after memory/performance and human-reviewed evaluation. Embeddings/RAG dependencies are not assumed.
4. **Corpus:** Approve a bounded set of sources with content-use permission, version/hash, identifier,
   correction/retraction checks and review dates. No literature source is approved by this draft.
5. **Contracts and limits:** Review exact request/report fields, error states, snapshot invalidation,
   suppression rules, prompt/context budgets, maximum response bytes, concurrency and cancellation.

A generic literature lookup verified that PMID 31573350 resolves to the 2019 ATS/IDSA adult
community-acquired pneumonia guideline (DOI `10.1164/rccm.201908-1581ST`). Europe PMC labels its license
`cc by-nc`. This is a discovery observation only: current applicability, full license conditions and
clinical review are unresolved. No abstract/full text is bundled or approved for model input.

References inspected:

- [Europe PMC metadata lookup](https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=EXT_ID:31573350%20AND%20SRC:MED&format=json&resultType=core)
- [Ollama chat API](https://docs.ollama.com/api/chat): supports structured JSON/schema responses;
  generation, cancellation and schema adherence on the installed artifact still require testing.

## Staged implementation after approval

1. Build a fixed-fixture evaluation harness without shared-record access. Establish artifact checks,
   strict schema/citation validation, local-only transport, cancellation and fail-closed behavior.
2. Add the approved versioned fictional scenarios, generator/matcher and reviewed corpus manifest.
   Preserve suppression and keep real literature separate from fictional outcome observations.
3. Review additive shared contracts, then implement authorized bounded snapshots and orchestration.
   Reauthorize and check snapshot freshness after inference; never trust client-provided evidence.
4. Add explicit doctor workflow choice and transient accessible UI with stale-result protection.
5. Complete automated regression/security checks and human-reviewed actual-model evaluations before
   enabling the local pilot. Record limitations and approvals; do not claim clinical readiness.

## Exclusions

No real health data, model installation, cloud fallback, live runtime literature search, arbitrary
uploads, clinical diagnosis/prescribing/dosing, automatic triage, persistent reports, browser records,
model training, new dependencies, database migrations, deployment or remote repository changes.
The deterministic Copilot and Alex Morgan reference outputs remain unchanged.

## Components and coordination

Initial planning touched docs only. Implementation now adds shared contracts, server authorization/
routing, separate pilot analytics and inference modules, doctor UI and tests. These require
coordinated review. Do not let concurrent work
redefine shared/care.ts, shared/contracts.ts, server/app.ts or src/App.tsx independently. Refer to the
[architecture map](../architecture.md) and [contribution workflow](../../CONTRIBUTING.md).

## Validation plan

For the implementation change, inspect new files and the final diff, verify links, and run repository
formatting, build/type/unit/API, browser and whitespace checks where the environment permits. Do not
terminate a server occupying port 3001 for browser tests; report that conflict if present.

Future feature acceptance includes authorization/revocation/session-expiry races, patient switching,
record freshness, injection, fabricated and unsupported citations, numeric/unit fidelity, suppression,
bounded inference, outages, cancellation, no persistence/logging/caching, and accessible responsive UI.
Actual-model tests and human evidence review remain separate gates from mocked automated tests.
