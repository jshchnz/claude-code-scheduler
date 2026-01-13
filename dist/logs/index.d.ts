/**
 * Ensure logs directory exists
 */
export declare function ensureLogsDir(): Promise<void>;
/**
 * Read the log file for a task
 */
export declare function readTaskLog(taskId: string, lines?: number): Promise<string>;
/**
 * Append to a task's log file
 */
export declare function appendToLog(taskId: string, message: string): Promise<void>;
/**
 * Clear a task's log file
 */
export declare function clearTaskLog(taskId: string): Promise<void>;
/**
 * Get the size of a task's log file in bytes
 */
export declare function getLogSize(taskId: string): Promise<number>;
/**
 * Rotate log file if it exceeds max size
 */
export declare function rotateLogIfNeeded(taskId: string, maxSizeBytes?: number): Promise<void>;
/**
 * Clean up old log files
 */
export declare function cleanupOldLogs(retentionDays?: number): Promise<number>;
//# sourceMappingURL=index.d.ts.map