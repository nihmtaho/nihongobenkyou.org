# Speckit Provider Rules

## Overview

Files in `.claude/skills/` and `.specify/` are managed by the Speckit provider. Do **not** manually edit these files unless explicitly requested.

## Rules

### 1. Never Edit Skill Definition Files Without Request

**Files protected**: `.claude/skills/*/SKILL.md`

- These files are prompt templates managed by the Speckit provider.
- Manual edits will be overwritten on the next Speckit update.
- **Only edit if the user explicitly requests a modification.**
- If you need to modify skill behavior permanently, update Speckit itself (via the provider's configuration) or request a provider update.

### 2. Never Edit Speckit Configuration Files Without Request

**Files protected**:
- `.specify/**/*` — all Speckit configuration and extension files
- `.specify/integrations/*/` — integration manifests
- `.specify/memory/` — constitution and memory files (machine-generated from updates)
- `.specify/extensions/` — extension definitions

- These are managed by the Speckit provider and may be auto-generated on sync.
- Manual changes risk inconsistency with the provider's expected state.
- **Only edit if explicitly requested by the user.**
- Permanent changes should go through provider CLI or UI, never direct file edits.

### 3. Skip Code Review for Speckit-Managed Files

**During code review (including `/simplify` and other review tasks)**:
- **Skip all files matching**:
  - `.claude/skills/speckit-*/SKILL.md`
  - `.specify/**/*`
  - `.specify/extensions/**/*`
  - Any file in `.specify/` directory
  
- Do not flag these files for:
  - Duplication (expected in provider templates)
  - Code quality (provider's responsibility)
  - Efficiency (not runtime code)
  - Architecture (provider design)
  
- Focus review only on **project-specific code** in `src/`, `e2e/`, and `.claude/rules/`

---

## Why This Matters

- **Provider consistency**: Speckit expects these files in a known state. Manual edits break that contract.
- **Update loss**: The next `speckit sync` or provider update overwrites your changes.
- **Single source of truth**: The provider is authoritative for these files, not your local repo.

## When You Need to Change Skill Behavior

1. **For temporary fixes during development**: Document in the skill file that this is a session-only change.
2. **For permanent changes**: Submit a PR to the Speckit provider or request an update via their issue tracker.
3. **For project-specific rules**: Add them to `.claude/rules/` (e.g., `code-quality.md`, `git-workflow.md`) — these are your project's rules, not Speckit's.

