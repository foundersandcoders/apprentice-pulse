# Report Evaluator Skill

## Purpose
Automatically evaluate completed tasks and update report.md when significant technical decisions or assessment criteria evidence is present.

## Trigger Conditions
- After each task completion in plan-iterator
- When explicitly called via /evaluate-report
- After major feature implementations

## Evaluation Criteria

### Should Update Report When:
1. **Architecture Decisions Made**
   - New patterns introduced
   - Significant refactoring
   - Performance optimizations
   - State management changes
   - API design choices

2. **Technical Challenges Solved**
   - Complex problem solutions
   - Error handling strategies
   - Security implementations
   - Testing approaches

3. **Assessment Criteria Evidence**
   - P1: Problem analysis
   - P2: Design patterns
   - P3: Development approaches
   - P4: Testing strategies
   - P5: Refactoring
   - P6: Configuration management
   - P7: Version control
   - P8: Performance optimization
   - P9: Security considerations
   - P10: Accessibility
   - P11: User experience
   - D1-D4: Distinction criteria

### Should Skip Update When:
- Routine bug fixes without architectural impact
- Simple UI text changes
- Dependency updates without breaking changes
- Code formatting/linting fixes
- Documentation-only changes

## Update Format

### Section Structure
```markdown
# [Ticket-ID]: [Feature Name]

[Brief description of what was implemented]

## Architecture Decisions

### [Decision Name]
[Explanation of the decision, rationale, and trade-offs]

```typescript
// Code example if helpful
```

[How this addresses assessment criteria] [P#] [D#]

## Technical Implementation Details

### [Aspect Name]
[Details about specific implementation choices]
```

## Automation Strategy

### Git Diff Analysis
```bash
# Check recent changes
git diff HEAD~1 --name-only | grep -E '\.(ts|svelte|js)$'
```

### Keyword Detection
Look for indicators in code/commits:
- "refactor", "optimize", "performance"
- "pattern", "architecture", "design"
- "error handling", "validation"
- "security", "auth", "permission"
- New file patterns (*.spec.ts, new routes, new services)

### Assessment Mapping
Map common patterns to criteria:
- API routes → P1, P3
- Testing files → P4, P7
- Auth/permissions → P9
- UI components → P10, P11
- Performance work → P8
- Error handling → D4

## Integration Points

### Plan Iterator Hook
The plan-iterator.sh now mandates report evaluation after each task.

### Slash Command
`/evaluate-report [task]` - Manually trigger evaluation

### Auto-Detection Patterns
- New route creation → Likely needs documentation
- New service/utility → Likely has design decisions
- Test file creation → Document testing strategy
- Error handling added → Document approach

## Quality Checks

Before updating report.md:
1. Ensure technical accuracy
2. Include code examples where helpful
3. Map to assessment criteria naturally (don't force it)
4. Keep descriptions concise but complete
5. Focus on "why" not just "what"