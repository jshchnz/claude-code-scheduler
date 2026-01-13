---
description: Check the health and status of the scheduler system
allowed-tools: Read, Bash(launchctl:*), Bash(crontab:*), Bash(schtasks:*), Bash(ps:*), Bash(which:*)
---

# Scheduler Status

Check the health of the scheduling system and native scheduler.

## Process

1. **Detect Platform**
   - Identify OS (macOS/Linux/Windows)
   - Identify native scheduler (launchd/cron/schtasks)

2. **Check Native Scheduler**
   - macOS: Verify launchd is running, check registered agents
   - Linux: Check crontab access, verify cron daemon
   - Windows: Check Task Scheduler service

3. **Verify Tasks**
   - Load all tasks from config
   - Check each is properly registered
   - Report any discrepancies

4. **Check Claude CLI**
   - Verify `claude` command is available
   - Check it's in PATH for scheduled execution

## Output Format

```
# Scheduler Status

## Platform
- **OS:** macOS 14.2 (darwin)
- **Scheduler:** launchd
- **Status:** Healthy

## Claude CLI
- **Path:** /usr/local/bin/claude
- **Available:** Yes

## Tasks
- **Total:** 5 tasks
- **Enabled:** 4
- **Disabled:** 1
- **Registered:** 4/4 enabled tasks registered with launchd

## Health Checks
 Claude CLI in PATH
 LaunchAgents directory exists
 All enabled tasks registered
 No orphaned scheduler entries

## Recent Activity
- Last execution: 2h ago (Daily Code Review - OK)
- Next execution: Mon Jan 6 9:00 AM (Daily Code Review)
```

## Health Check Details

**All Green:**
```
All systems healthy. Your scheduled tasks will run as expected.
```

**Issues Found:**
```
 Issues detected:

1. Task "weekly-audit" is enabled but not registered with launchd
   Fix: Run `/schedule remove weekly-audit` then `/schedule add` to recreate

2. Claude CLI not found in PATH for scheduled execution
   Fix: Ensure claude is installed globally: npm install -g @anthropic-ai/claude-code

Run `/schedule list` to see all tasks.
```

## Troubleshooting Tips

If issues are found, provide actionable fixes:

**macOS launchd issues:**
- Check `~/Library/LaunchAgents/` for plist files
- Run `launchctl list | grep claude` to see loaded agents
- Check logs at `~/.claude/logs/`

**Linux cron issues:**
- Run `crontab -l` to see entries
- Check `/var/log/syslog` for cron errors
- Verify cron daemon: `systemctl status cron`

**Windows Task Scheduler issues:**
- Open Task Scheduler GUI to verify tasks
- Check `\ClaudeScheduler` folder
- Run as Administrator if permission issues
