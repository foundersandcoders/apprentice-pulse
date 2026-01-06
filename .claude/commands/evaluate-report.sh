#!/bin/bash

# Evaluate Report Command
# Analyzes recent work and determines if report.md needs updating
# Usage: /evaluate-report [task-description]

TASK="${1:-recent work}"

# Get recent changes for context
RECENT_FILES=$(git diff HEAD~1 --name-only 2>/dev/null | head -10 | tr '\n' ' ')
LAST_COMMIT=$(git log -1 --oneline 2>/dev/null)

# Check for indicators that suggest report update needed
INDICATORS=""
if git diff HEAD~1 --name-only 2>/dev/null | grep -qE '(routes|lib|server).*\.ts$'; then
  INDICATORS="${INDICATORS}[New/modified TypeScript files] "
fi
if git diff HEAD~1 --name-only 2>/dev/null | grep -q '\.spec\.ts$'; then
  INDICATORS="${INDICATORS}[Test files] "
fi
if git log -1 --oneline 2>/dev/null | grep -qiE '(refactor|optimize|performance|security|auth|error|pattern|architecture)'; then
  INDICATORS="${INDICATORS}[Significant keywords in commit] "
fi

cat << EOF
I need to evaluate if the recent work should be documented in report.md.

## Task Context
Task: $TASK
Last commit: $LAST_COMMIT
Modified files: $RECENT_FILES
Auto-detected indicators: $INDICATORS

## Evaluation Framework

EOF

# Include the skill content directly for self-contained execution
if [[ -f ".claude/skills/report-evaluator.md" ]]; then
  echo "### Report Evaluation Guidelines:"
  echo ""
  cat .claude/skills/report-evaluator.md
  echo ""
  echo "---"
  echo ""
fi

cat << EOF

## Evaluation Process

Following the guidelines above:

1. **Analyze Recent Changes**:
   - Run: git diff HEAD~1 --stat
   - Run: git log -3 --oneline
   - Review the actual code changes in modified files

2. **Identify Significant Technical Decisions**:
   - Architecture patterns or design choices
   - Performance optimizations
   - Error handling strategies
   - State management approaches
   - API design decisions
   - Testing strategies
   - Security implementations

3. **Map to Assessment Criteria** (docs/Assessment-criteria.md):
   - Check if changes provide evidence for P1-P11 or D1-D4
   - Don't force connections - only map if naturally applicable

4. **Make Update Decision**:
   ✅ UPDATE if:
   - Significant technical decisions were made
   - New patterns or approaches introduced
   - Performance/security improvements
   - Complex problem solved
   - Assessment criteria evidence exists

   ⏭️ SKIP if:
   - Routine bug fixes
   - Simple UI text changes
   - Code formatting only
   - Dependency updates
   - No architectural impact

5. **If Updating report.md**:
   - Add section with clear heading
   - Explain the "why" behind decisions
   - Include code examples if helpful
   - Reference assessment criteria where natural
   - Keep it concise but complete

## IMPORTANT
This evaluation is MANDATORY after each task. Even if no update is needed, you must explicitly state that you evaluated and determined no update was necessary.

Please proceed with the evaluation now.
EOF