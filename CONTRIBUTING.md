# Contributing together

## Shared context for both agents

1. Read [AGENTS.md](AGENTS.md), the [product plan](docs/product-plan.md),
   [architecture map](docs/architecture.md), and [decisions](docs/decisions/README.md).
2. Use the same reviewed base commit before starting related tasks. Share decisions in Git and issues,
   not only in either developer's private chat. Pull merged updates before assigning the next task.
3. Check whether your coding integration automatically loads AGENTS.md. Model choice does not control
   instruction discovery. GitHub Copilot has an entry point in .github/copilot-instructions.md; enable
   repository instructions in the client and verify it reads the linked files.
4. For other integrations, configure their repository-instruction mechanism to read AGENTS.md, or
   explicitly attach it and the linked planning documents at the start of each session. Do not create
   a competing local guideline file. If automatic loading fails, attach the files explicitly.
5. Before editing, ask the agent to identify the files it read and summarize the task scope,
   applicable boundaries, and validation plan. Verify against the files; acknowledgement is not proof
   of compliance. Human review and CI are still required.

Suggested session opening:

> Read AGENTS.md and its required linked documents. Work only on the assigned issue's acceptance
> criteria. Inspect the relevant code and tests, identify conflicts with the approved plan, and give
> a short implementation and validation plan before editing. Do not expand scope or self-approve
> architectural changes.

## Task ownership and direction changes

- Create an issue using the implementation-task template: include owner, reviewer, scope, exclusions,
  acceptance criteria, affected files/contracts, dependencies on other work, and relevant decisions.
- Each developer uses a separate branch and preferably a separate checkout/worktree. Use descriptive
  branch names such as feature/health-timeline-filter; one focused task per PR.
- Coordinate shared files (especially shared/, server/app.ts, src/App.tsx, package.json and lockfile)
  before editing. Sequence dependent contract work first; do not let two agents redesign the same API.
- The project owner approves product scope; a teammate reviews implementation. Record approval in the
  issue or PR so both developers can see it. A future roadmap item is not approval to implement it.
- For architecture, dependency, data-boundary, or other significant changes, propose an
  [ADR](docs/decisions/README.md). Do not mark it accepted until human approval is recorded.
- Stop and surface conflicts with existing plans or concurrent work. Preserve unrelated local edits;
  never resolve conflicts by blindly accepting an agent's version or overwriting a teammate's work.

## Setup and local validation

Requirements: Node.js 22 LTS, npm, and Microsoft Edge. From the repository root:

```powershell
npm ci
# If Edge is not already installed (may require administrator permissions):
npx playwright install msedge
npm run dev
```

Development runs the web UI on 5173 and API on 3001. Before the final handoff:

```powershell
npm run format:check
npm run check
npm run test:e2e
git diff --check
git status --short
git diff
```

`npm run check` type-checks and builds the production PWA, then runs Node unit/API tests. Browser tests
exercise that production build in desktop Edge and mobile Chromium emulation using Edge. They are
not physical-device, iOS/Safari, or native release validation. Format only affected files with
Prettier where possible to avoid unrelated changes; re-run format:check afterward.

Playwright starts npm start on port 3001 and reuses a local server only outside CI. A reused server
must be current and from the intended checkout. Arrange a free port 3001 for a fresh run; do not kill
unidentified or teammate-owned processes. Do not run competing test servers on the same port.

Review new/untracked files too: git diff does not display their contents. Include relevant failure
logs without secrets or real health information. State skipped or blocked checks honestly.

## Pull requests and CI

Use the PR template and request the other developer's review. Review application behavior, shared
boundaries, documentation consistency, and actual validation output, not just generated summaries.
Do not merge your own scope-changing proposal based on agent approval.

[CI](.github/workflows/ci.yml) uses Node 22 on a clean Windows runner, installs the locked dependencies
and Edge, and runs formatting, build, unit/API tests, browser tests, and whitespace checks. Failure
traces are retained briefly as synthetic-only diagnostic artifacts. The workflow has read-only
repository permissions and does not deploy or need application secrets.

### One-time repository administrator setup

These are **manual settings, not enabled by committing files**:

1. Enable GitHub Actions for this repository and merge the workflow. Confirm a successful run.
2. Add a branch protection rule or ruleset for the actual default/integration branch (do not assume
   main versus master). Require pull requests and at least one approval from another developer.
3. Dismiss stale approvals on new commits; require conversation resolution and the CI job check
   **Validation** (select the check reported by the first workflow run).
4. Require the branch to be up to date, block force pushes/deletion, and restrict bypasses as
   appropriate. Available enforcement depends on the repository plan and permissions.
5. Include instruction, product-plan, decision, and workflow changes in teammate review. Add CODEOWNERS
   later only with the collaborators' confirmed GitHub handles; no reviewer identity is assumed here.

## Handoff checklist

- Acceptance criteria implemented without unrelated scope expansion.
- Tests cover changes and existing clinician/My Health safeguards remain intact.
- Relevant guides, plan, and approved decisions updated where behavior or direction changed.
- Exact checks/results and any unverified platform or CI behavior recorded in the PR.
- Teammate reviewed the latest revision; configured remote checks passed before merge.
