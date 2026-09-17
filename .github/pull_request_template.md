## Task and scope

Link the issue, summarize the change, and identify acceptance criteria met and explicit exclusions.

## Decisions and coordination

Link applicable ADRs and human approval for direction changes. Note shared-contract changes and
coordination with the other developer. State none when no architectural change is involved.

## Validation evidence

Record observed results, not just intended commands. Mark checks not run and explain why.

| Check                       | Result / evidence |
| --------------------------- | ----------------- |
| npm run format:check        |                   |
| npm run check               |                   |
| npm run test:e2e            |                   |
| git diff --check            |                   |
| Task-specific/manual checks |                   |

## Review checklist

- [ ] Read AGENTS.md and followed the approved product plan.
- [ ] Preserved synthetic-only use, persona separation, no-store API behavior and other relevant safeguards.
- [ ] Updated affected tests and documentation; no unrelated generated artifacts or real health data.
- [ ] Reviewed the complete diff, including new files and instruction/workflow changes.
- [ ] Identified limitations, skipped validation and follow-up work below.
- [ ] Requested teammate review of the latest revision; agent approval is not human approval.

## Limitations and follow-up

Document remaining risks, blocked checks, platform gaps and any rollback considerations.
