import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { ExecutionHistoryRecordSchema, } from '../types.js';
import { getGlobalConfigDir, getLogsDir } from '../config.js';
/**
 * Get the execution history file path
 */
export function getHistoryPath() {
    return path.join(getGlobalConfigDir(), 'execution-history.jsonl');
}
// =============================================================================
// History Storage
// =============================================================================
/**
 * Record an execution to the history file (append-only JSONL)
 */
export async function recordExecution(record) {
    const historyPath = getHistoryPath();
    await fs.ensureDir(path.dirname(historyPath));
    // Validate the record
    ExecutionHistoryRecordSchema.parse(record);
    // Append as JSONL (one JSON object per line)
    const line = JSON.stringify(record) + '\n';
    await fs.appendFile(historyPath, line, 'utf-8');
}
/**
 * Create a new execution history record
 */
export function createHistoryRecord(taskId, taskName, project, triggeredBy, options = {}) {
    return {
        id: crypto.randomUUID(),
        taskId,
        taskName,
        project,
        startedAt: new Date().toISOString(),
        status: 'running',
        triggeredBy,
        cronExpression: options.cronExpression,
        worktreePath: options.worktreePath,
        worktreeBranch: options.worktreeBranch,
    };
}
/**
 * Complete an execution record with results
 */
export function completeHistoryRecord(record, result) {
    const completedAt = new Date().toISOString();
    const startTime = new Date(record.startedAt).getTime();
    const endTime = new Date(completedAt).getTime();
    return {
        ...record,
        completedAt,
        status: result.status,
        duration: endTime - startTime,
        output: result.output,
        error: result.error,
        exitCode: result.exitCode,
        worktreePushed: result.worktreePushed,
    };
}
/**
 * Get recent executions from history with optional filters
 */
export async function getRecentExecutions(options = {}) {
    const historyPath = getHistoryPath();
    if (!(await fs.pathExists(historyPath))) {
        return [];
    }
    const content = await fs.readFile(historyPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    let records = [];
    for (const line of lines) {
        try {
            const parsed = JSON.parse(line);
            const record = ExecutionHistoryRecordSchema.parse(parsed);
            records.push(record);
        }
        catch {
            // Skip malformed lines
            continue;
        }
    }
    // Apply filters
    if (options.status) {
        const statuses = Array.isArray(options.status)
            ? options.status
            : [options.status];
        records = records.filter((r) => statuses.includes(r.status));
    }
    if (options.taskName) {
        const searchTerm = options.taskName.toLowerCase();
        records = records.filter((r) => r.taskName.toLowerCase().includes(searchTerm));
    }
    if (options.project) {
        const searchTerm = options.project.toLowerCase();
        records = records.filter((r) => r.project.toLowerCase().includes(searchTerm));
    }
    if (options.since) {
        const sinceTime = options.since.getTime();
        records = records.filter((r) => new Date(r.startedAt).getTime() >= sinceTime);
    }
    // Sort by startedAt descending (most recent first)
    records.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    // Apply limit
    const limit = options.limit ?? 10;
    return records.slice(0, limit);
}
/**
 * Get a single execution record by ID
 */
export async function getExecutionById(executionId) {
    const historyPath = getHistoryPath();
    if (!(await fs.pathExists(historyPath))) {
        return undefined;
    }
    const content = await fs.readFile(historyPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    for (const line of lines) {
        try {
            const parsed = JSON.parse(line);
            const record = ExecutionHistoryRecordSchema.parse(parsed);
            if (record.id === executionId) {
                return record;
            }
        }
        catch {
            continue;
        }
    }
    return undefined;
}
/**
 * Get execution statistics
 */
export async function getExecutionStats(options = {}) {
    const records = await getRecentExecutions({
        limit: 10000, // Get all for stats
        since: options.since,
    });
    return {
        total: records.length,
        success: records.filter((r) => r.status === 'success').length,
        failure: records.filter((r) => r.status === 'failure').length,
        timeout: records.filter((r) => r.status === 'timeout').length,
        skipped: records.filter((r) => r.status === 'skipped').length,
        running: records.filter((r) => r.status === 'running').length,
    };
}
// =============================================================================
// History Maintenance
// =============================================================================
/**
 * Clean up old history entries
 */
export async function cleanupOldHistory(retentionDays = 30) {
    const historyPath = getHistoryPath();
    if (!(await fs.pathExists(historyPath))) {
        return 0;
    }
    const content = await fs.readFile(historyPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    const keptLines = [];
    let removed = 0;
    for (const line of lines) {
        try {
            const parsed = JSON.parse(line);
            const record = ExecutionHistoryRecordSchema.parse(parsed);
            if (new Date(record.startedAt).getTime() >= cutoffTime) {
                keptLines.push(line);
            }
            else {
                removed++;
            }
        }
        catch {
            // Keep malformed lines? Or remove them? Let's remove them.
            removed++;
        }
    }
    if (removed > 0) {
        await fs.writeFile(historyPath, keptLines.join('\n') + '\n', 'utf-8');
    }
    return removed;
}
/**
 * Get LaunchAgents directory path (macOS)
 */
function getLaunchAgentsDir() {
    return path.join(os.homedir(), 'Library', 'LaunchAgents');
}
/**
 * Try to extract metadata from plist file if it exists
 */
async function getPlistMetadata(taskId) {
    const launchAgentsDir = getLaunchAgentsDir();
    // Try both regular and one-time plist names
    const plistNames = [
        `com.claude.schedule.${taskId}.plist`,
        `com.claude.schedule.once.${taskId}.plist`,
    ];
    for (const plistName of plistNames) {
        const plistPath = path.join(launchAgentsDir, plistName);
        try {
            if (await fs.pathExists(plistPath)) {
                const content = await fs.readFile(plistPath, 'utf-8');
                // Extract WorkingDirectory
                const workDirMatch = content.match(/<key>WorkingDirectory<\/key>\s*<string>([^<]+)<\/string>/);
                const project = workDirMatch?.[1];
                // Extract command from ProgramArguments (look for -p flag)
                const cmdMatch = content.match(/-p<\/string>\s*<string>([^<]+)<\/string>/);
                const command = cmdMatch?.[1];
                return { project, command };
            }
        }
        catch {
            // Ignore plist read errors
        }
    }
    return null;
}
/**
 * Scan log files to reconstruct execution history
 * This is the primary method - works with existing launchd executions
 */
export async function scanExecutionLogs(options = {}) {
    const logsDir = getLogsDir();
    if (!(await fs.pathExists(logsDir))) {
        return [];
    }
    const files = await fs.readdir(logsDir);
    const executions = [];
    // Group files by task ID
    const logFiles = new Map();
    for (const file of files) {
        if (file.endsWith('.error.log')) {
            const taskId = file.replace('.error.log', '');
            const existing = logFiles.get(taskId) || {};
            existing.error = file;
            logFiles.set(taskId, existing);
        }
        else if (file.endsWith('.log')) {
            const taskId = file.replace('.log', '');
            const existing = logFiles.get(taskId) || {};
            existing.log = file;
            logFiles.set(taskId, existing);
        }
    }
    // Process each task's logs
    for (const [taskId, logPaths] of logFiles.entries()) {
        if (!logPaths.log)
            continue; // Need at least the main log
        const logPath = path.join(logsDir, logPaths.log);
        const errorLogPath = logPaths.error ? path.join(logsDir, logPaths.error) : undefined;
        try {
            const logStats = await fs.stat(logPath);
            const logSize = logStats.size;
            let errorSize = 0;
            if (errorLogPath && await fs.pathExists(errorLogPath)) {
                const errorStats = await fs.stat(errorLogPath);
                errorSize = errorStats.size;
            }
            // Determine status based on error log content
            let status = 'unknown';
            if (errorSize > 0 && errorLogPath) {
                // Check if error log contains actual errors (not just warnings)
                const errorContent = await fs.readFile(errorLogPath, 'utf-8');
                const hasRealError = errorContent.toLowerCase().includes('error') ||
                    errorContent.includes('Exit code') ||
                    errorContent.includes('failed');
                status = hasRealError ? 'failure' : 'success';
            }
            else if (logSize > 0) {
                status = 'success';
            }
            // Get metadata from plist if available
            const metadata = await getPlistMetadata(taskId);
            const execution = {
                taskId,
                executedAt: logStats.mtime,
                status,
                logPath,
                errorLogPath,
                logSize,
                errorSize,
                project: metadata?.project,
                command: metadata?.command,
                isOneTime: taskId.startsWith('once.'),
            };
            executions.push(execution);
        }
        catch {
            // Skip files we can't read
            continue;
        }
    }
    // Sort by execution time (most recent first)
    executions.sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime());
    // Apply status filter
    let filtered = executions;
    if (options.status) {
        filtered = executions.filter(e => e.status === options.status);
    }
    // Apply limit
    const limit = options.limit ?? 20;
    return filtered.slice(0, limit);
}
/**
 * Get a single scanned execution by task ID
 */
export async function getScannedExecutionByTaskId(taskId) {
    const executions = await scanExecutionLogs({ limit: 1000 });
    return executions.find(e => e.taskId === taskId);
}
/**
 * Read the content of a log file
 */
export async function readLogContent(logPath, options = {}) {
    try {
        if (!(await fs.pathExists(logPath))) {
            return '';
        }
        const content = await fs.readFile(logPath, 'utf-8');
        if (options.tail && options.tail > 0) {
            const lines = content.split('\n');
            return lines.slice(-options.tail).join('\n');
        }
        return content;
    }
    catch {
        return '';
    }
}
// =============================================================================
// Display Formatting
// =============================================================================
/**
 * Format a project path for display (truncate home directory)
 */
export function formatProjectPath(projectPath) {
    const home = os.homedir();
    if (projectPath.startsWith(home)) {
        return '~' + projectPath.slice(home.length);
    }
    return projectPath;
}
/**
 * Get status icon for display
 */
export function getStatusIcon(status) {
    switch (status) {
        case 'success':
            return '\u2713 OK'; // ✓ OK
        case 'failure':
            return '\u2717 FAIL'; // ✗ FAIL
        case 'timeout':
            return '\u23F1 TIMEOUT'; // ⏱ TIMEOUT
        case 'skipped':
            return '\u2298 SKIP'; // ⊘ SKIP
        case 'running':
            return '\u25B6 RUN'; // ▶ RUN
    }
}
/**
 * Format time ago for display
 */
export function formatTimeAgo(date) {
    const now = new Date();
    const then = typeof date === 'string' ? new Date(date) : date;
    const diffMs = now.getTime() - then.getTime();
    const minutes = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);
    if (minutes < 1) {
        return 'just now';
    }
    if (minutes < 60) {
        return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    }
    if (hours < 24) {
        return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    }
    if (days === 1) {
        // Yesterday at HH:MM AM/PM
        return `Yesterday ${then.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        })}`;
    }
    if (days < 7) {
        return `${days} day${days === 1 ? '' : 's'} ago`;
    }
    // Older than a week - show date
    return then.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}
/**
 * Format duration for display
 */
export function formatDuration(ms) {
    if (ms === undefined) {
        return '-';
    }
    if (ms < 1000) {
        return `${ms}ms`;
    }
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) {
        return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) {
        return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}
//# sourceMappingURL=index.js.map