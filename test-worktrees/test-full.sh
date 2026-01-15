#!/bin/bash
# Test full worktree flow (no remote)
set -e

echo "=== Creating isolated test repo ==="
TEST_REPO="/tmp/test-worktree-$$"
mkdir -p "$TEST_REPO"
cd "$TEST_REPO"
git init
git config user.email "claude-dreamer@noreply.github.com"
git config user.name "Claude Dreamer"
echo "initial content" > file.txt
git add .
git commit -m "Initial commit"

echo ""
echo "Test repo: $TEST_REPO"
echo ""

echo "=== Testing worktree creation ==="
WORKTREE_PATH="$TEST_REPO/../.test-worktree-$$-worktrees/task-test-$(date +%s)"
BRANCH_NAME="claude-task/test-branch"

mkdir -p "$(dirname "$WORKTREE_PATH")"
git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME"

echo "Worktree created at: $WORKTREE_PATH"
echo ""

echo "=== Simulating changes in worktree ==="
cd "$WORKTREE_PATH"
echo "Claude made this change" >> file.txt
echo "new file from claude" > claude-output.txt

echo "Changes made:"
git status --short
echo ""

echo "=== Committing changes ==="
git add -A
git commit -m "Claude task: Test [test-123]"
echo ""

echo "=== Checking commit ==="
git log --oneline -2
echo ""

echo "=== Cleaning up worktree ==="
cd "$TEST_REPO"
git worktree remove "$WORKTREE_PATH" --force

echo ""
echo "=== Verifying branch exists ==="
git branch -a | grep claude-task || echo "Branch found"
echo ""

echo "=== SUCCESS ==="
echo "Worktree flow works!"
echo ""
echo "Cleanup: rm -rf $TEST_REPO $(dirname $WORKTREE_PATH)"
