#!/bin/bash
# Runs before every tool use.
# - Blocks force-push to main/develop.
# - Blocks pushes that include forbidden paths (docs/, specs/, datasets/, public/data/).

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.toolName')

if [ "$TOOL_NAME" = "bash" ]; then
  TOOL_ARGS=$(echo "$INPUT" | jq -r '.toolArgs')
  CMD=$(echo "$TOOL_ARGS" | jq -r '.command // empty' 2>/dev/null)

  if echo "$CMD" | grep -qE 'git push'; then
    # Block force-push to a named protected branch
    if echo "$CMD" | grep -qE '(--force|-f)'; then
      branch=$(echo "$CMD" | grep -oE '(main|develop)' | head -1)
      if [ -n "$branch" ]; then
        echo '{"permissionDecision":"deny","permissionDecisionReason":"Force push to protected branch not allowed (git-workflow.md)"}'
        exit 0
      fi
    fi

    # Block push when forbidden paths are in the diff
    base=$(git merge-base HEAD origin/HEAD 2>/dev/null || echo HEAD)
    if git diff --name-only "${base}..HEAD" 2>/dev/null | grep -qE '^(docs|specs|datasets|public/data)/'; then
      echo '{"permissionDecision":"deny","permissionDecisionReason":"Forbidden files in push (docs/specs/datasets/public/data). Remove before pushing."}'
      exit 0
    fi
  fi
fi

exit 0
