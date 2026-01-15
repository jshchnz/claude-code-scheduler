#!/bin/bash
# Test full worktree flow WITH remote push
# Requires: git@github.com:ojowwalker77/test-remote-jj.git (or change REMOTE_URL)
set -e

REMOTE_URL="git@github.com:ojowwalker77/test-remote-jj.git"

echo "=== Creating test repo with remote ==="
TEST_REPO="/tmp/test-push-$$"
mkdir -p "$TEST_REPO"
cd "$TEST_REPO"
git init
git config user.email "claude-dreamer@noreply.github.com"
git config user.name "Claude Dreamer"
echo "initial content $(date)" > file.txt
git add .
git commit -m "Initial commit"

echo ""
echo "=== Adding remote ==="
git remote add origin "$REMOTE_URL"
git branch -M main
git push -u origin main --force

echo ""
echo "Test repo: $TEST_REPO"
echo ""

echo "=== Creating worktree with branch ==="
TIMESTAMP=$(date +%s)
WORKTREE_NAME="task-test-$TIMESTAMP"
WORKTREE_PATH="$TEST_REPO/../.test-push-$$-worktrees/$WORKTREE_NAME"
BRANCH_NAME="claude-dreamer/$WORKTREE_NAME"

mkdir -p "$(dirname "$WORKTREE_PATH")"
git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME"

echo "Worktree: $WORKTREE_PATH"
echo "Branch: $BRANCH_NAME"
echo ""

echo "=== Making changes in worktree ==="
cd "$WORKTREE_PATH"
git config user.email "claude-dreamer@noreply.github.com"
git config user.name "Claude Dreamer"
echo "Claude Dreamer was here at $(date)" >> file.txt
echo "This file was created by Claude Dreamer automated task" > dreamer-output.txt

git status --short
echo ""

echo "=== Committing ==="
git add -A
git commit -m "Claude Dreamer: Test Push [$TIMESTAMP]"
echo ""

echo "=== Pushing to remote ==="
git push -u origin "$BRANCH_NAME"
echo ""

echo "=== Cleaning up worktree ==="
cd "$TEST_REPO"
git worktree remove "$WORKTREE_PATH" --force
echo "Worktree removed"
echo ""

echo "=== Verifying ==="
echo "Local branches:"
git branch
echo ""
echo "Remote branches:"
git branch -r
echo ""

echo "=== SUCCESS ==="
echo "Full flow with push works!"
echo ""
echo "Check GitHub: https://github.com/ojowwalker77/test-remote-jj/branches"
echo ""
echo "Cleanup: rm -rf $TEST_REPO $(dirname $WORKTREE_PATH)"
