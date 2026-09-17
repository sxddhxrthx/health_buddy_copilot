# Architecture decision records (ADRs)

Use an ADR for changes to architecture, dependencies, shared contracts with compatibility impact,
matching/privacy boundaries, storage, authentication, model/cloud integrations, or native permissions.
Small fixes within approved boundaries need a scoped issue and PR, not a new ADR.

## Process

1. Copy [the template](template.md) into the next unused NNNN-short-title.md file. Coordinate numbering
   when working in parallel. Start with status **Proposed** and link the issue.
2. Explain the problem, alternatives, consequences, data/safety impact, tests, and migration/rollback.
3. Get explicit human approval from the project owner for direction changes and teammate review.
   Record the approval link before changing status to **Accepted**. Agents cannot approve themselves.
4. Implement the approved decision and update affected instructions, plans, contracts and guides in
   the reviewed change. Keep earlier records; mark a replaced record **Superseded** and link its successor.

The initial baseline records already implemented behavior, not a claim of new feature approval.

## Index

| Record                                                                                 | Status                             | Scope                                                                              |
| -------------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------- |
| [0001: Synthetic prototype baseline](0001-synthetic-prototype-baseline.md)             | Existing baseline                  | Current stack, data separation and demo boundaries                                 |
| [0002: Authenticated synthetic workspaces](0002-authenticated-synthetic-workspaces.md) | Proposed; implementation requested | Better Auth, SQLite, sharing, visit ownership and Compose; teammate review pending |
