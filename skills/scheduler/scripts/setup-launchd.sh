#!/bin/bash
# macOS launchd setup helper
# Usage: ./setup-launchd.sh <task-id> <cron-expression> <command> [working-dir]

set -e

TASK_ID="${1:?Task ID required}"
CRON_EXPR="${2:?Cron expression required}"
COMMAND="${3:?Command required}"
WORK_DIR="${4:-$(pwd)}"

LABEL="com.claude.scheduler.${TASK_ID}"
PLIST_PATH="$HOME/Library/LaunchAgents/${LABEL}.plist"
LOG_DIR="$HOME/.claude/logs"

# Ensure directories exist
mkdir -p "$HOME/Library/LaunchAgents"
mkdir -p "$LOG_DIR"

# Parse cron expression (minute hour dom month dow)
IFS=' ' read -r MINUTE HOUR DOM MONTH DOW <<< "$CRON_EXPR"

# Build calendar interval
build_calendar_interval() {
    local interval="<key>StartCalendarInterval</key>\n    <dict>\n"

    if [[ "$MINUTE" != "*" ]]; then
        interval+="        <key>Minute</key>\n        <integer>${MINUTE}</integer>\n"
    fi

    if [[ "$HOUR" != "*" ]]; then
        interval+="        <key>Hour</key>\n        <integer>${HOUR}</integer>\n"
    fi

    if [[ "$DOM" != "*" ]]; then
        interval+="        <key>Day</key>\n        <integer>${DOM}</integer>\n"
    fi

    if [[ "$MONTH" != "*" ]]; then
        interval+="        <key>Month</key>\n        <integer>${MONTH}</integer>\n"
    fi

    if [[ "$DOW" != "*" ]]; then
        interval+="        <key>Weekday</key>\n        <integer>${DOW}</integer>\n"
    fi

    interval+="    </dict>"
    echo -e "$interval"
}

CALENDAR_INTERVAL=$(build_calendar_interval)

# Escape command for XML
escape_xml() {
    echo "$1" | sed 's/&/\&amp;/g; s/</\&lt;/g; s/>/\&gt;/g; s/"/\&quot;/g'
}

ESCAPED_COMMAND=$(escape_xml "$COMMAND")
ESCAPED_WORKDIR=$(escape_xml "$WORK_DIR")

# Generate plist
cat > "$PLIST_PATH" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${LABEL}</string>

    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>cd "${ESCAPED_WORKDIR}" &amp;&amp; ${ESCAPED_COMMAND}</string>
    </array>

    ${CALENDAR_INTERVAL}

    <key>StandardOutPath</key>
    <string>${LOG_DIR}/${TASK_ID}.out.log</string>

    <key>StandardErrorPath</key>
    <string>${LOG_DIR}/${TASK_ID}.err.log</string>

    <key>RunAtLoad</key>
    <false/>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:${HOME}/.local/bin</string>
    </dict>
</dict>
</plist>
EOF

echo "Created plist: $PLIST_PATH"

# Unload if already loaded
launchctl unload "$PLIST_PATH" 2>/dev/null || true

# Load the agent
launchctl load "$PLIST_PATH"

echo "Loaded agent: $LABEL"
echo "Log files: $LOG_DIR/${TASK_ID}.{out,err}.log"
