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
   that cannot run is reported as not run, never as passed. CI can also be run by hand
   on the branch before the PR: `gh workflow run ci.yml --ref task-<N>` (inputs `lint`,
   `typecheck`, `test`, `integration`, `scope`).
4. **AI review of the branch.** Before the PR, run an AI code review of the whole branch
   diff against `origin/dev` (Claude Code: `/code-review`). The review advises; the
   owner decides, and it never replaces the owner's review.
   1. **Verify every finding first** — a reviewer can be wrong. Read the code it points
      at and, where possible, prove it with a failing test, a run or a log. Verdict:
      *real*, or *false positive* (misread code, wrong assumption, already handled
      elsewhere). Never fix or report a finding as real without that check.
   2. **Report to the owner before changing anything**, one row per finding: what it
      claims; verdict with the evidence; for a real one — why it is a problem, the
      impact (what breaks, for whom, how likely, how bad), and the proposed fix with
      its cost; for a false positive — why it is not real.
   3. Fix only the real findings the owner approves, each fix a reviewed step
      (`start-task.md` step 6). A real finding left as is gets a reason, or a follow-up
      task with the owner's approval.
   4. Record the result in the PR body, section "AI review": fixed, left as is (why),
      false positives.
5. **Prove each acceptance criterion** (`backlog task view TASK-<N> --plain`) and tick
   only the proven ones: `backlog task edit TASK-<N> --check-ac 1 --check-dod 1 …`.
   An unprovable AC → fix it, or ask the owner to change / move it — never tick it.
6. **spec-kit tasks:** every item in `specs/<NNN>-*/tasks.md` is `[X]`; spec, plan and
   code agree (spec first if they diverged); `.specify/feature.json` points at this spec.
7. **Docs in the same PR:** OpenAPI / Swagger UI for every new or changed endpoint
   (open `/docs` and check it — ADR 0014), ADRs for lasting decisions, `docs/technologies.md` for
   every newly applied technology, README / runbook for changed commands.
8. **Close the task in the branch:**
   `backlog task edit TASK-<N> --final-summary "<what changed, why, how verified, risks>" -s Done`.
   The status lands on `dev` together with the code when the PR is merged. If the PR
   is rejected, set it back to `In Progress`.
9. **Final commit** after the owner's review (`start-task.md` step 6), Conventional
   Commits, English. Working tree clean afterwards.
10. **Push and open the PR — only after the owner approves the exact payload**
    (branch, PR title, body). One approval = one push + one PR.
    - Push: `git push -u origin task-<N>`.
    - PR: base `dev`, head `task-<N>`; title = a Conventional Commit summarising the
      task, e.g. `feat(catalog): product attributes` / `fix(order): stale price`;
      body = `.github/pull_request_template.md` filled in (its Task section names TASK-<N>).
11. **Merge — only with the owner's approval** (ADR 0017): merge method **merge commit**
    (never squash or rebase), title `Merge TASK-<N>: <PR title> (#<PR>)` (`BUG-<N>` for
    a bug), body = the PR summary.
12. **After the merge:** `git checkout dev`, `git pull --ff-only`, delete the branch
    locally (`git branch -d task-<N>`) and on the remote. Report the next ready task.

## Limits
- Never merge without the owner's approval, never squash, never push code to `dev` /
  `main` directly, never force-push a branch someone else has pulled.
- Never tick an AC or DoD item without evidence; never mark `Done` with failing checks.
- No new follow-up tasks without approval — list them in the PR body instead.

## Done when
- The PR `task-<N> → dev` is open, its CI is green, its body links TASK-<N> and lists
  verification and the AI review result.
- In the branch, the task is `Done` with all ACs / DoD ticked and a final summary.
- The working tree is clean; the owner has the PR link.
