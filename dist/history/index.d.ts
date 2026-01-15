import { ExecutionHistoryRecord, ExecutionStatus } from '../types.js';
/**
 * Get the execution history file path
 */
export declare function getHistoryPath(): string;
/**
 * Record an execution to the history file (append-only JSONL)
 */
export declare function recordExecution(record: ExecutionHistoryRecord): Promise<void>;
/**
 * Create a new execution history record
 */
export declare function createHistoryRecord(taskId: string, taskName: string, project: string, triggeredBy: string, options?: {
    cronExpression?: string;
    worktreePath?: string;
    worktreeBranch?: string;
}): ExecutionHistoryRecord;
/**
 * Complete an execution record with results
 */
export declare function completeHistoryRecord(record: ExecutionHistoryRecord, result: {
    status: ExecutionStatus;
    output?: string;
    error?: string;
    exitCode?: number;
    worktreePushed?: boolean;
}): ExecutionHistoryRecord;
export interface HistoryQueryOptions {
    limit?: number;
    status?: ExecutionStatus | ExecutionStatus[];
    taskName?: string;
    project?: string;
    since?: Date;
}
/**
 * Get recent executions from history with optional filters
 */
export declare function getRecentExecutions(options?: HistoryQueryOptions): Promise<ExecutionHistoryRecord[]>;
/**
 * Get a single execution record by ID
 */
export declare function getExecutionById(executionId: string): Promise<ExecutionHistoryRecord | undefined>;
/**
 * Get execution statistics
 */
export declare function getExecutionStats(options?: {
    since?: Date;
}): Promise<{
    total: number;
    success: number;
    failure: number;
    timeout: number;
    skipped: number;
    running: number;
}>;
/**
 * Clean up old history entries
 */
export declare function cleanupOldHistory(retentionDays?: number): Promise<number>;
/**
 * Scanned execution from log files
 */
export interface ScannedExecution {
    taskId: string;
    executedAt: Date;
    status: 'success' | 'failure' | 'unknown';
    logPath: string;
    errorLogPath?: string;
    logSize: number;
    errorSize: number;
    project?: string;
    command?: string;
    isOneTime: boolean;
    worktreePath?: string;
    worktreeBranch?: string;
    worktreePushed?: boolean;
}
/**
 * Scan log files to reconstruct execution history
 * This is the primary method - works with existing launchd executions
 */
export declare function scanExecutionLogs(options?: {
    limit?: number;
    status?: 'success' | 'failure' | 'unknown';
}): Promise<ScannedExecution[]>;
/**
 * Get a single scanned execution by task ID
 */
export declare function getScannedExecutionByTaskId(taskId: string): Promise<ScannedExecution | undefined>;
/**
 * Read the content of a log file
 */
export declare function readLogContent(logPath: string, options?: {
    tail?: number;
}): Promise<string>;
/**
 * Format a project path for display (truncate home directory)
 */
export declare function formatProjectPath(projectPath: string): string;
/**
 * Get status icon for display
 */
export declare function getStatusIcon(status: ExecutionStatus): string;
/**
 * Format time ago for display
 */
export declare function formatTimeAgo(date: Date | string): string;
/**
 * Format duration for display
 */
export declare function formatDuration(ms: number | undefined): string;
//# sourceMappingURL=index.d.ts.map