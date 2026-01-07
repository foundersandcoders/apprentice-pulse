# Claude Code Workflow

Custom automation for working with Jira tasks.

## Quick Reference

| Command | Description |
|---------|-------------|
| `/plan AP-23` | Start a Jira task (fetch → branch → plan → activate loop) |
| `/stop` | Stop the iterator loop early |
| `/update-report` | Document meaningful changes to `docs/report.md` |
| `/evaluate-report` | Decide if the last task needs a report.md update |
| `/evaluate-tests` | Decide what tests are required for the last task |

## Complete Workflow

### 1. Create the Plan

```
/plan AP-23
```

This will:
- Fetch AP-23 from Jira (if connection fails, you'll be asked to run `/mcp` → `atlassian` → `4. Reconnect`)
- Move it to "In Progress"
- Create branch: `feature/ap-23-{slugified-summary}`
- Write `docs/plan.md` with checkbox tasks
- Create `.claude/loop` (activates the iterator)

**Claude stops here.** Review the plan if you want.

### 2. Start Implementation

Say `start` (or any prompt to begin working). This triggers the first task.

### 3. Automatic Loop

The hook (`.claude/hooks/plan-iterator.sh`) runs after each Claude response:

```
docs/plan.md
1. [x] Setup
   - [x] 1.1 Completed task 1
   - [x] 1.2 Completed task 2
2. [ ] Current task     ◄── Claude works on this
   - [ ] 2.1 Next task
   - [ ] 2.2 Final task
```

For each task, Claude:
1. Implements the task
2. Marks it `[x]` in `plan.md`
3. Auto-stages & commits changes
4. Evaluates if `/update-report` is needed
5. Hook triggers → continues to next task

### 4. Loop Ends

**Automatic:** When all tasks are `[x]`, `.claude/loop` is deleted and loop stops. Claude does NOT auto-start the next Jira ticket.

**Manual:** Run `/stop` or `rm .claude/loop`

### 5. Finish (manual steps)

When the loop ends, you decide what to do next:
- Create PR
- Move Jira to "Done"
- When ready for next ticket: `/plan AP-24`

## Files

| File | Purpose |
|------|---------|
| `.claude/loop` | Marker that activates the iterator (created by `/plan`, deleted when done) |
| `.claude/hooks/plan-iterator.sh` | Hook that auto-continues through tasks |
| `.claude/commands/plan.md` | `/plan` command definition |
| `.claude/commands/stop.md` | `/stop` command definition |
| `.claude/commands/update-report.md` | `/update-report` command definition |
| `.claude/commands/evaluate-report.sh` | `/evaluate-report` command definition |
| `.claude/commands/evaluate-tests.sh` | `/evaluate-tests` command definition |
| `docs/plan.md` | Current task checklist (created per-task) |
| `docs/report.md` | Project documentation |

## Manual Control

```bash
# Activate loop manually (if plan.md exists)
touch .claude/loop

# Deactivate loop
rm .claude/loop

# Check if loop is active
ls -la .claude/loop
```
