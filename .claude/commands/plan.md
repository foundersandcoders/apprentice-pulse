Create a new plan from a Jira task: fetch details, transition to In Progress, create branch, and write plan.

## Arguments

- `$ARGUMENTS` - The Jira ticket ID (e.g., `AP-23`)

## Instructions

1. **Fetch the Jira task**:
   - Use `mcp__atlassian__getJiraIssue` with ticket ID: `$ARGUMENTS`
   - If it fails or times out, tell the user: "Jira connection failed. Please run `/mcp`, select `atlassian`, and choose `4. Reconnect`, then run `/plan $ARGUMENTS` again."
   - Extract: summary, description, issue type

2. **Check implementation status**:
   - Analyze the codebase to determine if this feature/fix has already been implemented
   - Search for relevant files, functions, components that relate to the ticket
   - If fully implemented: comment on Jira and suggest moving to "Done"
   - If partially implemented: note what's done and focus plan on remaining work
   - If not implemented: proceed with full planning

3. **Transition to In Progress**:
   - Use `mcp__atlassian__getTransitionsForJiraIssue` to get available transitions
   - Use `mcp__atlassian__transitionJiraIssue` to move to "In Progress" (skip if already in progress)

4. **Create the feature branch**:
   - Generate branch name: `feature/{ticket-id-lowercase}-{slugified-summary}`
   - Example: `AP-23 Add Bulk Event Creation` → `feature/ap-23-add-bulk-event-creation`
   - Run: `git checkout main && git pull && git checkout -b {branch-name}`

5. **Write the plan**:
   - Create/overwrite `docs/plan.md`
   - Break down the Jira task into numbered, actionable checkbox tasks
   - Structure as main tasks with subtasks for better control
   - Each task should be one focused change

6. **Activate the loop**:
   - Create the marker file: `touch .claude/loop`
   - This tells the plan-iterator hook to auto-continue through tasks

## Plan Format

```markdown
# {TICKET-ID} {Summary}

> {Description from Jira - keep it brief}

## Tasks

1. [ ] **Setup and Infrastructure**
   - [ ] 1.1 First preparatory step
   - [ ] 1.2 Second preparatory step

2. [ ] **Core Implementation**
   - [ ] 2.1 Main feature component
   - [ ] 2.2 Supporting functionality
   - [ ] 2.3 Integration points

3. [ ] **Testing and Validation**
   - [ ] 3.1 Add unit tests for X
   - [ ] 3.2 Add integration tests for Y
   - [ ] 3.3 Handle edge case Z

## Notes

{Any relevant context from Jira comments or acceptance criteria}
```

## Rules

- **Checkbox format**: Must use `- [ ]` exactly (the plan-iterator hook reads this)
- **Numbered structure**: Use numbered main tasks (1, 2, 3) with numbered subtasks (1.1, 1.2, etc)
- **Small tasks**: Each task = one focused change, completable in one session
- **Logical order**: Order by dependency
- **Include tests**: Add test tasks where appropriate
- **No time estimates**: Never add time estimates

## Example

Input: `/plan AP-42`

Jira task: "Add user avatar upload" with description about allowing profile pictures.

Output `docs/plan.md`:

```markdown
# AP-42 Add user avatar upload

> Allow users to upload and display profile avatars. Accept jpg/png/webp up to 2MB.

## Tasks

1. [ ] **Database and API Setup**
   - [ ] 1.1 Add avatar field to user schema
   - [ ] 1.2 Create file upload API endpoint
   - [ ] 1.3 Add image validation (size, format)

2. [ ] **Storage and Display**
   - [ ] 2.1 Store avatars in cloud storage
   - [ ] 2.2 Display avatar in profile page
   - [ ] 2.3 Add fallback for users without avatar

3. [ ] **Testing and Validation**
   - [ ] 3.1 Write tests for upload endpoint
   - [ ] 3.2 Test image validation edge cases

## Notes

- Acceptance: users can upload from settings page
- Use existing S3 bucket for storage
```
