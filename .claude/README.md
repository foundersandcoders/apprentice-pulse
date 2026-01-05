# Claude Code Workflow

Custom automation for working with Jira tasks.

## Quick Reference

| Command | Description |
|---------|-------------|
| `/plan AP-23` | Start a Jira task (fetch → branch → plan → activate loop) |
| `/stop` | Stop the iterator loop early |
| `/update-report` | Document meaningful changes to `docs/report.md` |

## Complete Workflow

### 1. Start a Task

```
/plan AP-23
```

This will:
- Fetch AP-23 from Jira
- Move it to "In Progress"
- Create branch: `feature/ap-23-{slugified-summary}`
- Write `docs/plan.md` with checkbox tasks
- Create `.claude/loop` (activates the iterator)

### 2. Automatic Loop

The hook (`.claude/hooks/plan-iterator.sh`) runs after each Claude response:

```
docs/plan.md
- [x] Completed task 1
- [x] Completed task 2
- [ ] Current task     ◄── Claude works on this
- [ ] Next task
- [ ] Final task
```

For each task, Claude:
1. Implements the task
2. Marks it `[x]` in `plan.md`
3. Auto-stages & commits changes
4. Evaluates if `/update-report` is needed
5. Hook triggers → continues to next task

### 3. Loop Ends

**Automatic:** When all tasks are `[x]`, `.claude/loop` is deleted and loop stops. Claude does NOT auto-start the next Jira ticket.

**Manual:** Run `/stop` or `rm .claude/loop`

### 4. Finish (manual steps)

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
