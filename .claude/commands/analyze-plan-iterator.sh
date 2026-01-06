#!/bin/bash

# Plan Iterator Analysis
# Improved version addressing the grep pattern and efficiency issues

PLAN_FILE="docs/plan.md"

echo "=== CURRENT ISSUES ANALYSIS ==="

echo "1. Testing current grep pattern:"
echo "Pattern: '^\s*\([0-9]\+\.\s*\)\?\s*- \[ \]'"

echo "Should match subtasks like:"
echo "   - [ ] 1.1 Something"
grep -n '^\s*\([0-9]\+\.\s*\)\?\s*- \[ \]' "$PLAN_FILE" | head -3

echo ""
echo "Should NOT match main tasks like:"
echo "1. [ ] Main task"
grep -n '^[0-9]\+\. \[ \]' "$PLAN_FILE" | head -3

echo ""
echo "2. Current counting approach:"
SUBTASKS_ONLY=$(grep -c '^\s*\([0-9]\+\.\s*\)\?\s*- \[ \]' "$PLAN_FILE" 2>/dev/null || echo "0")
MAIN_TASKS_ONLY=$(grep -c '^[0-9]\+\. \[ \]' "$PLAN_FILE" 2>/dev/null || echo "0")
echo "Subtasks remaining: $SUBTASKS_ONLY"
echo "Main tasks remaining: $MAIN_TASKS_ONLY"
echo "Total remaining (should be): $((SUBTASKS_ONLY + MAIN_TASKS_ONLY))"

echo ""
echo "=== PROPOSED SOLUTION ==="

echo "Fixed pattern to match BOTH:"
echo "Main tasks: '^[0-9]\+\. \[ \]'"
echo "Subtasks: '^\s\+- \[ \] [0-9]\+\.'"

echo ""
echo "Efficient single-pass approach:"
cat << 'EOF'
# Read file once, process in memory
declare -A main_task_status
declare -A main_task_subtasks

while IFS= read -r line; do
    # Main task
    if [[ $line =~ ^([0-9]+)\.[[:space:]]*\[[[:space:]]*\][[:space:]]*(.*)$ ]]; then
        num="${BASH_REMATCH[1]}"
        main_task_status[$num]="incomplete"

    # Completed main task
    elif [[ $line =~ ^([0-9]+)\.[[:space:]]*\[x\][[:space:]]*(.*)$ ]]; then
        num="${BASH_REMATCH[1]}"
        main_task_status[$num]="complete"

    # Subtask
    elif [[ $line =~ ^[[:space:]]+-[[:space:]]*\[([[:space:]x])\][[:space:]]*([0-9]+)\.(.*)$ ]]; then
        status="${BASH_REMATCH[1]}"
        num="${BASH_REMATCH[2]}"
        if [[ -z "${main_task_subtasks[$num]}" ]]; then
            main_task_subtasks[$num]="0:0" # incomplete:complete
        fi
        if [[ "$status" == "x" ]]; then
            # Increment complete count
            IFS=':' read -r inc comp <<< "${main_task_subtasks[$num]}"
            main_task_subtasks[$num]="$inc:$((comp + 1))"
        else
            # Increment incomplete count
            IFS=':' read -r inc comp <<< "${main_task_subtasks[$num]}"
            main_task_subtasks[$num]="$((inc + 1)):$comp"
        fi
    fi
done < "$PLAN_FILE"

# Now check which main tasks should auto-complete
for main_num in "${!main_task_subtasks[@]}"; do
    IFS=':' read -r incomplete complete <<< "${main_task_subtasks[$main_num]}"
    if [[ $incomplete -eq 0 && $complete -gt 0 ]]; then
        echo "Should mark main task $main_num as complete"
    fi
done
EOF