# release — move stable work from dev to main

## Follow when
- The owner asks to release / "merge to main", or a milestone is reached
  (e.g. TASK-20, the `mvp-v1` freeze).
- Not for single tasks — they go to `dev` through `close-task.md`.

## Rules
1. `dev` is green in CI and every task merged since the last release is `Done`.
2. Open a PR `dev → main` titled `release: <short summary>`; body lists the tasks
   (TASK-<N>) included. **Merge commit**, not squash, so `main` keeps the task commits.
3. Push / PR / merge only with the owner's explicit approval.
4. Version tags `v<semver>` are created by release-please on `main` (once TASK-19 sets
   it up); until then tag by hand after approval. The finished MVP is the
   annotated tag `mvp-v1`; follow-up work branches from it.
5. After the merge, fast-forward `dev` to `main` if they diverged.

## Limits
- Never commit directly on `main`; never force-push `main`.

## Done when
- `main` contains the release, the tag exists on the remote, `dev` is not behind `main`.
