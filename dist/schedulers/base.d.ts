import type { ScheduledTask } from '../types.js';
/**
 * Status of the native scheduler
 */
export interface SchedulerStatus {
    healthy: boolean;
    taskCount: number;
    errors: string[];
    platform: string;
}
/**
 * Abstract base class for platform-specific schedulers
 */
export declare abstract class BaseScheduler {
    /**
     * Human-readable name of the scheduler
     */
    abstract readonly name: string;
    /**
     * Platform identifier
     */
    abstract readonly platform: string;
    /**
     * Register a cron task with the native scheduler
     */
    abstract register(task: ScheduledTask): Promise<void>;
    /**
     * Unregister a task from the native scheduler
     */
    abstract unregister(taskId: string): Promise<void>;
    /**
     * Check if a task is registered
     */
    abstract isRegistered(taskId: string): Promise<boolean>;
    /**
     * Get current scheduler status
     */
    abstract getStatus(): Promise<SchedulerStatus>;
    /**
     * List all registered task IDs
     */
    abstract listRegistered(): Promise<string[]>;
    /**
     * Generate the command to execute Claude in non-interactive mode
     *
     * Security: Uses single quotes for the prompt to prevent shell expansion
     * of backticks, $(), and other shell metacharacters.
     */
    protected getExecutionCommand(task: ScheduledTask): string;
    /**
     * Get the working directory for a task
     */
    protected getWorkingDirectory(task: ScheduledTask): string;
    /**
     * Extract cron expression from task trigger
     */
    protected getCronExpression(task: ScheduledTask): string;
    /**
     * Get the task label/identifier for the native scheduler
     */
    protected getTaskLabel(taskId: string): string;
    /**
     * Check if task uses worktree execution
     */
    protected usesWorktree(task: ScheduledTask): boolean;
    /**
     * Generate a shell script for git worktree-based execution
     * Returns null if worktree is not enabled
     *
     * Security: All user-provided values are escaped using shellEscape()
     * to prevent command injection attacks.
     */
    protected generateWorktreeScript(task: ScheduledTask, logDir: string): string | null;
}
/**
 * Error thrown when scheduler operations fail
 */
export declare class SchedulerError extends Error {
    readonly platform: string;
    readonly operation: string;
    readonly cause?: Error | undefined;
    constructor(message: string, platform: string, operation: string, cause?: Error | undefined);
}
//# sourceMappingURL=base.d.ts.map