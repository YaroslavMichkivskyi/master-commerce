# close-task — finish a task and open its PR

## Follow when
- Implementation of a backlog task is complete on its branch `task-<N>` / `bug-<N>`,
  or the owner says "close TASK-N" / "open the PR".
- Not when the work is unfinished — then report what is left instead.

## Rules
1. **Right branch.** `git branch --show-current` is `task-<N>` (or `bug-<N>` for a task
   of type bug) and `<N>` matches the task. Wrong or missing branch → stop; move the
   commits onto a correctly named branch cut from `dev` first.
2. **Up to date with `dev`:** `git fetch origin` then `git rebase origin/dev` (or
   merge if the branch is already shared); resolve conflicts and re-run checks.
3. **Verify, don't assume.** Run lint, typecheck and tests of affected packages
   (`pnpm turbo run lint typecheck test --filter=...[origin/dev]`) and the relevant
   integration / e2e tests via Docker Compose. UI → exercise it in a browser. A check
   that cannot run is reported as not run, never as passed.
4. **Prove each acceptance criterion** (`backlog task view TASK-<N> --plain`) and tick
   only the proven ones: `backlog task edit TASK-<N> --check-ac 1 --check-dod 1 …`.
   An unprovable AC → fix it, or ask the owner to change / move it — never tick it.
5. **spec-kit tasks:** every item in `specs/<NNN>-*/tasks.md` is `[X]`; spec, plan and
   code agree (spec first if they diverged); `.specify/feature.json` points at this spec.
6. **Docs in the same PR:** ADRs for lasting decisions, `docs/technologies.md` for
   every newly applied technology, README / runbook for changed commands.
7. **Close the task in the branch:**
   `backlog task edit TASK-<N> --final-summary "<what changed, why, how verified, risks>" -s Done`.
   The status lands on `dev` together with the code when the PR is merged. If the PR
   is rejected, set it back to `In Progress`.
8. **Final commit**, Conventional Commits, English. Working tree clean afterwards.
9. **Push and open the PR — only after the owner approves the exact payload**
   (branch, PR title, body). One approval = one push + one PR.
   - Push: `git push -u origin task-<N>`.
   - PR: base `dev`, head `task-<N>`; title = Conventional Commit with the task id,
     e.g. `feat(catalog): product attributes (TASK-4)` / `fix(order): stale price (TASK-23)`;
     body = `.github/pull_request_template.md` filled in.
10. **After the merge** (squash, done by the owner): `git checkout dev`,
    `git pull --ff-only`, delete the branch locally (`git branch -d task-<N>`) and on the
    remote if GitHub did not. Report the next ready task.

## Limits
- Never merge the PR yourself, never push to `dev` / `main` directly, never force-push
  a branch someone else has pulled.
- Never tick an AC or DoD item without evidence; never mark `Done` with failing checks.
- No new follow-up tasks without approval — list them in the PR body instead.

## Done when
- The PR `task-<N> → dev` is open, its CI is green, its body links TASK-<N> and lists
  verification.
- In the branch, the task is `Done` with all ACs / DoD ticked and a final summary.
- The working tree is clean; the owner has the PR link.
