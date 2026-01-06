#!/bin/bash

# Evaluate Tests Command
# Analyzes recent work and determines what testing is needed
# Usage: /evaluate-tests [task-description]

TASK="${1:-recent work}"

# Get recent changes for context
BASE_REF="HEAD~1"
if ! git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  BASE_REF="HEAD"
fi

CHANGED_FILES=$(git diff --name-only "$BASE_REF" 2>/dev/null || true)
RECENT_FILES=$(printf '%s\n' "$CHANGED_FILES" | head -10 | tr '\n' ' ')
LAST_COMMIT=$(git log -1 --oneline 2>/dev/null || echo "No commits found")

# Check for indicators that suggest specific test types needed
INDICATORS=""
if printf '%s\n' "$CHANGED_FILES" | grep -qE 'src/routes/api.*\.ts$'; then
  INDICATORS="${INDICATORS}[New/modified API routes - Postman tests needed] "
fi
if printf '%s\n' "$CHANGED_FILES" | grep -qE 'src/lib/(server|airtable).*\.ts$'; then
  INDICATORS="${INDICATORS}[Service/business logic - Unit tests needed] "
fi
if printf '%s\n' "$CHANGED_FILES" | grep -qE '\.svelte$'; then
  INDICATORS="${INDICATORS}[Svelte components - Consider component tests] "
fi
if printf '%s\n' "$CHANGED_FILES" | grep -qE 'auth|session|security'; then
  INDICATORS="${INDICATORS}[Auth/security changes - Critical testing needed] "
fi
if git log -1 --oneline 2>/dev/null | grep -qiE '(fix|bug|error|issue)'; then
  INDICATORS="${INDICATORS}[Bug fix - Regression tests recommended] "
fi

# Count existing test files
if command -v rg >/dev/null 2>&1; then
  EXISTING_TESTS=$(rg --files -g '*.spec.ts' src 2>/dev/null | wc -l | tr -d ' ')
else
  EXISTING_TESTS=$(find src -name "*.spec.ts" 2>/dev/null | wc -l | tr -d ' ')
fi

cat << EOF
I need to evaluate what testing is needed for the recent work.

## Task Context
Task: $TASK
Last commit: $LAST_COMMIT
Base ref: $BASE_REF
Modified files: $RECENT_FILES
Test indicators: $INDICATORS
Existing test files: $EXISTING_TESTS

## Testing Framework

EOF

# Include the skill content directly for self-contained execution
if [[ -f ".claude/skills/test-evaluator.md" ]]; then
  echo "### Testing Evaluation Guidelines:"
  echo ""
  cat .claude/skills/test-evaluator.md
  echo ""
  echo "---"
  echo ""
fi

cat << EOF

## Evaluation Process

Following the guidelines above:

1. **Analyze Recent Changes**:
   - Run: git diff "$BASE_REF" --stat
   - Review modified files and understand what changed
   - Identify the type of changes (API, business logic, UI, bug fix)

2. **Determine Test Requirements**:

   **For API Routes** (/routes/api/*):
   - Create Postman collection if none exists for this module
   - Add requests for success/error scenarios
   - Include authentication testing
   - Test response validation

   **For Business Logic** (/lib/server/, /lib/airtable/):
   - Create co-located .spec.ts files
   - Test core functions with edge cases
   - Mock external dependencies (Airtable, APIs)
   - Verify error handling

   **For Components** (*.svelte):
   - Consider component tests if complex logic exists
   - Test reactive state management
   - Test event handling

3. **Check Existing Tests**:
   - Run: npm test
   - Ensure existing tests still pass
   - Update tests if functionality changed
   - Add missing test cases

4. **Create Missing Tests**:

   **Unit Tests**:
   - Create src/path/to/file.spec.ts next to source
   - Follow Vitest patterns with describe/it/expect
   - Test normal cases, edge cases, error cases

   **API Tests** (Use MCP Postman integration):
   - Get existing collections: Use mcp__postman__getCollections
   - Create new collection if needed: Use mcp__postman__createCollection
   - Add test requests: Use mcp__postman__createCollectionRequest
   - Include proper test scripts for validation

5. **Run and Verify**:
   - Execute: npm test
   - Fix any failing tests
   - Ensure new tests pass
   - Verify coverage of critical paths

## Decision Matrix

✅ **CREATE TESTS** if:
- New API endpoints added
- Business logic/service functions created
- Authentication/security changes
- Bug fixes (regression prevention)
- Complex component logic

⏭️ **SKIP TESTS** if:
- Simple UI text changes
- Styling/CSS only
- Documentation updates
- Configuration without logic changes

## IMPORTANT
After evaluation, you must either:
1. **Create the identified tests** (unit tests and/or Postman collections)
2. **Explicitly state** why tests were not needed for this change

Testing evaluation is MANDATORY - never skip this step.

Please proceed with the evaluation now.
EOF
