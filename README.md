# claude-code-scheduler

<p align="center">
  <img src="claude-code-scheduler-icon.png" alt="A robot sitting at a desk with a calendar, checklist, alarm clock, and laptop - representing automated task scheduling" width="280">
</p>

**Put Claude on autopilot.** Schedule code reviews, security audits, and anything else - Claude Code runs them automatically, even while you sleep.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Install

```
/plugin marketplace add jshchnz/claude-code-scheduler
/plugin install scheduler@claude-code-scheduler
```

> Requires Claude Code v1.0.33+ · Works on macOS, Linux, Windows

## See It In Action

```
Schedule a code review every weekday at 9am to check for bugs,
security issues, and missing tests
```

That's it. Claude creates the task, runs automatically at 9am, logs the results, and waits for you when you arrive.

## What Can You Schedule?

### One-Time Tasks

Schedule something once—it runs and cleans itself up:

- "today at 3pm remind me to deploy"
- "tomorrow morning run the test suite"
- "next Tuesday at 2pm review the API changes"
- "January 15th check the quarterly metrics"

### Recurring Tasks

Automate your workflow—runs reliably even when Claude Code isn't open:

- "every weekday at 9am review yesterday's code"
- "every Monday at 10am check for security vulnerabilities"
- "daily at 6pm summarize what I accomplished"
- "every 4 hours check API health"

### Autonomous Tasks

For tasks that need to make changes (edit files, run commands, make commits), Claude will ask:

```
You: Every Friday at 5pm, clean up unused imports and commit the changes

Claude: Does this task need to run autonomously (edit files, run commands)?
        → Yes, run fully autonomous
        → No, read-only analysis only

You: Yes

Claude: ✓ Task created with autonomous execution enabled
```

This adds `--dangerously-skip-permissions` to the scheduled command, allowing Claude to run without permission prompts.

### Git Worktree Mode (Isolated Branches)

For tasks that make changes, you can run them in isolated git worktrees. Changes are committed to a new branch and pushed for review—your main branch stays clean.

```
You: Every night at 2am, refactor deprecated API calls and push for review

Claude: Should this run in an isolated git worktree?
        → Yes, create branch and push changes
        → No, run in main working directory

You: Yes

Claude: ✓ Task created with worktree isolation
        Branch prefix: claude-task/
        Remote: origin
```

**How it works:**
1. Task triggers → creates fresh worktree with new branch
2. Claude runs in the worktree (isolated from main)
3. Changes are committed and pushed to remote
4. Worktree is cleaned up after successful push
5. You review the PR at your convenience

**What happens:**
- `branchPrefix: "claude-task/"` → branches named like `claude-task/task-abc123-1234567890`
- `remoteName: "origin"` → pushes to your default remote

If push fails (no remote, auth issues), the worktree is kept at `~/.worktrees/` for manual review.

## Features

- **Natural language** — "every weekday at 9am" just works
- **One-time & recurring** — reminders or automated workflows
- **Autonomous mode** — tasks can edit files, run commands, make commits
- **Git worktree isolation** — run tasks in isolated branches, auto-push for review
- **Cross-platform** — macOS (launchd), Linux (crontab), Windows (Task Scheduler)
- **Native schedulers** — reliable, survives restarts
- **Auto-cleanup** — one-time tasks delete themselves after running

## Commands

These slash commands are available for direct access, but you can also just ask Claude naturally.

| Command | Description |
|---------|-------------|
| `/scheduler:schedule-add` | Create a new scheduled task |
| `/scheduler:schedule-list` | View all scheduled tasks |
| `/scheduler:schedule-remove <id>` | Remove a scheduled task |
| `/scheduler:schedule-status` | Check scheduler health |
| `/scheduler:schedule-run <id>` | Run a task immediately |
| `/scheduler:schedule-logs [id]` | View execution history |

## Examples

Just tell Claude what you want:

### Daily Code Review
```
Schedule a code review every weekday at 9am. Review commits from the last 24 hours, check for bugs, security issues, error handling gaps, and code that needs comments. Summarize with file:line references.
```

### Security Vulnerability Scan
```
Every Monday at 10am, do a security audit: check for outdated dependencies with known CVEs, scan for hardcoded secrets or API keys, and flag unsafe patterns.
```

### Tech Debt Tracker
```
Every Friday at 2pm find all TODO, FIXME, HACK, and XXX comments. List by file with line numbers and identify the 3 highest priority items.
```

### Dependency Health Check
```
Every Thursday at 10am check for outdated dependencies. List packages with available updates, flag breaking changes, and recommend safe updates.
```

### Dead Code Finder
```
Every Wednesday at 3pm find dead code: unused functions, unreachable branches, commented-out code, and unused imports. List by file with line numbers.
```

---

## Viewing Execution History

See what your scheduled tasks have done:

```
/scheduler:schedule-logs
```

```
| Time              | Task              | Status | Duration |
|-------------------|-------------------|--------|----------|
| Jan 5 9:00 AM     | Daily Code Review | OK     | 45s      |
| Jan 5 6:00 PM     | Backup Reminder   | OK     | 12s      |
| Jan 4 9:00 AM     | Daily Code Review | OK     | 38s      |
```

Select any row to see the full output from that execution. You can also view a specific task directly:

```
/scheduler:schedule-logs daily-review --full
```

Logs are stored at `~/.claude/logs/<task-id>.log`.

## Configuration

Tasks are stored in JSON files:
- **Project-level:** `.claude/schedules.json`
- **Global:** `~/.claude/schedules.json`

Example task structure:

```json
{
  "id": "daily-review",
  "name": "Daily Code Review",
  "enabled": true,
  "trigger": {
    "type": "cron",
    "expression": "0 9 * * 1-5",
    "timezone": "local"
  },
  "execution": {
    "command": "Review yesterday's commits",
    "workingDirectory": ".",
    "timeout": 300,
    "skipPermissions": true,
    "worktree": {
      "enabled": false,
      "branchPrefix": "claude-task/",
      "remoteName": "origin"
    }
  },
  "tags": ["code-quality", "daily"]
}
```

### Worktree Options

| Option | Default | Description |
|--------|---------|-------------|
| `enabled` | `false` | Run task in isolated git worktree |
| `branchPrefix` | `"claude-task/"` | Prefix for created branches |
| `remoteName` | `"origin"` | Git remote to push to |
| `basePath` | (auto) | Custom path for worktrees |

## How It Works

1. You ask Claude to schedule something
2. Claude asks if the task needs autonomous execution (file edits, commands, etc.)
3. Plugin registers it with your OS's native scheduler
4. At the scheduled time, runs `claude -p "your command"` (with `--dangerously-skip-permissions` for autonomous tasks)
5. Output is logged to `~/.claude/logs/<task-id>.log`
6. One-time tasks automatically delete themselves after running

## Troubleshooting

**Task not running?**

1. Check status: `/scheduler:schedule-status`
2. Verify it's enabled: `/scheduler:schedule-list`
3. Check logs: `/scheduler:schedule-logs <task-id>`

**Common issues:**

| Problem | Solution |
|---------|----------|
| Task never runs | Ensure `claude` CLI is in PATH |
| Directory not found | Use absolute paths |
| Permission denied | Check file permissions |

**Platform debugging:**

```bash
# macOS
launchctl list | grep com.claude.schedule

# Linux
crontab -l | grep claude

# Windows
schtasks /query /tn "ClaudeSchedule*"
```

## Contributing

Issues and PRs welcome! [Open an issue](https://github.com/jshchnz/claude-code-scheduler/issues)

## License

MIT
