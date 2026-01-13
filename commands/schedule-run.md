---
description: Manually run a scheduled task immediately
allowed-tools: Read, Write, Bash
---

# Run Scheduled Task

Execute a scheduled task immediately, bypassing its schedule trigger.

## Usage

```
/schedule run <task-id-or-name>
```

## Process

1. **Find Task**
   - Search by ID or name
   - Load task configuration

2. **Confirm Execution**
   - Show task details
   - Ask for confirmation (optional, can skip with --yes flag)

3. **Execute Task**
   - Run the configured command
   - Stream output to user
   - Record execution in history

4. **Report Results**
   - Show execution status (success/failure)
   - Show duration
   - Show any output or errors

## Example Interaction

```
User: /schedule run daily-review

Claude: Running task: Daily Code Review

Command: /review-code --scope=yesterday
Working directory: /Users/home/projects/myapp

[Executing...]

--- Task Output ---
Reviewing commits from yesterday...
Found 3 commits to review.

Commit abc123: Add user authentication
- Good: Proper input validation
- Suggestion: Consider rate limiting

...

--- End Output ---

Task completed successfully in 45 seconds.
```

## Options

Via `$ARGUMENTS`:
- Task ID or name (required)

## Error Handling

**Task not found:**
```
Task "xyz" not found.

Run /schedule list to see available tasks.
```

**Task disabled:**
```
Task "weekly-audit" is currently disabled.

Would you like to run it anyway? (y/n)
> y
```

**Execution failure:**
```
Task failed with exit code 1.

Error output:
  Error: Could not connect to repository

Check the full log at: ~/.claude/logs/a1b2c3d4.log
```

## Execution Recording

After running, update the task's execution history:
- Record start/end time
- Record status (success/failure/timeout)
- Record triggered by "manual"
- Truncate and store output

This history is visible in `/schedule logs`.
