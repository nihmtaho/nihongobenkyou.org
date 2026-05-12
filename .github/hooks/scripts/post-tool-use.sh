#!/bin/bash
# Runs after every tool use.
# - Type-checks TS/TSX files that were just edited or created.
# - Warns if the current branch is a protected branch.

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.toolName')

if [ "$TOOL_NAME" = "edit" ] || [ "$TOOL_NAME" = "create" ]; then
  TOOL_ARGS=$(echo "$INPUT" | jq -r '.toolArgs')
  FILE=$(echo "$TOOL_ARGS" | jq -r '.path // .file_path // empty' 2>/dev/null)

  if echo "$FILE" | grep -qE '\.(ts|tsx)$'; then
    result=$(pnpm exec tsc --noEmit 2>&1)
    if [ $? -ne 0 ]; then
      echo "$result" >&2
    fi
  fi

  branch=$(git branch --show-current 2>/dev/null)
  if echo "$branch" | grep -qE '^(main|develop)$'; then
    echo "WARNING: On protected branch '${branch}'. Create a feature branch before making changes." >&2
  fi
fi

exit 0
