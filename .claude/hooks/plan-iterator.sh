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
REMAINING=$(grep -c '^\s*- \[ \]' "$PLAN_FILE" 2>/dev/null || echo "0")

# All tasks complete - cleanup and exit
if [[ "$REMAINING" -eq 0 ]]; then
  rm -f "$LOOP_MARKER"
  exit 0
fi

# Count completed tasks
COMPLETED=$(grep -c '^\s*- \[x\]' "$PLAN_FILE" 2>/dev/null || echo "0")

# Auto-commit if there are staged changes
if ! git diff --cached --quiet 2>/dev/null; then
  if [[ "$COMPLETED" -gt 0 ]]; then
    LAST_DONE=$(grep -E '^\s*- \[x\]' "$PLAN_FILE" | tail -1 | sed 's/.*\[x\] //')
    git commit -m "feat: $LAST_DONE" 2>/dev/null || true
  fi
fi

# Stage changes for next commit
git add -A 2>/dev/null || true

# Find next task
NEXT_TASK=$(grep -m1 '^\s*- \[ \]' "$PLAN_FILE" | sed 's/.*\[ \] //' | sed 's/"/\\"/g')

# Build the system message
read -r -d '' MESSAGE << MSGEOF
PLAN ITERATOR: Continue with the next task.

## Current Progress
Completed: $COMPLETED | Remaining: $REMAINING

## Next Task
$NEXT_TASK

## Post-Task Checklist (do this after completing the task above)
1. Mark the task as done with [x] in docs/plan.md
2. **Report evaluation**: If this task involved an interesting technical decision, run /update-report to document it. Only do this for meaningful changes - not every task needs documentation.
3. Follow working preferences:
   - Keep changes small and focused on just this task
   - Ensure code is consistent with existing patterns
   - Use proven, well-established approaches
   - Never add AI attribution to commits or code

## To Stop Early
Run /stop or delete .claude/loop
MSGEOF

# Escape message for JSON
ESCAPED_MSG=$(echo "$MESSAGE" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read())[1:-1])')

# Return JSON to continue
echo "{\"continue\": true, \"systemMessage\": \"$ESCAPED_MSG\"}"
