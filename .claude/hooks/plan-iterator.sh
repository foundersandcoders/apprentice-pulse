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

# Load file once into memory for efficient processing
PLAN_TEXT=$(cat "$PLAN_FILE")

# Quick counting using combined regex patterns (micro-optimization)
REMAINING=$(printf '%s\n' "$PLAN_TEXT" | grep -Ec '^[0-9]+\.\s*\[\s*\]|^\s*-\s*\[\s*\]' 2>/dev/null || echo "0")
COMPLETED=$(printf '%s\n' "$PLAN_TEXT" | grep -Ec '^[0-9]+\.\s*\[x\]|^\s*-\s*\[x\]' 2>/dev/null || echo "0")

# Single-pass parsing to track task relationships for auto-completion
declare -A main_tasks          # main_tasks[num]="status" (incomplete/complete)
declare -A subtask_counts      # subtask_counts[num]="incomplete:complete"
declare -a tasks_to_complete   # Array of main task numbers to mark complete

# Parse task relationships from memory (not file)
while IFS= read -r line; do
  # Main task - incomplete: "1. [ ] Task name"
  if [[ $line =~ ^([0-9]+)\.[[:space:]]*\[[[:space:]]*\][[:space:]]*(.*)$ ]]; then
    num="${BASH_REMATCH[1]}"
    main_tasks[$num]="incomplete"

  # Main task - complete: "1. [x] Task name"
  elif [[ $line =~ ^([0-9]+)\.[[:space:]]*\[x\][[:space:]]*(.*)$ ]]; then
    num="${BASH_REMATCH[1]}"
    main_tasks[$num]="complete"

  # Subtask: "   - [ ] 1.1 Subtask" or "   - [x] 1.1 Subtask"
  elif [[ $line =~ ^[[:space:]]+-[[:space:]]*\[([[:space:]x])\][[:space:]]*([0-9]+)\.(.*)$ ]]; then
    status="${BASH_REMATCH[1]}"
    num="${BASH_REMATCH[2]}"

    # Initialize subtask counts if not exists
    if [[ -z "${subtask_counts[$num]}" ]]; then
      subtask_counts[$num]="0:0"  # incomplete:complete
    fi

    # Update counts
    IFS=':' read -r inc comp <<< "${subtask_counts[$num]}"
    if [[ "$status" == "x" ]]; then
      subtask_counts[$num]="$inc:$((comp + 1))"
    else
      subtask_counts[$num]="$((inc + 1)):$comp"
    fi
  fi
done <<< "$PLAN_TEXT"

# Determine which main tasks should auto-complete
for main_num in "${!subtask_counts[@]}"; do
  if [[ "${main_tasks[$main_num]}" == "incomplete" ]]; then
    IFS=':' read -r incomplete complete <<< "${subtask_counts[$main_num]}"

    # If no incomplete subtasks and at least one complete subtask
    if [[ $incomplete -eq 0 && $complete -gt 0 ]]; then
      tasks_to_complete+=("$main_num")
    fi
  fi
done

# Update file if any main tasks need to be marked complete
if [[ ${#tasks_to_complete[@]} -gt 0 ]]; then
  # Create backup and update file
  cp "$PLAN_FILE" "${PLAN_FILE}.bak"

  for task_num in "${tasks_to_complete[@]}"; do
    sed -i "s/^${task_num}\. \[ \]/${task_num}. [x]/" "$PLAN_FILE"
  done

  rm -f "${PLAN_FILE}.bak"

  # Recalculate counts after auto-completion (load updated file)
  PLAN_TEXT=$(cat "$PLAN_FILE")
  REMAINING=$(printf '%s\n' "$PLAN_TEXT" | grep -Ec '^[0-9]+\.\s*\[\s*\]|^\s*-\s*\[\s*\]' 2>/dev/null || echo "0")
  COMPLETED=$(printf '%s\n' "$PLAN_TEXT" | grep -Ec '^[0-9]+\.\s*\[x\]|^\s*-\s*\[x\]' 2>/dev/null || echo "0")
fi

# All tasks complete - cleanup and exit
if [[ "$REMAINING" -eq 0 ]]; then
  rm -f "$LOOP_MARKER"
  exit 0
fi

# Stage all changes FIRST
git add -A >/dev/null 2>&1 || true

# Then commit if there are staged changes
if ! git diff --cached --quiet 2>/dev/null; then
  if [[ "$COMPLETED" -gt 0 ]]; then
    # Find last completed task for commit message (both main tasks and subtasks)
    LAST_DONE=""
    if command -v tac >/dev/null 2>&1; then
      # Use tac if available (Linux)
      LAST_DONE=$(printf '%s\n' "$PLAN_TEXT" | grep -E '^[0-9]+\.\s*\[x\]|^\s*-\s*\[x\]' | tac | head -1 | sed -E 's/.*\[x\]\s*//')
    else
      # Fallback for macOS (no tac)
      LAST_DONE=$(printf '%s\n' "$PLAN_TEXT" | grep -E '^[0-9]+\.\s*\[x\]|^\s*-\s*\[x\]' | tail -1 | sed -E 's/.*\[x\]\s*//')
    fi

    if [[ -n "$LAST_DONE" ]]; then
      git commit -m "feat: $LAST_DONE" >/dev/null 2>&1 || true
    fi
  fi
fi

# Find next task (both main tasks and subtasks) - use current PLAN_TEXT
NEXT_TASK=""
# Try main tasks first, then subtasks using -E for cleaner regex
NEXT_MAIN=$(printf '%s\n' "$PLAN_TEXT" | grep -m1 -E '^[0-9]+\.\s*\[\s*\]' | sed -E 's/^[0-9]+\.\s*\[\s*\]\s*//' | sed 's/"/\\"/g')
NEXT_SUB=$(printf '%s\n' "$PLAN_TEXT" | grep -m1 -E '^\s*-\s*\[\s*\]' | sed -E 's/^\s*-\s*\[\s*\]\s*//' | sed 's/"/\\"/g')

if [[ -n "$NEXT_MAIN" ]]; then
  NEXT_TASK="$NEXT_MAIN"
elif [[ -n "$NEXT_SUB" ]]; then
  NEXT_TASK="$NEXT_SUB"
fi

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

3. **MANDATORY Test Evaluation**: You MUST evaluate what testing is needed for the completed task by:
   a. Running: /evaluate-tests "$NEXT_TASK"
   b. The evaluation will determine if unit tests, API tests, or integration tests are needed
   c. Create missing tests (Vitest unit tests and/or Postman collections via MCP)
   d. Run tests to ensure they pass
   e. This step is NOT optional - always evaluate testing needs

4. **Working preferences**:
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
