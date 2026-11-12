## Task
TASK-<N> — <task title> (`backlog/tasks/task-<N> - …md`)
Spec: `specs/<NNN>-<name>/` <!-- or "no-spec" -->

## Summary
<What changed and why, in 2-4 sentences.>

## Changes
- <change 1>
- <change 2>

## Verification
- [ ] lint / typecheck / unit tests: <command and result>
- [ ] integration / e2e: <command and result, or "not run: reason">
- [ ] every new / changed endpoint is in OpenAPI and visible in Swagger UI (`/docs`), or "no API changes"
- [ ] every acceptance criterion of TASK-<N> checked with evidence
- [ ] task closed in this branch (`Done`, final summary)

## Regression risk
- <for each fix / changed behaviour: what else could break, and the test or check that covers it — or "no behaviour change">

## AI review
- Tool: <e.g. Claude Code `/code-review`> on the branch diff against `origin/dev`
- Findings: <fixed: … / left as is: … because … / false positives: … because … / "none">

## Decisions and docs
- ADRs: <new / superseded, or "none">
- Docs updated: <mvp-plan.md / technologies.md / README / runbook, or "none">

## Follow-ups
- <suggested new tasks, not created without approval — or "none">
