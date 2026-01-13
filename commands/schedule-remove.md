---
description: Remove a scheduled task by ID or name
allowed-tools: Read, Write, Bash(launchctl:*), Bash(crontab:*), Bash(schtasks:*)
---

# Remove Scheduled Task

Remove a task from the schedule configuration and unregister from the native scheduler.

## Usage

```
/schedule remove <task-id-or-name>
```

## Process

1. **Find Task**
   - Search by exact ID match first
   - Then search by name (case-insensitive)
   - Check both project and global configs

2. **Confirm Removal**
   - Show task details before removing
   - Ask for confirmation: "Remove task 'Daily Code Review'? (y/n)"

3. **Remove Task**
   - Unregister from native scheduler (launchd/cron/schtasks)
   - Remove from schedules.json
   - Optionally delete log files

4. **Confirm Success**
   - Show confirmation message
   - Remind about `/schedule list` to verify

## Example Interaction

```
User: /schedule remove daily-review

Claude: Found task:
- Name: Daily Code Review
- ID: a1b2c3d4-...
- Schedule: Weekdays at 9:00 AM
- Scope: project

Are you sure you want to remove this task? (y/n)
> y

Task "Daily Code Review" has been removed.
- Unregistered from launchd
- Removed from .claude/schedules.json

Run /schedule list to verify.
```

## Error Handling

**Task not found:**
```
Task "xyz" not found.

Available tasks:
- daily-review (Daily Code Review)
- weekly-audit (Weekly Dependency Audit)

Try: /schedule remove daily-review
```

**Multiple matches:**
```
Multiple tasks match "review":
1. daily-review - Daily Code Review (project)
2. pr-review - PR Review Reminder (global)

Please specify the exact task ID:
  /schedule remove daily-review
```

## Options

If the user passes arguments:
- `$ARGUMENTS` contains the task ID or name
- If no argument, show `/schedule list` first and ask which to remove

## Cleanup

Optionally ask if they want to delete associated log files:
```
Delete log files for this task? (y/n)
> n

Log files preserved at ~/.claude/logs/a1b2c3d4.log
```
