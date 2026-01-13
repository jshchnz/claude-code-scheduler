---
description: Create a new scheduled task for recurring Claude Code execution (project)
allowed-tools: Read, Write, Bash(cat:*), Bash(launchctl:*), Bash(crontab:*), Bash(schtasks:*)
---

# Add Scheduled Task

Help the user create a new scheduled task with proper configuration.

## Process

1. **Gather Task Information**
   - Ask for a task name (required)
   - Ask for description (optional)
   - Ask for schedule - accept either:
     - Cron expression (e.g., "0 9 * * 1-5")
     - Natural language (e.g., "every weekday at 9am", "today at 3pm")

2. **Detect Schedule Type: One-Time vs Recurring**

   **One-time indicators** (default to one-time):
   - "today at 3pm"
   - "tomorrow at noon"
   - "next Tuesday at 2pm"
   - "at 5:30 PM" (no recurring keyword)
   - "January 15th at 9am"

   **Recurring indicators**:
   - "every day at 9am"
   - "daily at 6pm"
   - "weekly on Monday"
   - "weekdays at 10am"
   - "every 30 minutes"
   - Explicit cron expression (e.g., "0 9 * * 1-5")

   **Rule:** Unless "every", "daily", "weekly", "monthly", or similar recurring keywords are present, assume **one-time**.

3. **Configure Execution**
   - Ask for the Claude command or prompt to execute
   - Confirm working directory (default: current project)
   - Ask if task needs autonomous execution (file edits, git operations, running commands)
     - If yes: set `skipPermissions: true` and add `--dangerously-skip-permissions` flag
     - If no (read-only analysis): omit the flag

4. **Validate and Confirm**
   - For recurring: show cron expression and next 3 run times
   - For one-time: show exact date/time
   - Confirm with user before creating

5. **Create Task**
   - Generate unique task ID
   - For one-time: prefix ID with `once.`
   - Register with native scheduler

## macOS launchd Implementation

### Recurring Task Plist
Filename: `com.claude.schedule.<id>.plist`

**IMPORTANT:**
- Do NOT use `<key>WorkingDirectory</key>` - it causes permission errors in background processes
- Do NOT use `~` in paths - launchd doesn't expand tilde. Use `$HOME` instead
- Use `cd` inside the bash command for working directory

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.claude.schedule.<id></string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>cd "/path/to/project" &amp;&amp; claude -p "your prompt" --dangerously-skip-permissions</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:$HOME/.local/bin</string>
    </dict>
    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key><integer>10</integer>
        <key>Minute</key><integer>0</integer>
    </dict>
    <key>StandardOutPath</key>
    <string>$HOME/.claude/logs/<id>.log</string>
    <key>StandardErrorPath</key>
    <string>$HOME/.claude/logs/<id>.error.log</string>
    <key>RunAtLoad</key>
    <false/>
</dict>
</plist>
```

### One-Time Task Plist (Polling-Based, Self-Cleaning)
Filename: `com.claude.schedule.once.<id>.plist`

**IMPORTANT:**
- launchd's `StartCalendarInterval` with Month/Day creates a yearly recurring schedule, NOT one-time. Use polling instead
- Do NOT use `~` in paths - launchd doesn't expand tilde. Use `$HOME` instead
- Self-cleanup: delete plist with `rm` FIRST, then `launchctl bootout` (reverse order prevents race condition)

1. Calculate unix timestamp for target time: `date -j -f "%Y-%m-%d %H:%M" "2026-01-08 15:25" +%s`
2. Use `StartInterval: 60` to poll every minute
3. Use `RunAtLoad: true` to check immediately
4. Script compares timestamps, runs task, then self-cleans

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.claude.schedule.once.<id></string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>TARGET=<unix_timestamp>; NOW=$(date +%s); if [ $NOW -ge $TARGET ]; then cd "/path/to/project" &amp;&amp; claude -p "your prompt" --dangerously-skip-permissions >> "$HOME/.claude/logs/once.<id>.log" 2>&amp;1; rm "$HOME/Library/LaunchAgents/com.claude.schedule.once.<id>.plist" 2>/dev/null; launchctl bootout gui/$(id -u)/com.claude.schedule.once.<id> 2>/dev/null; fi</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:$HOME/.local/bin</string>
    </dict>
    <key>StartInterval</key>
    <integer>60</integer>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/claude-schedule-once.<id>.out</string>
    <key>StandardErrorPath</key>
    <string>/tmp/claude-schedule-once.<id>.err</string>
</dict>
</plist>
```

**How it works:**
- Polls every 60 seconds AND checks immediately on load
- Compares current unix timestamp to target
- If time has passed: runs task, deletes plist, then unloads from launchd
- If time hasn't passed yet: exits silently, will retry in 60 seconds
- StandardOut/Error go to /tmp for debugging; main output is redirected to ~/.claude/logs/

## Cron Quick Reference (for recurring tasks)

```
* * * * *
| | | | |
| | | | +-- Day of week (0-6, Sun=0)
| | | +---- Month (1-12)
| | +------ Day of month (1-31)
| +-------- Hour (0-23)
+---------- Minute (0-59)
```

**Common patterns:**
- `0 9 * * *` - Daily at 9:00 AM
- `0 9 * * 1-5` - Weekdays at 9:00 AM
- `*/15 * * * *` - Every 15 minutes
- `0 0 1 * *` - First day of month at midnight

## Example Interactions

### One-Time Task
```
User: schedule a code review for 3:25 PM today

Claude: I'll create a one-time scheduled task.

Task: Code Review
Type: One-time
Scheduled for: January 8, 2026 at 3:25 PM
Project: ~/Documents/GitHub/my-project

[Creates self-cleaning plist with full date]

Task "once.code-review-abc123" created.
It will run once at 3:25 PM today and automatically clean up after execution.
```

### Recurring Task
```
User: /schedule-add

Claude: Let's create a new scheduled task.

What would you like to name this task?
> Daily Code Review

When should it run?
> every weekday at 9am

I'll create a recurring task with these settings:
- Name: Daily Code Review
- Type: Recurring
- Schedule: 0 9 * * 1-5 (At 09:00 AM, Monday through Friday)
- Next runs: Mon Jan 6 9:00 AM, Tue Jan 7 9:00 AM, Wed Jan 8 9:00 AM

Task "daily-code-review" created and registered with launchd.
```

## After Creating

Tell the user:
1. The task ID for reference
2. The task type (one-time or recurring)
3. For one-time: "It will automatically clean up after execution"
4. For recurring: How to view/manage: `/schedule-list`, `/schedule-run <id>`
