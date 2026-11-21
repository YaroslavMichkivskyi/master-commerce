# test-cases — write a task's test cases and run them

## Follow when
- A `speckit-full` / `speckit-light` task has its `tasks.md` (write the cases), and
  again when its implementation is complete, before `close-task.md` (run them).
- A bug task: one case reproducing the bug, written before the fix.
- The owner asks to "write / run the test cases" of a task.
- Not for `no-spec` tasks without user-visible behaviour (a checklist is enough there).

## The table — `specs/<NNN>-<name>/test-cases.md`
One Markdown table per task; a case is one row and keeps its **ID for life**
(`TC-01`, `TC-02`, …; a removed case leaves a gap, ids are never reused).

| Column | Owner | What |
|---|---|---|
| ID | author | `TC-nn` |
| Goal | author | what the case proves, one line, with the FR / US / AC it covers |
| Preconditions | author | data and state needed (seed, account, stack, flags) |
| Steps | author | numbered, concrete: URLs, inputs, clicks or requests |
| Expected | author | observable result: what is shown / returned, status codes |
| Kind | author | `UI`, `API` or `DB` |
| Coverage | developer | the automated test that asserts *this* expectation (`path/to/x.test.ts` › test name), `manual`, or `not covered` + why |
| Result | runner | last run: `PASS`, `FAIL`, `BLOCKED`, `NOT RUN` + the run date |

Rules for writing:
1. Every AC of the backlog task and every acceptance bullet of the spec has at least
   one case; edge states are cases too (empty, error / unavailable, limits, invalid
   input, old addresses, visibility, security inputs).
2. A row with `Preconditions` only (no steps) describes shared setup, has no result.
3. Steps and expectations name real data — a fixed seed (`pnpm datagen --seed demo`),
   a concrete slug or request — so anyone can repeat them.
4. "Covered" means a test asserts this case's expected result, not that the touched
   file has tests. Prefer automating a case over keeping it `manual`.
5. The table is committed with the task; it is reviewed like code.

## Running the cases
1. **What is under test:** branch, commit, `git diff origin/dev --stat`; classify the
   change (DB, API, UI) — it decides which kinds of cases must run by hand.
2. **Environment:** `pnpm dev` with migrations applied (verify: the migration is in the
   journal and a second run applies nothing), data from the seed the cases name.
3. **Automated coverage:** run the suites named in `Coverage`
   (`pnpm turbo run test test:integration --filter=…`); a case whose test fails is `FAIL`.
4. **Manual cases:** `UI` through a browser on `http://localhost:3000` (browser
   automation is fine), `API` with requests to the gateway / Swagger UI, `DB` with
   `psql`. Follow the steps **exactly as written**; a step that looks wrong is executed
   as written and raised as a question. Evidence per case: what was done, what was
   seen; a screenshot for a UI failure.
5. **Never fix during a run.** A failure is recorded, not repaired; a suggested fix may
   be written in the report. One failing case does not stop the run.
6. **Never fabricate a result:** a case that could not run is `BLOCKED` / `NOT RUN`
   with the reason.
7. **Report** to `test-reports/<NNN>-test-run-<YYYY-MM-DD>.md` in the repo root
   (gitignored, never committed):

   ```markdown
   # Test run — TASK-<N>
   - Branch / commit: …   - Date: …   - Stack and data: …
   - Migrations verified: yes (evidence) | not applicable
   ## Summary
   <n> cases — <n> pass, <n> fail, <n> blocked, <n> not run; <n> questions.
   ## Results
   | ID | Goal | Result | Manual | Coverage | Comment |
   ## Findings   — each FAIL: expected vs actual, steps to reproduce, evidence
   ## Questions  — numbered, each tied to a case ID
   ```
8. **Hand off:** update the `Result` (and `Coverage`, if it changed) column of the
   table, and report in chat: the summary line, every `FAIL` / `BLOCKED` id, the
   questions, the report path, and what was not verified.
9. **After the run:** each failure is fixed in the task as a reviewed step
   (`start-task.md` step 6) and its case re-run; a failure found after the task is
   merged becomes a bug task (`create-task.md`) whose first case reproduces it.

## Limits
- Never type real credentials into a form; test accounts come from the seed.
- The report stays local; the table never holds personal or real-project data.

## Done when
- Every AC has a case; every case has a coverage value; the last run has no `FAIL`
  and every `BLOCKED` / `NOT RUN` has a reason the owner accepted.
