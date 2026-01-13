---
description: View execution logs for scheduled tasks
allowed-tools: Read, Bash(tail:*), Bash(head:*), Bash(cat:*), Bash(ls:*)
---

# View Execution Logs

Display execution history and logs for scheduled tasks.

## Usage

```
/schedule logs [task-id-or-name] [options]
```

## Process

1. **Determine Scope**
   - If task specified: show logs for that task
   - If no task: show recent logs across all tasks

2. **Load History**
   - Read execution records from task config
   - Read log files from `~/.claude/logs/`

3. **Format Output**
   - Show execution history table
   - Optionally show detailed output

## Output Formats

### All Tasks (default)

```
# Recent Executions

| Time              | Task              | Status | Duration | Trigger   |
|-------------------|-------------------|--------|----------|-----------|
| Jan 5 9:00 AM     | Daily Code Review | OK     | 45s      | scheduled |
| Jan 5 6:00 PM     | Backup Reminder   | OK     | 12s      | scheduled |
| Jan 4 9:00 AM     | Daily Code Review | OK     | 38s      | scheduled |
| Jan 4 10:00 AM    | Weekly Audit      | FAIL   | 120s     | manual    |

Showing last 10 executions. Use `/schedule logs --limit 50` for more.
```

### Specific Task

```
/schedule logs daily-review

# Execution History: Daily Code Review

**Task ID:** a1b2c3d4-...
**Schedule:** Weekdays at 9:00 AM
**Log file:** ~/.claude/logs/a1b2c3d4.log

## Recent Executions

| Time              | Status | Duration | Trigger   |
|-------------------|--------|----------|-----------|
| Jan 5 9:00 AM     | OK     | 45s      | scheduled |
| Jan 4 9:00 AM     | OK     | 38s      | scheduled |
| Jan 3 9:00 AM     | OK     | 42s      | scheduled |
| Jan 2 9:00 AM     | FAIL   | 5s       | scheduled |
| Jan 1 9:00 AM     | OK     | 40s      | manual    |

## Last Execution Output

[Jan 5 9:00 AM - Success]

Reviewing commits from yesterday...
Found 3 commits to review.
...
```

### Detailed Output

```
/schedule logs daily-review --full

[Shows complete output from last execution]
```

## Options

- `--limit N` - Show last N executions (default: 10)
- `--full` - Show complete output from last execution
- `--status <ok|fail>` - Filter by status
- `--since <date>` - Show executions since date

## Log File Location

Logs are stored at:
- `~/.claude/logs/<task-id>.log` - Combined stdout/stderr
- `~/.claude/logs/<task-id>.out.log` - stdout only (macOS)
- `~/.claude/logs/<task-id>.err.log` - stderr only (macOS)

## Maintenance

Suggest cleanup if logs are large:
```
Log file is 15MB. Run `/schedule logs --cleanup` to rotate old logs.
```

Log retention is configured in schedules.json settings (default: 30 days).
