# Worktree Tests

Test scripts for validating git worktree functionality.

## Tests

### `test-local.sh`
Basic test - generates worktree script and creates a test repo.
```bash
./test-worktrees/test-local.sh
```

### `test-full.sh`
Full worktree flow without remote (create worktree, make changes, commit, cleanup).
```bash
./test-worktrees/test-full.sh
```

### `test-with-remote.sh`
Full flow WITH push to GitHub remote.
```bash
./test-worktrees/test-with-remote.sh
```

### `test-scheduled.sh`
Test actual launchd scheduling (macOS). Schedules task to run in 1 minute.
```bash
./test-worktrees/test-scheduled.sh
# Then watch: tail -f ~/.claude/logs/scheduled-test-*.out.log
```

## TypeScript Tests

```bash
npx tsx test-worktrees/test-vcs.ts
npx tsx test-worktrees/test-script-gen.ts
```

## Cleanup

After testing:
```bash
# Remove test repos
rm -rf /tmp/test-worktree-* /tmp/test-push-* /tmp/test-scheduled-*
rm -rf /tmp/.test-*-worktrees

# Remove scheduled tasks
launchctl unload ~/Library/LaunchAgents/com.claude.scheduler.scheduled-test-*.plist
rm ~/Library/LaunchAgents/com.claude.scheduler.scheduled-test-*.plist
rm ~/.claude/logs/scheduled-test-*
```
