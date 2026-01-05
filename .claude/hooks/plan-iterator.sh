#!/bin/bash

# Plan Iterator Hook (Stop event)
# Automatically continues through tasks in docs/plan.md
#
# Activation: .claude/loop marker must exist (created by /plan)
# Deactivation:
#   - Complete all tasks (auto-removes marker)
#   - Manually delete .claude/loop

PLAN_FILE="docs/plan.md"
LOOP_MARKER=".claude/loop"

# Only run if loop marker exists (opt-in)
if [[ ! -f "$LOOP_MARKER" ]]; then
  exit 0
fi

# No plan file = stop and cleanup
if [[ ! -f "$PLAN_FILE" ]]; then
  rm -f "$LOOP_MARKER"
  exit 0
fi

# Count remaining tasks (unchecked boxes)
REMAINING=$(grep -c '^\s*- \[ \]' "$PLAN_FILE" 2>/dev/null | head -1 || echo "0")
REMAINING=${REMAINING:-0}

# All tasks complete - cleanup and exit
if [[ "$REMAINING" -eq 0 ]]; then
  rm -f "$LOOP_MARKER"
  exit 0
fi

# Count completed tasks
COMPLETED=$(grep -c '^\s*- \[x\]' "$PLAN_FILE" 2>/dev/null | head -1 || echo "0")
COMPLETED=${COMPLETED:-0}

# Stage all changes FIRST
git add -A 2>/dev/null || true

# Then commit if there are staged changes
if ! git diff --cached --quiet 2>/dev/null; then
  if [[ "$COMPLETED" -gt 0 ]]; then
    LAST_DONE=$(grep -E '^\s*- \[x\]' "$PLAN_FILE" | tail -1 | sed 's/.*\[x\] //')
    git commit -m "feat: $LAST_DONE" 2>/dev/null || true
  fi
fi

# Find next task
NEXT_TASK=$(grep -m1 '^\s*- \[ \]' "$PLAN_FILE" | sed 's/.*\[ \] //' | sed 's/"/\\"/g')

# Build the reason message for Claude
read -r -d '' REASON << MSGEOF
Plan has $REMAINING remaining tasks. Next task: $NEXT_TASK

After completing this task:
1. Mark it done with [x] in docs/plan.md
2. Consider if it's evidence for assessment criteria (docs/Assessment-criteria.md) - if yes, run /update-report
3. Keep changes small, consistent with existing patterns, no AI attribution

To stop early: run /stop or delete .claude/loop
MSGEOF

# Escape reason for JSON
ESCAPED_REASON=$(echo "$REASON" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read())[1:-1])')

# Return JSON with decision: block to prevent Claude from stopping
echo "{\"decision\": \"block\", \"reason\": \"$ESCAPED_REASON\"}"
