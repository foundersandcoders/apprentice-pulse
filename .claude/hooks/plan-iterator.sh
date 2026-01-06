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
REMAINING=$(grep -c '^\s*\([0-9]\+\.\s*\)\?\s*- \[ \]' "$PLAN_FILE" 2>/dev/null | head -1 || echo "0")
REMAINING=${REMAINING:-0}

# All tasks complete - cleanup and exit
if [[ "$REMAINING" -eq 0 ]]; then
  rm -f "$LOOP_MARKER"
  exit 0
fi

# Count completed tasks
COMPLETED=$(grep -c '^\s*\([0-9]\+\.\s*\)\?\s*- \[x\]' "$PLAN_FILE" 2>/dev/null | head -1 || echo "0")
COMPLETED=${COMPLETED:-0}

# Stage all changes FIRST
git add -A >/dev/null 2>&1 || true

# Then commit if there are staged changes
if ! git diff --cached --quiet 2>/dev/null; then
  if [[ "$COMPLETED" -gt 0 ]]; then
    LAST_DONE=$(grep -E '^\s*\([0-9]\+\.\s*\)?\s*- \[x\]' "$PLAN_FILE" | tail -1 | sed 's/.*\[x\] //')
    git commit -m "feat: $LAST_DONE" >/dev/null 2>&1 || true
  fi
fi

# Find next task
NEXT_TASK=$(grep -m1 '^\s*\([0-9]\+\.\s*\)\?\s*- \[ \]' "$PLAN_FILE" | sed 's/.*\[ \] //' | sed 's/"/\\"/g')

# Build the reason message for Claude
read -r -d '' REASON << MSGEOF
PLAN ITERATOR: Continue with the next task.

## Current Progress
Completed: $COMPLETED | Remaining: $REMAINING

## Next Task
$NEXT_TASK

## Post-Task Checklist (do after completing the task above)

1. **Mark done**: Change \`- [ ]\` to \`- [x]\` for the completed task in docs/plan.md

2. **Report evaluation**: Consider if what you just implemented could serve as evidence for any criteria in docs/Assessment-criteria.md (P1-P11, D1-D4). If yes, run /update-report. If not, move on.

3. **Working preferences**:
   - Keep changes small and focused
   - Ensure code is consistent with existing patterns
   - Use proven, well-established approaches
   - Never add AI attribution

## To Stop Early
Run /stop or delete .claude/loop
MSGEOF

# Escape reason for JSON
ESCAPED_REASON=$(echo "$REASON" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read())[1:-1])')

# Return JSON with decision: block to prevent Claude from stopping
echo "{\"decision\": \"block\", \"reason\": \"$ESCAPED_REASON\"}"
