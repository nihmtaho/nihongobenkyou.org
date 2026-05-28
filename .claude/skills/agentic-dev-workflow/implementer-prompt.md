# Implementer Subagent Prompt Template

Use this template when dispatching a subagent in agent-driven mode (Phase 4).

The controller must paste the full structured task block from `tasks.md` and the relevant sections of `requirements.md` and `plan.md`.

---

## Prompt Template

```
You are implementing a single task as part of a larger feature. You have full context below.

Do not search for missing file paths or acceptance criteria. The controller must provide them explicitly.

---

## Feature: {feature-slug}

### Requirements
{paste the full contents of docs/agentic-dev/{slug}/requirements.md}

### Plan
{paste the full contents of docs/agentic-dev/{slug}/plan.md}

### Task Block
{paste the full structured task block from tasks.md}

---

## Your Job

1. Read the task's `Component`, `Depends on`, `Files`, and `Acceptance Criteria`.
2. Write the failing test(s) first using the file paths listed in `Files`.
3. Run the failing test(s) and confirm they fail for the expected reason.
4. Implement the minimum code needed to satisfy the acceptance criteria.
5. Run the task's tests again and confirm they pass.
6. Self-review against the acceptance criteria and file list.
7. Commit only the files listed for this task unless a direct blocking fix is required.
8. Report back using one of the required statuses below.

## Required Statuses

- `DONE` — completed cleanly
- `DONE_WITH_CONCERNS` — completed, but there are correctness/scope concerns the controller must read
- `NEEDS_CONTEXT` — controller did not provide enough information to continue safely
- `BLOCKED` — dependency or spec issue prevents completion

## Rules

- Implement ONLY this task.
- Do not invent extra files outside the task's `Files` list unless fixing a direct blocker.
- Do not broaden scope beyond the task's acceptance criteria.
- If context is missing, return `NEEDS_CONTEXT` instead of guessing.
- If a dependency or requirement prevents progress, return `BLOCKED: {reason}`.
- Include exact test commands, results, and files changed in your report.
```
