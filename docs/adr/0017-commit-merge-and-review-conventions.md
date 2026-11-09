# 0017. Commit, merge and review conventions

- Status: accepted (amends [0012](0012-git-workflow.md), supersedes [0015](0015-backlog-update-commits-on-dev.md))
- Date: 2026-11-09
- Deciders: project owner

## Context and problem statement

ADR 0012 merged PRs with squash, so `dev` got one commit per task and the step-by-step
history of the branch was lost. ADR 0015 added a second message format
(`Update #<N>: …`) for backlog-only commits. In a commit message GitHub links `#<N>`
to the PR or issue with that number, not to the backlog task. The owner now reviews
every commit, so every commit is meaningful and worth keeping, and one message format
is enough.

## Considered options

- Squash merge, Conventional PR titles, `Update #N` for the backlog (ADRs 0012 + 0015)
- Rebase merge: linear history, no task boundary
- Merge commit with the task in its title, Conventional Commits for every commit

## Decision

1. **Review before every commit.** The agent works in small steps: one step is one
   reviewable change that leaves the build green. After each step it stops, and the
   working tree holds only that step's changes. It reports the files, what changed and
   why, how the change was verified, and the proposed commit message. It commits only
   after the owner approves.
2. **Conventional Commits for every commit:** `<type>(<scope>)?: <subject>`.
   - Types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `build`, `ci`, `chore`,
     `revert`. A breaking change is marked with `!`.
   - The scope is the app or area (`catalog`, `gateway`, `web`, `dto`, `backlog`,
     `process`).
   - The subject is English, imperative, at most 72 characters, with no trailing
     period.
   - No task id in branch commits: the branch and the merge commit carry it.
3. **PRs into `dev` are merged with a merge commit** (no squash, no rebase). The PR
   title is a Conventional Commit. The merge commit is titled
   `Merge TASK-<N>: <PR title> (#<PR>)` (`BUG-<N>` for a bug), and its body is the PR
   summary. `git log --first-parent dev` then lists one line per task, and any commit
   leads to its task through its merge commit.
4. **Directly on `dev`, without a branch or a PR**, still reviewed, and pushed only
   with the owner's approval:
   - backlog-only changes: `chore(backlog): <what changed>`, e.g.
     `chore(backlog): create TASK-22 and TASK-23`;
   - changes to the repository's own rules: `AGENTS.md`, `CLAUDE.md`,
     `docs/playbooks/`, process ADRs, the PR template, `.claude/skills/`, the
     constitution. Format: `docs(process): <what changed>`.

   Everything else goes through a `task-<N>` / `bug-<N>` branch (ADR 0012).
5. Write task ids as `TASK-<N>`, never `#<N>`: on GitHub `#<N>` means a PR or an
   issue.

## Consequences

- `dev` keeps the reviewed steps. `git bisect` finds the step that broke something, and
  `git revert -m 1 <merge>` undoes a whole task.
- Merged branches count as merged (`git branch -d` works).
- One message format everywhere. release-please reads `feat` / `fix` and ignores
  `chore` / `docs`.
- Every branch commit must build and carry a proper message, because none are squashed
  away. The per-commit review enforces this.
- Older commits on `dev` keep their `Update #<N>` and `(TASK-<N>)` titles; history is
  not rewritten.
