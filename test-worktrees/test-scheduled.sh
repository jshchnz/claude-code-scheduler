#!/bin/bash
# Test actual scheduled execution via launchd (macOS)
# Schedules a task to run 1 minute from now
set -e

REMOTE_URL="git@github.com:ojowwalker77/test-remote-jj.git"

# Calculate 1 minute from now
MINUTE=$(date -v+1M +%M)
HOUR=$(date -v+1M +%H)

echo "=== Setting up test repo ==="
TEST_REPO="/tmp/test-scheduled-$$"
mkdir -p "$TEST_REPO"
cd "$TEST_REPO"
git init
git config user.email "claude-dreamer@noreply.github.com"
git config user.name "Claude Dreamer"
echo "initial $(date)" > file.txt
git add .
git commit -m "Initial commit"
git remote add origin "$REMOTE_URL"
git branch -M main
git push -u origin main --force

echo ""
echo "Test repo ready: $TEST_REPO"
echo ""

# Create the worktree execution script
TASK_ID="scheduled-test-$$"
SCRIPT_PATH="$HOME/.claude/logs/$TASK_ID.worktree.sh"
mkdir -p "$HOME/.claude/logs"

cat > "$SCRIPT_PATH" << SCRIPT
#!/bin/bash
set -e

MAIN_REPO="$TEST_REPO"
TASK_ID="$TASK_ID"
TASK_NAME="Scheduled Dreamer Test"
TIMESTAMP=\$(date +%s)
WORKTREE_NAME="task-\${TASK_ID:0:8}-\$TIMESTAMP"
BRANCH_PREFIX="claude-dreamer/"
REMOTE="origin"

cd "\$MAIN_REPO"

echo "=== Claude Dreamer Starting ==="
echo "Time: \$(date)"
echo "Repo: \$MAIN_REPO"

# Create worktree
WORKTREE_BASE="\$(dirname "\$MAIN_REPO")/.\$(basename "\$MAIN_REPO")-worktrees"
WORKTREE_PATH="\$WORKTREE_BASE/\$WORKTREE_NAME"
BRANCH_NAME="\${BRANCH_PREFIX}\${WORKTREE_NAME}"

mkdir -p "\$WORKTREE_BASE"
git worktree add "\$WORKTREE_PATH" -b "\$BRANCH_NAME"

cd "\$WORKTREE_PATH"
git config user.email "claude-dreamer@noreply.github.com"
git config user.name "Claude Dreamer"

echo "Worktree created: \$WORKTREE_PATH"

# Simulate Claude making changes
echo "Dreamer was here at \$(date)" >> file.txt
echo "This change was made by Claude Dreamer automated task" > dreamer-output.txt

# Commit and push
git add -A
git commit -m "Claude Dreamer: Scheduled task [\$TASK_ID]"
git push -u "\$REMOTE" "\$BRANCH_NAME"

echo "Pushed to \$REMOTE/\$BRANCH_NAME"

# Cleanup
cd "\$MAIN_REPO"
git worktree remove "\$WORKTREE_PATH" --force

echo "=== Claude Dreamer Complete ==="
SCRIPT

chmod +x "$SCRIPT_PATH"
echo "Script created: $SCRIPT_PATH"

# Create launchd plist
PLIST_PATH="$HOME/Library/LaunchAgents/com.claude.scheduler.$TASK_ID.plist"

cat > "$PLIST_PATH" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.claude.scheduler.$TASK_ID</string>

    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>$SCRIPT_PATH</string>
    </array>

    <key>StartCalendarInterval</key>
    <dict>
        <key>Hour</key>
        <integer>$HOUR</integer>
        <key>Minute</key>
        <integer>$MINUTE</integer>
    </dict>

    <key>StandardOutPath</key>
    <string>$HOME/.claude/logs/$TASK_ID.out.log</string>

    <key>StandardErrorPath</key>
    <string>$HOME/.claude/logs/$TASK_ID.err.log</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:$HOME/.local/bin</string>
    </dict>
</dict>
</plist>
PLIST

echo "Plist created: $PLIST_PATH"
echo ""

# Load the agent
launchctl unload "$PLIST_PATH" 2>/dev/null || true
launchctl load "$PLIST_PATH"

echo "=== SCHEDULED ==="
echo "Task will run at: $HOUR:$MINUTE (in ~1 minute)"
echo ""
echo "Monitor with:"
echo "  tail -f ~/.claude/logs/$TASK_ID.out.log"
echo ""
echo "Check GitHub after: https://github.com/ojowwalker77/test-remote-jj/branches"
echo ""
echo "Cleanup after test:"
echo "  launchctl unload $PLIST_PATH"
echo "  rm $PLIST_PATH $SCRIPT_PATH"
echo "  rm -rf $TEST_REPO"
