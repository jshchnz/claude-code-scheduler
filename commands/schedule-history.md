---
description: View execution history for all scheduled tasks with interactive selection
allowed-tools: Read, Bash(cat:*), Bash(ls:*), Bash(stat:*)
---

# Execution History

View recent task executions across all projects. Interactive by default - select an execution to see the full log.

## Usage

```
/scheduler:schedule-history [options]
```

## Process

1. **Scan Log Files**

   List all log files in `~/.claude/logs/`:
   ```bash
   ls -la ~/.claude/logs/*.log 2>/dev/null
   ```

   For each `.log` file:
   - Get modification time (= last execution time)
   - Check for corresponding `.error.log` file
   - Determine status: error log with content = failure, otherwise success

2. **Get Task Metadata (optional)**

   For each task, try to read plist for project path:
   ```bash
   cat ~/Library/LaunchAgents/com.claude.schedule.<task-id>.plist 2>/dev/null
   ```
   Extract `WorkingDirectory` for project path.

3. **Display Interactive List**

   Show numbered list sorted by most recent first:
   ```
   EXECUTION HISTORY

   #   TIME              TASK ID                       PROJECT              STATUS
   ─────────────────────────────────────────────────────────────────────────────────
   1   5 min ago         once.file-listing-e3df455d    ~/Documents/GitHub   OK
   2   11 hours ago      loc-review-joshing            ~/Documents/GitHub   FAIL

   Select a number to view full log, or press Enter to exit:
   ```

4. **On Selection - Show Full Log**

   When user selects a number (e.g., "1"):
   ```bash
   cat ~/.claude/logs/once.file-listing-e3df455d.log
   ```

   If there's an error log:
   ```bash
   cat ~/.claude/logs/<task-id>.error.log
   ```

5. **Show Actions After Log**

   ```
   ─────────────────────────────────────────────────────────────────────────────────
   [E] View error log    [R] Re-run task    [B] Back to list    [Q] Quit
   ```

## Output Format

### List View

```
╭─────────────────────────────────────────────────────────────────────────────╮
│  EXECUTION HISTORY                                                          │
╰─────────────────────────────────────────────────────────────────────────────╯

  #   TIME              TASK ID                       PROJECT              STATUS
  ─────────────────────────────────────────────────────────────────────────────
  1   5 minutes ago     once.file-listing-e3df455d    ~/Documents/GitHub   ✓ OK
  2   11 hours ago      loc-review-joshing            ~/Documents/GitHub   ✗ FAIL

  ─────────────────────────────────────────────────────────────────────────────
  2 executions found │ 1 succeeded │ 1 failed

Select a number (1-2) to view full log:
```

### Detail View (after selection)

```
╭─────────────────────────────────────────────────────────────────────────────╮
│  #1 - once.file-listing-e3df455d                                     ✓ OK   │
╰─────────────────────────────────────────────────────────────────────────────╯

  Task ID:     once.file-listing-e3df455d
  Executed:    Jan 12, 2026 at 9:17 PM
  Project:     /Users/home/Documents/GitHub
  Log Size:    2.3 KB
  Status:      Success

  ─── Output Log ─────────────────────────────────────────────────────────────
  [full contents of ~/.claude/logs/once.file-listing-e3df455d.log]
  ─────────────────────────────────────────────────────────────────────────────

  [E] View error log    [R] Re-run task    [B] Back to list    [Q] Quit
```

### Failed Task Detail

```
╭─────────────────────────────────────────────────────────────────────────────╮
│  #2 - loc-review-joshing                                            ✗ FAIL  │
╰─────────────────────────────────────────────────────────────────────────────╯

  Task ID:     loc-review-joshing
  Executed:    Jan 12, 2026 at 10:19 AM
  Project:     /Users/home/Documents/GitHub/joshing
  Log Size:    0 bytes
  Error Size:  1 KB
  Status:      Failed

  ─── Error Log ──────────────────────────────────────────────────────────────
  [full contents of ~/.claude/logs/loc-review-joshing.error.log]
  ─────────────────────────────────────────────────────────────────────────────

  [L] View stdout log   [R] Re-run task    [B] Back to list    [Q] Quit
```

## Action Responses

**[E] View error log:**
Show contents of `~/.claude/logs/<task-id>.error.log`

**[L] View stdout log:**
Show contents of `~/.claude/logs/<task-id>.log`

**[R] Re-run task:**
If plist exists, offer to run `/schedule-run <task-id>`

**[B] Back to list:**
Return to the numbered list

**[Q] Quit:**
Exit history view

## Filter Options

| Option | Description |
|--------|-------------|
| `--failures` | Only show failed executions |
| `--limit N` | Show last N executions (default: 20) |

## Status Determination

- **✓ OK (success)**: Log file has content AND error log is empty or missing
- **✗ FAIL (failure)**: Error log has content containing "error", "failed", or "Exit code"
- **? (unknown)**: Empty log file with no error log

## Empty State

If no log files found:
```
No execution history found.

Log files are created when scheduled tasks run. To see executions:
1. Create a task: /schedule-add
2. Wait for it to run, or run manually: /schedule-run <id>
3. View history: /schedule-history
```

## File Locations

| File | Purpose |
|------|---------|
| `~/.claude/logs/<task-id>.log` | Stdout from task execution |
| `~/.claude/logs/<task-id>.error.log` | Stderr from task execution |
| `~/Library/LaunchAgents/com.claude.schedule.*.plist` | Task configuration (macOS) |
