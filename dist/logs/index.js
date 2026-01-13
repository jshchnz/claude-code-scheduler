import * as fs from 'fs-extra';
import * as path from 'path';
import { getLogsDir, getTaskLogPath } from '../config.js';
/**
 * Ensure logs directory exists
 */
export async function ensureLogsDir() {
    await fs.ensureDir(getLogsDir());
}
/**
 * Read the log file for a task
 */
export async function readTaskLog(taskId, lines) {
    const logPath = getTaskLogPath(taskId);
    try {
        if (!(await fs.pathExists(logPath))) {
            return '';
        }
        const content = await fs.readFile(logPath, 'utf-8');
        if (lines && lines > 0) {
            const allLines = content.split('\n');
            return allLines.slice(-lines).join('\n');
        }
        return content;
    }
    catch {
        return '';
    }
}
/**
 * Append to a task's log file
 */
export async function appendToLog(taskId, message) {
    const logPath = getTaskLogPath(taskId);
    await fs.ensureDir(path.dirname(logPath));
    const timestamp = new Date().toISOString();
    const logLine = `[${timestamp}] ${message}\n`;
    await fs.appendFile(logPath, logLine, 'utf-8');
}
/**
 * Clear a task's log file
 */
export async function clearTaskLog(taskId) {
    const logPath = getTaskLogPath(taskId);
    if (await fs.pathExists(logPath)) {
        await fs.remove(logPath);
    }
}
/**
 * Get the size of a task's log file in bytes
 */
export async function getLogSize(taskId) {
    const logPath = getTaskLogPath(taskId);
    try {
        const stats = await fs.stat(logPath);
        return stats.size;
    }
    catch {
        return 0;
    }
}
/**
 * Rotate log file if it exceeds max size
 */
export async function rotateLogIfNeeded(taskId, maxSizeBytes = 10 * 1024 * 1024 // 10MB default
) {
    const logPath = getTaskLogPath(taskId);
    const size = await getLogSize(taskId);
    if (size > maxSizeBytes) {
        const backupPath = `${logPath}.1`;
        // Remove old backup if exists
        if (await fs.pathExists(backupPath)) {
            await fs.remove(backupPath);
        }
        // Move current to backup
        await fs.move(logPath, backupPath);
    }
}
/**
 * Clean up old log files
 */
export async function cleanupOldLogs(retentionDays = 30) {
    const logsDir = getLogsDir();
    let cleaned = 0;
    try {
        if (!(await fs.pathExists(logsDir))) {
            return 0;
        }
        const files = await fs.readdir(logsDir);
        const now = Date.now();
        const maxAge = retentionDays * 24 * 60 * 60 * 1000;
        for (const file of files) {
            const filePath = path.join(logsDir, file);
            const stats = await fs.stat(filePath);
            if (now - stats.mtime.getTime() > maxAge) {
                await fs.remove(filePath);
                cleaned++;
            }
        }
    }
    catch {
        // Ignore cleanup errors
    }
    return cleaned;
}
//# sourceMappingURL=index.js.map