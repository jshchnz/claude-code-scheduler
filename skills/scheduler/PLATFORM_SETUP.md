# Platform-Specific Setup Guide

Detailed information about how scheduled tasks work on each platform.

## macOS (launchd)

### How It Works

On macOS, scheduled tasks are managed by `launchd`, Apple's service management framework. Tasks are registered as LaunchAgents using plist (property list) files.

### File Locations

- **Plist files:** `~/Library/LaunchAgents/com.claude.scheduler.<task-id>.plist`
- **Log files:** `~/.claude/logs/<task-id>.out.log` and `<task-id>.err.log`

### Manual Commands

**List loaded agents:**
```bash
launchctl list | grep claude.scheduler
```

**Load an agent:**
```bash
launchctl load ~/Library/LaunchAgents/com.claude.scheduler.<task-id>.plist
```

**Unload an agent:**
```bash
launchctl unload ~/Library/LaunchAgents/com.claude.scheduler.<task-id>.plist
```

**Check agent status:**
```bash
launchctl list com.claude.scheduler.<task-id>
```

### Plist Structure

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "...">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.claude.scheduler.task-id</string>

    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>cd "/path/to/project" && claude -p "command"</string>
    </array>

    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>9</integer>
        <key>Minute</key>
        <integer>0</integer>
        <key>Weekday</key>
        <integer>1</integer>
    </dict>

    <key>StandardOutPath</key>
    <string>/Users/you/.claude/logs/task-id.out.log</string>

    <key>StandardErrorPath</key>
    <string>/Users/you/.claude/logs/task-id.err.log</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
    </dict>
</dict>
</plist>
```

### Troubleshooting

**Task not running:**
1. Check if agent is loaded: `launchctl list | grep claude`
2. Check for errors: `cat ~/.claude/logs/<task-id>.err.log`
3. Verify plist syntax: `plutil -lint ~/Library/LaunchAgents/com.claude.scheduler.*.plist`

**PATH issues:**
launchd runs with minimal environment. Ensure PATH includes:
- `/usr/local/bin` (Homebrew Intel)
- `/opt/homebrew/bin` (Homebrew Apple Silicon)
- Location of `claude` CLI

---

## Linux (crontab)

### How It Works

On Linux, tasks are registered in the user's crontab. Each task is a single line in the crontab with a marker comment for identification.

### File Locations

- **Crontab:** User's crontab (no direct file access)
- **Log files:** `~/.claude/logs/<task-id>.log`

### Manual Commands

**View crontab:**
```bash
crontab -l
```

**Edit crontab:**
```bash
crontab -e
```

**Remove all entries:**
```bash
crontab -r
```

### Entry Format

```
0 9 * * 1-5 cd "/path/to/project" && claude -p "/review-code" >> ~/.claude/logs/task-id.log 2>&1 # claude-scheduler:task-id
```

Components:
- `0 9 * * 1-5` - Cron schedule
- `cd "/path/to/project"` - Change to working directory
- `claude -p "/review-code"` - Command to execute
- `>> ~/.claude/logs/task-id.log 2>&1` - Log output
- `# claude-scheduler:task-id` - Marker for identification

### Troubleshooting

**Task not running:**
1. Check crontab: `crontab -l | grep claude-scheduler`
2. Check cron daemon: `systemctl status cron` or `service cron status`
3. Check system logs: `grep CRON /var/log/syslog`

**PATH issues:**
Cron runs with minimal PATH. Options:
- Use absolute paths: `/usr/local/bin/claude`
- Set PATH in crontab: Add `PATH=/usr/local/bin:/usr/bin:/bin` at top
- Use a wrapper script

**Permission issues:**
- Ensure execute permissions on any scripts
- Check file ownership matches crontab user

---

## Windows (Task Scheduler)

### How It Works

On Windows, tasks are registered with Task Scheduler using the `schtasks.exe` command-line tool. Tasks are organized in a `\ClaudeScheduler` folder.

### File Locations

- **Tasks:** Task Scheduler > Task Scheduler Library > ClaudeScheduler
- **Log files:** `%USERPROFILE%\.claude\logs\<task-id>.log`

### Manual Commands

**List tasks:**
```cmd
schtasks /Query /TN "\ClaudeScheduler" /FO LIST
```

**Create task:**
```cmd
schtasks /Create /TN "\ClaudeScheduler\task-id" /TR "cmd /c claude -p \"command\"" /SC DAILY /ST 09:00
```

**Delete task:**
```cmd
schtasks /Delete /TN "\ClaudeScheduler\task-id" /F
```

**Run task immediately:**
```cmd
schtasks /Run /TN "\ClaudeScheduler\task-id"
```

### Schedule Types

| schtasks /SC | Description |
|--------------|-------------|
| MINUTE | Every N minutes |
| HOURLY | Every N hours |
| DAILY | Every N days |
| WEEKLY | Every N weeks |
| MONTHLY | Every N months |
| ONCE | One time only |

### Troubleshooting

**Task not running:**
1. Open Task Scheduler GUI (taskschd.msc)
2. Navigate to ClaudeScheduler folder
3. Check task properties and history
4. Run as Administrator if needed

**Permission issues:**
- Some tasks require "Run with highest privileges"
- Check "Run whether user is logged on or not"

**PATH issues:**
- Use full path to claude.exe
- Or set PATH in the task's action

---

## Common Issues (All Platforms)

### Claude CLI Not Found

**Symptom:** Task fails with "claude: command not found"

**Fix:**
1. Find claude location: `which claude` (Unix) or `where claude` (Windows)
2. Ensure scheduler environment has correct PATH
3. Use absolute path in command

### Working Directory Issues

**Symptom:** Task fails to find files or uses wrong directory

**Fix:**
1. Always specify absolute paths for working directory
2. Use `cd` command before main command
3. Verify directory exists

### Timeout Issues

**Symptom:** Task killed before completion

**Fix:**
1. Increase timeout in task configuration
2. Check for infinite loops in command
3. Consider breaking into smaller tasks

### Log File Issues

**Symptom:** No output in log files

**Fix:**
1. Ensure log directory exists: `mkdir -p ~/.claude/logs`
2. Check write permissions
3. Verify output redirection syntax
