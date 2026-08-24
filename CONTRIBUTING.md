# Contributing

## Workflow

1. Branch from the current `main` branch.
2. Link the change to a requirement in the active execution ledger.
3. Write or update the smallest test that describes the intended behavior.
4. Implement within the existing runtime boundary.
5. Run formatting, lint, type checks, relevant tests, and builds.
6. Record verification evidence in the execution ledger.
7. Use small Conventional Commits.

## Required checks

Run `pnpm check` for every change.
Run `pnpm test:integration` for API or database integration changes.
Run `pnpm test:e2e` for user-visible Studio workflows.
Run `pnpm mobile:export` for mobile routing or bundling changes.

## Pull requests

Pull requests must explain what changed, why it changed, verification performed, and residual risk.
Do not claim CI, deployment, or release success without observing it on the relevant system.
Do not include unrelated formatting or generated artifacts.
