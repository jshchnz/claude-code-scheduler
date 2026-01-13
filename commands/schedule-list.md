---
description: List all scheduled tasks with their status and next run times (project)
allowed-tools: Read, Bash(ls:*), Bash(cat:*), Bash(plutil:*), Bash(launchctl:*), Bash(crontab:*), Bash(schtasks:*)
---

# List Scheduled Tasks

Display ALL scheduled tasks across all projects by scanning the native scheduler.

## Process

1. **Discover ALL Registered Tasks from Native Scheduler**

   **macOS (launchd):**
   ```bash
   ls ~/Library/LaunchAgents/com.claude.schedule.*.plist 2>/dev/null
   ```
   For each plist found, extract task info:
   ```bash
   plutil -p ~/Library/LaunchAgents/com.claude.schedule.<id>.plist
   ```

   **Linux (crontab):**
   ```bash
   crontab -l | grep "# claude-scheduler:"
   ```

   **Windows:**
   ```powershell
   schtasks /Query /FO CSV | findstr "ClaudeScheduler"
   ```

2. **Parse Task Information**
   From each native scheduler entry, extract:
   - **ID**: From filename/label (e.g., `com.claude.schedule.loc-review-joshing` → `loc-review-joshing`)
   - **Type**: Detect from filename:
     - `com.claude.schedule.once.<id>.plist` → **one-time**
     - `com.claude.schedule.<id>.plist` → **recurring**
   - **Project**: From `WorkingDirectory` in plist
   - **Schedule**:
     - **Recurring**: From `StartCalendarInterval` → pattern like "Daily at X"
     - **One-time**: Extract `TARGET=<timestamp>` from ProgramArguments, convert with `date -r <timestamp>`
   - **Command**: From `ProgramArguments`

   **For one-time tasks**, extract target timestamp from bash command:
   ```bash
   # ProgramArguments contains: "TARGET=1736376240; NOW=..."
   # Extract and convert: date -r 1736376240 "+%b %d, %Y %I:%M %p"
   ```

3. **Enrich with Config Metadata (optional)**
   - If the task's `WorkingDirectory` has a `.claude/schedules.json`, read it for name/description
   - Fall back to ID as name if config not found

4. **Check Status**
   ```bash
   launchctl list | grep com.claude.schedule
   ```
   - Status `0` = enabled and healthy
   - Status `-` = loaded but never run

5. **Display Table**
   Format output as a table with columns:
   - ID (unique task identifier for use with other commands)
   - Type (one-time / recurring)
   - Project (working directory path, shortened with ~)
   - Schedule (human-readable: exact date for one-time, pattern for recurring)
   - Status (enabled/pending for one-time, enabled/disabled for recurring)

## Output Format

```
# Scheduled Tasks

| ID                      | Type      | Project                    | Schedule              | Status  |
|-------------------------|-----------|----------------------------|-----------------------|---------|
| once.loc-review-sched   | one-time  | ~/Documents/GitHub/sched   | Jan 8, 2026 3:25 PM   | pending |
| loc-review-joshing      | recurring | ~/Documents/GitHub/joshing | Daily at 10:00 AM     | enabled |
| daily-code-review       | recurring | ~/Documents/GitHub/myapp   | Weekdays at 9:00 AM   | enabled |

**Total:** 3 tasks (1 one-time pending, 2 recurring)
**Platform:** macOS (launchd)

**Commands:** `/schedule-run <id>` | `/schedule-remove <id>` | `/schedule-logs <id>`
```

## Converting Schedule to Human-Readable

### Recurring Tasks (StartCalendarInterval):
```xml
<key>StartCalendarInterval</key>
<dict>
    <key>Hour</key><integer>10</integer>
    <key>Minute</key><integer>0</integer>
</dict>
```
→ "Daily at 10:00 AM"

With Weekday:
```xml
<key>Weekday</key><integer>1</integer>
```
→ "Mondays at 10:00 AM"

### One-Time Tasks (StartInterval + timestamp):
One-time tasks use polling with embedded timestamp:
```bash
# ProgramArguments contains: "TARGET=1736376240; NOW=$(date +%s); if..."
```
Extract timestamp and convert:
```bash
date -r 1736376240 "+%b %d, %Y %I:%M %p"
```
→ "Jan 8, 2026 3:25 PM"

## Additional Details

If the user asks for details about a specific task, read the plist and show:
- Task ID
- Full schedule configuration
- Command to execute
- Working directory
- Log file paths
- launchctl status

## Empty State

If no plist files found:
```
No scheduled tasks found.

To create your first scheduled task, run:
  /schedule-add
```

## Commands Reference

After listing, remind the user of available commands:
- `/schedule-add` - Create a new task
- `/schedule-remove <id>` - Remove a task
- `/schedule-run <id>` - Run a task manually
- `/schedule-logs <id>` - View task logs
- `/schedule-status` - Check scheduler health
