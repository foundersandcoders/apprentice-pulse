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

# Check if main tasks need to be marked complete based on subtasks
# Pattern: numbered main tasks (e.g., "1. [ ] Main task") followed by subtasks (e.g., "   - [x] 1.1 Subtask")
while IFS= read -r main_task_line; do
  # Extract the main task number
  main_num=$(echo "$main_task_line" | sed -n 's/^\([0-9]\+\)\. \[ \].*/\1/p')

  if [[ -n "$main_num" ]]; then
    # Count uncompleted subtasks for this main task (e.g., "- [ ] 1.1", "- [ ] 1.2")
    uncompleted_subtasks=$(grep -c "^\s*- \[ \] ${main_num}\." "$PLAN_FILE" 2>/dev/null || echo "0")

    if [[ "$uncompleted_subtasks" -eq 0 ]]; then
      # Check if there are any completed subtasks (to avoid marking empty tasks as done)
      completed_subtasks=$(grep -c "^\s*- \[x\] ${main_num}\." "$PLAN_FILE" 2>/dev/null || echo "0")

      if [[ "$completed_subtasks" -gt 0 ]]; then
        # Mark the main task as complete
        sed -i.bak "s/^${main_num}\. \[ \]/${main_num}. [x]/" "$PLAN_FILE"
        rm -f "${PLAN_FILE}.bak"
      fi
    fi
  fi
done < <(grep '^[0-9]\+\. \[ \]' "$PLAN_FILE")

# Recount remaining tasks after auto-marking main tasks
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

2. **MANDATORY Report Evaluation**: You MUST evaluate if the completed task should be documented in report.md by:
   a. Running: /evaluate-report "$NEXT_TASK"
   b. The evaluation will analyze recent changes and determine if documentation is needed
   c. If significant technical decisions were made or assessment criteria evidence exists, update report.md
   d. This step is NOT optional - always evaluate, even if no update is needed

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
