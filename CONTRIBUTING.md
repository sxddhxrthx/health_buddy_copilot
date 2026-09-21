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

Requirements: Node.js 22 LTS (22.13 or newer), npm, and Microsoft Edge. From the repository root:

```powershell
npm ci
# If Edge is not already installed (may require administrator permissions):
npx playwright install msedge
npm run dev
```

Development runs the web UI on 5173 and API on 3001.

The server provisions fictional accounts and records in ignored `.local/` storage on first startup.
Read `.local/demo-accounts.json` privately for login details; never attach it to issues, screenshots,
logs or commits. No public sign-up is enabled. POSIX modes or a Windows current-user/SYSTEM ACL
protect the local directory. Only pass a dedicated app-data directory through RESEARCH_TWIN_DATA_DIR.
APP_ORIGIN must exactly match the browser origin (development default: http://localhost:5173).

Provisioning now includes 200 fictional patients and two doctors. The 197 additional patients have
16 sample readings and two finalized fictional visits each, initially shared with both doctors.
Existing accounts, passwords, records and sharing choices remain unchanged; restart the app to apply
the additive population seed. Initial password hashing takes longer than subsequent startups.
The current-patient selector remains grant-filtered (199 patients for Avery and 198 for Riley on a
fresh store). These accounts are separate from the 200 server-only condition-cohort fixtures and
Alex Morgan's unchanged reference demo. Do not reset the database to obtain the added patients.

For a production-style local demo after npm ci, run `npm run demo` and open http://localhost:8080.
Alternatively, Docker Desktop with Linux containers provides the complete setup, including Node,
dependencies, database initialization and seeded accounts:

```powershell
docker compose up --build --wait
```

The local `npm run demo` server and Compose both default to port 8080. Stop your local demo
before switching to Compose. If startup reports `ports are not available` or `address already
in use`, do not delete the database volume or stop an unidentified process. Keep both setups
running on different ports instead:

```powershell
$env:DEMO_PORT = '8081'
docker compose up --build --wait
```

Open http://localhost:8081 in that case. `DEMO_PORT` updates both the published port and the
authentication origin, so use `localhost`, not `127.0.0.1`, in the browser. To return to port 8080,
remove the override with `Remove-Item Env:DEMO_PORT` and rerun Compose after freeing that port.

Open http://localhost:8080. First build requires network access. Subsequent starts preserve the
named volume; startup never resets data. Credentials are inside the app container at
`/data/demo-accounts.json`; use Docker Desktop's container Files view to inspect them privately.
The local command uses `.local/`; Compose uses its own volume. They are intentionally separate.
The initializer runs as root only to set ownership on that volume, without network access; the
application runs as the unprivileged node user with a read-only root filesystem. Docker access
itself is privileged. Do not use this configuration with real data or expose it publicly.

The runtime image contains compiled server JavaScript, production dependencies and UI assets, not
npm, Yarn or the development toolchain. `npm run build:server` checks the container's server output
and is included in `npm run check`. Build with `--pull` and periodically `--no-cache` to refresh
Alpine's security packages; a cached image does not pick up new fixes automatically. Scan the final
image for package vulnerabilities before deployment. A Dockerfile warning describes its upstream
base and may not account for package upgrades/removals in subsequent layers; do not suppress it or
treat a clean scan as a general security or compliance guarantee.

Use `docker compose down` to stop without deleting data. A full reset requires deliberate removal
of the demo volume after backup; do not make volume deletion part of normal startup. The patient
reset button removes only personal entries/imports, never sharing settings or finalized visits.
Back up SQLite consistently with its backup API or stop the app before copying the entire local
data directory/volume, including auth files. Do not copy a live WAL database file by itself.

Before the final handoff:

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

Keep Prettier-checked source extensions covered by the LF rules in `.gitattributes`. Windows CI
checks out with Git line-ending conversion; local formatting alone does not verify checkout behavior.

Playwright starts its test server on a free port 3001, sets APP_ORIGIN to http://127.0.0.1:3001, and
recreates only the dedicated ignored `.local/e2e` store for each suite run. Never put manual demo
data there. It never reuses a running server. Arrange the free port
without killing unidentified or teammate-owned processes. Tests provision sessions through Better
Auth's trusted server API; the login-form journey separately exercises the public sign-in endpoint.
This avoids rate-limit bursts without weakening production rate limits. Authentication tests use
temporary SQLite directories. Browser network traces are disabled to avoid retaining passwords or
cookies; failure screenshots contain synthetic data only. Compose changes also require
`docker compose config --quiet` and, when available, clean Linux-container startup/restart checks.

Review new/untracked files too: git diff does not display their contents. Include relevant failure
logs without secrets or real health information. State skipped or blocked checks honestly.

## Pull requests and CI

Use the PR template and request the other developer's review. Review application behavior, shared
boundaries, documentation consistency, and actual validation output, not just generated summaries.
Do not merge your own scope-changing proposal based on agent approval.

[CI](.github/workflows/ci.yml) uses Node 22 on a clean Windows runner, installs the locked dependencies
and Edge, and runs formatting, build, unit/API tests, browser tests, and whitespace checks. Failure
traces are retained briefly as synthetic-only diagnostic artifacts. The workflow has read-only
repository permissions and does not deploy or need externally supplied application secrets.
Generated local credentials and databases must never be uploaded as CI artifacts.

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
