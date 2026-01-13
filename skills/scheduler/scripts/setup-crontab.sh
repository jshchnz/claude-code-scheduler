#!/bin/bash
# Linux crontab setup helper
# Usage: ./setup-crontab.sh <task-id> <cron-expression> <command> [working-dir]

set -e

TASK_ID="${1:?Task ID required}"
CRON_EXPR="${2:?Cron expression required}"
COMMAND="${3:?Command required}"
WORK_DIR="${4:-$(pwd)}"

LOG_DIR="$HOME/.claude/logs"
MARKER="# claude-scheduler:${TASK_ID}"

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Get current crontab (or empty if none)
CURRENT_CRONTAB=$(crontab -l 2>/dev/null || echo "")

# Remove existing entry for this task
NEW_CRONTAB=$(echo "$CURRENT_CRONTAB" | grep -v "$MARKER" || true)

# Add new entry
CRON_LINE="${CRON_EXPR} cd \"${WORK_DIR}\" && ${COMMAND} >> \"${LOG_DIR}/${TASK_ID}.log\" 2>&1 ${MARKER}"

# Combine and set new crontab
echo -e "${NEW_CRONTAB}\n${CRON_LINE}" | grep -v '^$' | crontab -

echo "Added crontab entry for task: ${TASK_ID}"
echo "Schedule: ${CRON_EXPR}"
echo "Command: ${COMMAND}"
echo "Log file: ${LOG_DIR}/${TASK_ID}.log"
echo ""
echo "Current crontab:"
crontab -l | grep -v '^#' | head -10
