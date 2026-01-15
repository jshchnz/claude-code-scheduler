#!/bin/bash
# Test worktree flow locally without push
set -e

cd "$(dirname "$0")/.."

echo "=== Step 1: Test git detection ==="
npx tsx test-worktrees/test-vcs.ts

echo ""
echo "=== Step 2: Generate worktree script ==="
npx tsx test-worktrees/test-script-gen.ts > /tmp/test-worktree.sh
chmod +x /tmp/test-worktree.sh
echo "Script written to /tmp/test-worktree.sh"

echo ""
echo "=== Step 3: Show generated script ==="
cat /tmp/test-worktree.sh

echo ""
echo "=== Step 4: Create test repo ==="
TEST_REPO="/tmp/test-worktree-$$"
mkdir -p "$TEST_REPO"
cd "$TEST_REPO"
git init
git config user.email "test@test.com"
git config user.name "Test"
echo "initial content" > file.txt
git add .
git commit -m "Initial commit"

echo ""
echo "Test repo: $TEST_REPO"
echo ""
echo "To test manually:"
echo "  1. Edit /tmp/test-worktree.sh"
echo "  2. Change MAIN_REPO to: $TEST_REPO"
echo "  3. Run: bash -x /tmp/test-worktree.sh"
